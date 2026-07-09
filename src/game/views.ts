// View models for the board and number pad, derived from game state.
// Pure functions: precedence of the cell highlights lives here, styling in SCSS.

import { CELL_COUNT, candidatesFor, colOf, reachList, reaches, rowOf } from '../engine/board'
import { legalMoveFrom } from './logic'
import type { GameOptions } from './options'
import type { GameState } from './types'

/** Single background per cell; ordering of the checks below decides which wins. */
export type CellBg =
  | 'plain'
  | 'given'
  | 'peer'
  | 'peerGiven'
  | 'same'
  | 'reach'
  | 'opened'
  | 'ball'
  | 'resetTarget'
  | 'conflict'

export interface CellView {
  index: number
  digit: string
  hasDigit: boolean
  given: boolean
  error: boolean
  bg: CellBg
  ring: 'selected' | 'target' | null
  dimmed: boolean
  /** Reachable-cell marker shown under the digit area. */
  dot: boolean
  /** 9 slots ('' or the digit) when notes are visible, else empty. */
  noteDigits: string[]
  aria: string
}

export function buildCellViews(state: GameState, options: GameOptions): CellView[] {
  const g = state.game
  if (!g) return []
  const warn = options.mistakeCheck === 'warn'
  const sel = state.selected
  const selDigit = sel !== null && g.grid[sel] > 0 ? g.grid[sel] : 0
  const reach = new Set(reachList(g.ball).filter((j) => !g.grid[j]))
  const opened = new Set(state.justOpened)
  const conflicted = new Set(state.conflicts)
  const resetTargets = new Set<number>()
  if (state.resetMode) {
    for (let i = 0; i < CELL_COUNT; i++) {
      if (g.grid[i] && i !== g.ball && legalMoveFrom(g.grid, i)) resetTargets.add(i)
    }
  }

  const cells: CellView[] = []
  for (let i = 0; i < CELL_COUNT; i++) {
    const v = g.grid[i]
    const isGiven = g.givens[i] > 0
    const isBall = i === g.ball
    const inReach = reach.has(i)
    const isPeer = sel !== null && sel !== i && reaches(sel, i)
    const sameDigit = selDigit > 0 && v === selDigit && i !== sel

    let bg: CellBg = isGiven ? 'given' : 'plain'
    if (isPeer) bg = isGiven ? 'peerGiven' : 'peer'
    if (sameDigit) bg = 'same'
    if (inReach) bg = 'reach'
    if (opened.has(i)) bg = 'opened'
    if (isBall) bg = 'ball'
    if (state.resetMode) bg = resetTargets.has(i) ? 'resetTarget' : isGiven ? 'given' : 'plain'
    if (conflicted.has(i)) bg = 'conflict'

    let ring: CellView['ring'] = null
    if (sel === i && !state.resetMode) ring = 'selected'
    if (state.resetMode && resetTargets.has(i)) ring = 'target'

    const error = (warn && v > 0 && !isGiven && v !== g.solution[i]) || (conflicted.has(i) && v > 0)

    const mask = state.notes[i]
    const showNotes = !v && mask > 0
    const noteDigits = showNotes
      ? [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => ((mask >> d) & 1 ? String(d) : ''))
      : []

    const dimmed = options.dimUnreachable && !v && !inReach && !state.resetMode

    let aria = `Row ${rowOf(i) + 1}, column ${colOf(i) + 1}, `
    if (v) {
      aria += `value ${v}${isGiven ? ', given clue' : ''}${isBall ? ', ball position' : ''}`
    } else {
      aria += `empty, ${inReach ? 'reachable' : 'not reachable from current ball'}`
    }

    cells.push({
      index: i,
      digit: v ? String(v) : '',
      hasDigit: v > 0,
      given: isGiven,
      error,
      bg,
      ring,
      dimmed,
      dot: inReach && !state.resetMode,
      noteDigits,
      aria,
    })
  }
  return cells
}

export interface PadKey {
  digit: number
  enabled: boolean
}

export function buildPadViews(state: GameState): PadKey[] {
  const g = state.game
  if (!g) return []
  const sel = state.selected
  let cands: number[] | null = null
  if (sel !== null && !g.grid[sel]) {
    if (state.notesMode) cands = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    else if (reaches(g.ball, sel)) cands = candidatesFor(g.grid, sel)
    else cands = []
  }
  const pad: PadKey[] = []
  for (let d = 1; d <= 9; d++) {
    pad.push({ digit: d, enabled: !state.won && cands !== null && cands.includes(d) })
  }
  return pad
}
