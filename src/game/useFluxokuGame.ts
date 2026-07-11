// Central game state machine. Ports the design's component logic: every rule
// message, highlight timing, and keyboard binding matches Fluxoku.dc.html.

import { useEffect, useRef, useState } from 'react'
import { conflictInfo, reachList, reaches } from '../engine/board'
import { generatePuzzle, type DifficultyKey } from '../engine/generator'
import { planAiSolve, type AiStep } from './aiSolve'
import { computeTrapped, fmtTime, isSolved, legalMoveFrom } from './logic'
import type { GameOptions } from './options'
import { initialGameState, type GameSession, type GameState, type Snapshot } from './types'
import { buildCellViews, buildPadViews, type CellView, type PadKey } from './views'

const TOAST_MS = 2400
const OPENED_PULSE_MS = 850
const CONFLICT_FLASH_MS = 950
const UNDO_LIMIT = 160
const AI_STEP_NORMAL_MS = 340
const AI_STEP_FAST_MS = 90

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
  aiSolve: () => void
  aiStop: () => void
  aiToggleSpeed: () => void
}

export interface FluxokuGame {
  state: GameState
  ready: boolean
  cells: CellView[]
  pad: PadKey[]
  /** One entry per reset token; true while still available. */
  tokens: boolean[]
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
  aiStatus: string
  aiSpeedLabel: string
  actions: FluxokuActions
}

export function useFluxokuGame(options: GameOptions): FluxokuGame {
  const [state, setState] = useState(initialGameState)

  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const pulseTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const conflictTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const generateTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const aiTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const aiPath = useRef<AiStep[] | null>(null)

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

  // Trapped is derived every render rather than stored: it depends on the
  // auto-assist setting, which can flip mid-puzzle ("changes apply
  // immediately, including to a puzzle in progress").
  const trapped =
    !!state.game &&
    !state.won &&
    computeTrapped(state.game.grid, state.game.ball, options.autoAssist)

  /** Applies a change to the session, then recomputes won from it. */
  const afterMutation = (next: Partial<GameState> & { game: GameSession }) => {
    const g = next.game
    // With auto-assist on, conflicts are blocked so a full board is a win.
    // Off, wrong digits are accepted and only a correct board counts.
    const full = !g.grid.includes(0)
    const won = full && (options.autoAssist || isSolved(g.grid, g.solution))
    setState((s) => ({
      ...s,
      ...next,
      won: won || (next.won ?? false),
      // Freeze the timer at its exact final value; the tick interval stops on win.
      elapsedSec: won ? Math.floor((Date.now() - s.startTime) / 1000) : s.elapsedSec,
      reviewing: won ? false : (next.reviewing ?? s.reviewing),
    }))
    if (full && !won) {
      showToast('The board is full, but some numbers are wrong. Erase or undo to fix them.')
    }
  }

  const start = (difficulty: DifficultyKey) => {
    clearTimeout(aiTimer.current)
    aiPath.current = null
    setState((s) => ({
      ...initialGameState,
      // Playback speed is a session preference, not per-puzzle state.
      aiFast: s.aiFast,
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
    clearTimeout(aiTimer.current)
    aiPath.current = null
    patch({
      aiSolving: false,
      aiStep: 0,
      aiTotal: 0,
      game: { ...g, grid: g.givens.slice(), ball: g.startBall, resetsLeft: g.resetsTotal },
      notes: new Array<number>(81).fill(0),
      selected: g.startBall,
      notesMode: false,
      resetMode: false,
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
    if (!g || state.won || state.aiSolving) return
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

    const conflict = options.autoAssist ? conflictInfo(g.grid, i, d) : null
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
    if (!g || state.won || state.aiSolving) return
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
    if (state.aiSolving) return
    const g = state.game
    if (!g || !state.undoStack.length) {
      if (g) showToast('Nothing to undo.')
      return
    }
    const stack = state.undoStack.slice()
    const snap = stack.pop()!
    const restored = { ...g, grid: snap.grid, ball: snap.ball, resetsLeft: snap.resetsLeft }
    const won =
      !restored.grid.includes(0) &&
      (options.autoAssist || isSolved(restored.grid, restored.solution))
    patch({
      game: restored,
      notes: snap.notes,
      moves: snap.moves,
      undoStack: stack,
      undos: state.undos + 1,
      won,
      reviewing: false,
      resetMode: false,
      selected: snap.ball,
      justOpened: [],
      conflicts: [],
    })
  }

  const toggleResetMode = () => {
    const g = state.game
    if (!g || state.won || state.aiSolving) return
    if (state.resetMode) {
      patch({ resetMode: false })
      return
    }
    if (!trapped) {
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
    if (!legalMoveFrom(g.grid, i, options.autoAssist)) {
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

  // ---------- AI solve ----------

  const aiSolve = () => {
    const g = state.game
    if (!g || state.won || state.aiSolving) return
    const path = planAiSolve(g.grid, g.ball)
    if (!path) {
      showToast('No path found from here — undo a move first.')
      return
    }
    if (!path.length) {
      showToast('Nothing left to solve.')
      return
    }
    // One snapshot for the whole run: a single undo rolls back everything the AI does.
    const stack = pushUndo(g)
    aiPath.current = path
    patch({
      aiSolving: true,
      aiStep: 0,
      aiTotal: path.length,
      undoStack: stack,
      resetMode: false,
      selected: null,
      notesMode: false,
    })
  }

  /** Halts AI playback; `msg` is toasted only when playback was running. */
  const stopAi = (msg?: string) => {
    clearTimeout(aiTimer.current)
    aiPath.current = null
    if (!state.aiSolving) return
    setState((s) => ({ ...s, aiSolving: false, selected: s.game ? s.game.ball : s.selected }))
    if (msg) showToast(msg)
  }

  const cellClick = (i: number) => {
    const g = state.game
    if (!g || state.aiSolving) return
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
    if (state.aiSolving) {
      if (k === 'Escape') {
        e.preventDefault()
        stopAi('You have the board back.')
      }
      return
    }
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

  // AI playback: one placement per delay. Each applied step bumps `aiStep`,
  // which re-arms this effect for the next one; flipping `aiFast` mid-wait
  // reschedules the pending step with the new delay.
  useEffect(() => {
    if (!state.aiSolving) return
    if (!aiPath.current?.[state.aiStep]) {
      // Route exhausted without a win: only reachable if the path was lost,
      // e.g. a hot-reload dropped the ref. Fail closed instead of hanging.
      setState((s) => ({ ...s, aiSolving: false }))
      return
    }
    const delay = state.aiFast ? AI_STEP_FAST_MS : AI_STEP_NORMAL_MS
    aiTimer.current = setTimeout(() => {
      setState((s) => {
        const g = s.game
        const step = aiPath.current?.[s.aiStep]
        if (!s.aiSolving || !g || !step) return s
        const grid = g.grid.slice()
        grid[step.cell] = step.digit
        const notes = s.notes.slice()
        notes[step.cell] = 0
        const oldReach = new Set(reachList(g.ball).filter((j) => !grid[j]))
        const justOpened = reachList(step.cell).filter((j) => !grid[j] && !oldReach.has(j))
        // The route always ends on a valid full board, so full means solved.
        const won = !grid.includes(0)
        return {
          ...s,
          game: { ...g, grid, ball: step.cell },
          notes,
          aiStep: s.aiStep + 1,
          moves: s.moves + 1,
          selected: step.cell,
          justOpened,
          won,
          aiSolving: !won,
          elapsedSec: won ? Math.floor((Date.now() - s.startTime) / 1000) : s.elapsedSec,
        }
      })
      // Re-armed every step, so the opened pulse only clears after the last one.
      clearTimeout(pulseTimer.current)
      pulseTimer.current = setTimeout(
        () => setState((s) => ({ ...s, justOpened: [] })),
        OPENED_PULSE_MS,
      )
    }, delay)
    return () => clearTimeout(aiTimer.current)
  }, [state.aiSolving, state.aiStep, state.aiFast])

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
    pad: buildPadViews(state, options),
    tokens,
    showTimer: options.showTimer && ready,
    timerText: fmtTime(state.elapsedSec),
    trappedVisible: trapped && !state.resetMode && !state.aiSolving,
    trappedSub: canReset ? 'Reset possession or undo your last move.' : 'No resets left. Undo or restart.',
    canReset,
    resetBtnLabel: g ? `Use reset (${g.resetsLeft} left)` : '',
    canUndo: state.undoStack.length > 0,
    canErase,
    resetArmed: trapped && canReset,
    showWin: state.won && !state.reviewing,
    showReviewBar: state.won && state.reviewing,
    winStats: {
      time: fmtTime(state.elapsedSec),
      moves: String(state.moves),
      resets: g ? `${g.resetsTotal - g.resetsLeft} / ${g.resetsTotal}` : '',
      undos: String(state.undos),
    },
    aiStatus: `${state.aiStep} / ${state.aiTotal} moves`,
    aiSpeedLabel: state.aiFast ? 'Speed: fast' : 'Speed: normal',
    actions: {
      start,
      restart,
      playAgain: () => start(g ? g.difficulty : 'normal'),
      goMenu: () => {
        stopAi()
        patch({ screen: 'menu', won: false, reviewing: false, resetMode: false })
      },
      review: () => patch({ reviewing: true }),
      cellClick,
      placeDigit,
      erase,
      undo,
      toggleNotes: () => setState((s) => ({ ...s, notesMode: !s.notesMode })),
      toggleResetMode,
      cancelReset: () => patch({ resetMode: false }),
      aiSolve,
      aiStop: () => stopAi('You have the board back. Undo rolls back the AI’s moves.'),
      aiToggleSpeed: () => setState((s) => ({ ...s, aiFast: !s.aiFast })),
    },
  }
}
