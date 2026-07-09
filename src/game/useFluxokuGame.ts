// Central game state machine. Ports the design's component logic: every rule
// message, highlight timing, and keyboard binding matches Fluxoku.dc.html.

import { useEffect, useRef, useState } from 'react'
import { colOf, conflictInfo, reachList, reaches, rowOf } from '../engine/board'
import { generatePuzzle, type DifficultyKey } from '../engine/generator'
import { computeTrapped, fmtTime, legalMoveFrom } from './logic'
import type { GameOptions } from './options'
import { initialGameState, type GameSession, type GameState, type Snapshot } from './types'
import { buildCellViews, buildPadViews, type CellView, type PadKey } from './views'

const TOAST_MS = 2400
const OPENED_PULSE_MS = 850
const CONFLICT_FLASH_MS = 950
const UNDO_LIMIT = 160

export interface FluxokuActions {
  start: (difficulty: DifficultyKey) => void
  restart: () => void
  playAgain: () => void
  goMenu: () => void
  review: () => void
  cellClick: (i: number) => void
  placeDigit: (d: number) => void
  erase: () => void
  undo: () => void
  toggleNotes: () => void
  toggleResetMode: () => void
  cancelReset: () => void
}

export interface FluxokuGame {
  state: GameState
  ready: boolean
  cells: CellView[]
  pad: PadKey[]
  /** One entry per reset token; true while still available. */
  tokens: boolean[]
  ballLeft: string
  ballTop: string
  showTimer: boolean
  timerText: string
  trappedVisible: boolean
  trappedSub: string
  canReset: boolean
  resetBtnLabel: string
  canUndo: boolean
  canErase: boolean
  /** Trapped with a reset available: the Reset button lights up. */
  resetArmed: boolean
  showWin: boolean
  showReviewBar: boolean
  winStats: { time: string; moves: string; resets: string; undos: string }
  actions: FluxokuActions
}

export function useFluxokuGame(options: GameOptions): FluxokuGame {
  const [state, setState] = useState(initialGameState)

  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const pulseTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const conflictTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const generateTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const patch = (partial: Partial<GameState>) => {
    setState((s) => ({ ...s, ...partial }))
  }

  const showToast = (text: string) => {
    clearTimeout(toastTimer.current)
    patch({ toast: text })
    toastTimer.current = setTimeout(() => patch({ toast: '' }), TOAST_MS)
  }

  const snapshot = (game: GameSession): Snapshot => ({
    grid: game.grid.slice(),
    ball: game.ball,
    resetsLeft: game.resetsLeft,
    notes: state.notes.slice(),
    moves: state.moves,
  })

  const pushUndo = (game: GameSession): Snapshot[] => {
    const stack = state.undoStack.slice(-UNDO_LIMIT)
    stack.push(snapshot(game))
    return stack
  }

  /** Applies a change to the session, then recomputes won/trapped from it. */
  const afterMutation = (next: Partial<GameState> & { game: GameSession }) => {
    const g = next.game
    const won = !g.grid.includes(0)
    const trapped = won ? false : computeTrapped(g.grid, g.ball)
    setState((s) => ({
      ...s,
      ...next,
      won: won || (next.won ?? false),
      trapped,
      // Freeze the timer at its exact final value; the tick interval stops on win.
      elapsedSec: won ? Math.floor((Date.now() - s.startTime) / 1000) : s.elapsedSec,
      reviewing: won ? false : (next.reviewing ?? s.reviewing),
    }))
  }

  const start = (difficulty: DifficultyKey) => {
    setState(() => ({
      ...initialGameState,
      screen: 'playing',
      generating: true,
    }))
    // Let the "Shaping the board…" frame paint before the synchronous search runs.
    clearTimeout(generateTimer.current)
    generateTimer.current = setTimeout(() => {
      const p = generatePuzzle(difficulty)
      patch({
        generating: false,
        game: {
          givens: p.givens.slice(),
          solution: p.solution,
          grid: p.givens.slice(),
          ball: p.ball,
          startBall: p.ball,
          resetsTotal: p.resets,
          resetsLeft: p.resets,
          difficulty: p.difficulty,
          label: p.label,
        },
        notes: new Array<number>(81).fill(0),
        startTime: Date.now(),
        elapsedSec: 0,
        selected: p.ball,
      })
    }, 30)
  }

  const restart = () => {
    const g = state.game
    if (!g) return
    patch({
      game: { ...g, grid: g.givens.slice(), ball: g.startBall, resetsLeft: g.resetsTotal },
      notes: new Array<number>(81).fill(0),
      selected: g.startBall,
      notesMode: false,
      resetMode: false,
      trapped: false,
      won: false,
      reviewing: false,
      undoStack: [],
      moves: 0,
      undos: 0,
      startTime: Date.now(),
      elapsedSec: 0,
      justOpened: [],
      conflicts: [],
    })
  }

  const placeDigit = (d: number) => {
    const g = state.game
    if (!g || state.won) return
    const i = state.selected
    if (i === null) {
      showToast('Select a reachable cell first.')
      return
    }

    // Notes mode: toggle a pencil mark on any empty cell.
    if (state.notesMode) {
      if (g.grid[i]) {
        showToast('Notes go in empty cells.')
        return
      }
      const notes = state.notes.slice()
      const stack = pushUndo(g)
      notes[i] ^= 1 << d
      patch({ notes, undoStack: stack })
      return
    }

    if (g.givens[i]) {
      showToast('Starting clues cannot be changed.')
      return
    }
    if (g.grid[i]) {
      showToast('This cell is already filled.')
      return
    }
    if (!reaches(g.ball, i)) {
      showToast('This space is not reachable from the ball.')
      return
    }

    const conflict = conflictInfo(g.grid, i, d)
    if (conflict) {
      const msg =
        conflict.unit === 'row'
          ? 'That number already exists in this row.'
          : conflict.unit === 'column'
            ? 'That number already exists in this column.'
            : 'That number already exists in this box.'
      showToast(msg)
      clearTimeout(conflictTimer.current)
      patch({ conflicts: conflict.cells.concat([i]) })
      conflictTimer.current = setTimeout(() => patch({ conflicts: [] }), CONFLICT_FLASH_MS)
      return
    }

    // Legal move: place the digit and hand the ball possession of that cell.
    const stack = pushUndo(g)
    const grid = g.grid.slice()
    grid[i] = d
    const notes = state.notes.slice()
    notes[i] = 0
    const oldReach = new Set(reachList(g.ball).filter((j) => !grid[j]))
    const newReach = reachList(i).filter((j) => !grid[j] && !oldReach.has(j))
    clearTimeout(pulseTimer.current)
    pulseTimer.current = setTimeout(() => patch({ justOpened: [] }), OPENED_PULSE_MS)
    afterMutation({
      game: { ...g, grid, ball: i },
      notes,
      undoStack: stack,
      moves: state.moves + 1,
      selected: i,
      resetMode: false,
      justOpened: newReach,
    })
  }

  const erase = () => {
    const g = state.game
    if (!g || state.won) return
    const i = state.selected
    if (i === null || !g.grid[i]) {
      showToast('Select a filled cell to erase.')
      return
    }
    if (g.givens[i]) {
      showToast('Starting clues cannot be changed.')
      return
    }
    if (i === g.ball) {
      showToast('The ball must stay on a filled cell. Use undo instead.')
      return
    }
    const stack = pushUndo(g)
    const grid = g.grid.slice()
    grid[i] = 0
    afterMutation({ game: { ...g, grid }, undoStack: stack })
  }

  const undo = () => {
    const g = state.game
    if (!g || !state.undoStack.length) {
      if (g) showToast('Nothing to undo.')
      return
    }
    const stack = state.undoStack.slice()
    const snap = stack.pop()!
    const restored = { ...g, grid: snap.grid, ball: snap.ball, resetsLeft: snap.resetsLeft }
    const won = !restored.grid.includes(0)
    patch({
      game: restored,
      notes: snap.notes,
      moves: snap.moves,
      undoStack: stack,
      undos: state.undos + 1,
      won,
      reviewing: false,
      resetMode: false,
      trapped: won ? false : computeTrapped(restored.grid, restored.ball),
      selected: snap.ball,
      justOpened: [],
      conflicts: [],
    })
  }

  const toggleResetMode = () => {
    const g = state.game
    if (!g || state.won) return
    if (state.resetMode) {
      patch({ resetMode: false })
      return
    }
    if (!state.trapped) {
      showToast('Reset is available when you are trapped.')
      return
    }
    if (g.resetsLeft <= 0) {
      showToast('No resets left. Undo or restart.')
      return
    }
    patch({ resetMode: true, selected: null })
  }

  const resetTo = (i: number) => {
    const g = state.game!
    if (g.ball === i) {
      showToast('The ball is already here.')
      return
    }
    if (!legalMoveFrom(g.grid, i)) {
      showToast('No legal moves from that cell.')
      return
    }
    const stack = pushUndo(g)
    afterMutation({
      game: { ...g, ball: i, resetsLeft: g.resetsLeft - 1 },
      undoStack: stack,
      resetMode: false,
      selected: i,
    })
  }

  const cellClick = (i: number) => {
    const g = state.game
    if (!g) return
    if (state.resetMode) {
      if (!g.grid[i]) {
        showToast('The ball must stay on a filled cell.')
        return
      }
      resetTo(i)
      return
    }
    patch({ selected: i })
    if (!g.grid[i] && !reaches(g.ball, i) && !state.won) {
      showToast('This space is not reachable from the ball.')
    }
  }

  const handleKey = (e: KeyboardEvent) => {
    if (state.screen !== 'playing' || !state.game) return
    const k = e.key
    if (k === 'Escape') {
      e.preventDefault()
      if (state.resetMode) patch({ resetMode: false })
      else patch({ selected: null })
      return
    }
    if (state.won && !state.reviewing) return
    if (k >= '1' && k <= '9') {
      e.preventDefault()
      placeDigit(Number(k))
      return
    }
    if (k === 'Backspace' || k === 'Delete') {
      e.preventDefault()
      erase()
      return
    }
    if (k === 'u' || k === 'U') {
      e.preventDefault()
      undo()
      return
    }
    if (k === 'r' || k === 'R') {
      e.preventDefault()
      toggleResetMode()
      return
    }
    if (k === 'n' || k === 'N') {
      e.preventDefault()
      setState((s) => ({ ...s, notesMode: !s.notesMode }))
      return
    }
    const dirs: Record<string, number> = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }
    if (k in dirs) {
      e.preventDefault()
      const cur = state.selected ?? state.game.ball
      let next = cur + dirs[k]
      if (k === 'ArrowLeft' && cur % 9 === 0) next = cur
      if (k === 'ArrowRight' && cur % 9 === 8) next = cur
      if (next < 0 || next > 80) next = cur
      patch({ selected: next })
    }
  }

  // The listener stays mounted once; the ref always points at the latest handler.
  const keyHandler = useRef(handleKey)
  useEffect(() => {
    keyHandler.current = handleKey
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandler.current(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // One-second tick drives the visible timer while a game is running.
  useEffect(() => {
    const timer = setInterval(() => {
      setState((s) =>
        s.screen === 'playing' && s.game && !s.won
          ? { ...s, elapsedSec: Math.floor((Date.now() - s.startTime) / 1000) }
          : s,
      )
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(
    () => () => {
      clearTimeout(toastTimer.current)
      clearTimeout(pulseTimer.current)
      clearTimeout(conflictTimer.current)
      clearTimeout(generateTimer.current)
    },
    [],
  )

  // ---------- derived view data ----------
  const g = state.game
  const ready = !!g && !state.generating
  const canReset = !!g && g.resetsLeft > 0
  const canErase =
    !!g &&
    state.selected !== null &&
    g.grid[state.selected] > 0 &&
    !g.givens[state.selected] &&
    state.selected !== g.ball
  const tokens: boolean[] = []
  if (g) {
    for (let t = 0; t < g.resetsTotal; t++) tokens.push(t < g.resetsLeft)
  }

  return {
    state,
    ready,
    cells: buildCellViews(state, options),
    pad: buildPadViews(state),
    tokens,
    ballLeft: g ? `${(colOf(g.ball) * 100) / 9}%` : '0%',
    ballTop: g ? `${(rowOf(g.ball) * 100) / 9}%` : '0%',
    showTimer: options.showTimer && ready,
    timerText: fmtTime(state.elapsedSec),
    trappedVisible: state.trapped && !state.resetMode,
    trappedSub: canReset ? 'Reset possession or undo your last move.' : 'No resets left. Undo or restart.',
    canReset,
    resetBtnLabel: g ? `Use reset (${g.resetsLeft} left)` : '',
    canUndo: state.undoStack.length > 0,
    canErase,
    resetArmed: state.trapped && canReset,
    showWin: state.won && !state.reviewing,
    showReviewBar: state.won && state.reviewing,
    winStats: {
      time: fmtTime(state.elapsedSec),
      moves: String(state.moves),
      resets: g ? `${g.resetsTotal - g.resetsLeft} / ${g.resetsTotal}` : '',
      undos: String(state.undos),
    },
    actions: {
      start,
      restart,
      playAgain: () => start(g ? g.difficulty : 'normal'),
      goMenu: () => patch({ screen: 'menu', won: false, reviewing: false, resetMode: false }),
      review: () => patch({ reviewing: true }),
      cellClick,
      placeDigit,
      erase,
      undo,
      toggleNotes: () => setState((s) => ({ ...s, notesMode: !s.notesMode })),
      toggleResetMode,
      cancelReset: () => patch({ resetMode: false }),
    },
  }
}
