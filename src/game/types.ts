import type { Grid } from '../engine/board'
import type { DifficultyKey } from '../engine/generator'

/** One puzzle in progress. `grid` starts as a copy of `givens` and fills up. */
export interface GameSession {
  givens: Grid
  solution: Grid
  grid: Grid
  ball: number
  startBall: number
  resetsTotal: number
  resetsLeft: number
  difficulty: DifficultyKey
  label: string
}

/** Everything undo restores after a placement, erase, or ball reset. */
export interface Snapshot {
  grid: Grid
  ball: number
  resetsLeft: number
  notes: number[]
  moves: number
}

export type Screen = 'menu' | 'playing'

export interface GameState {
  screen: Screen
  generating: boolean
  game: GameSession | null
  /** 81 bitmasks; bit d set means digit d is pencilled in. */
  notes: number[]
  selected: number | null
  notesMode: boolean
  /** Choosing a filled cell to relocate the ball to. */
  resetMode: boolean
  won: boolean
  reviewing: boolean
  undoStack: Snapshot[]
  moves: number
  undos: number
  startTime: number
  /** Seconds since start; ticked by an interval, frozen at its final value on win. */
  elapsedSec: number
  toast: string
  /** Cells newly reachable after the last move, briefly highlighted. */
  justOpened: number[]
  /** Cells flashed red after an illegal placement. */
  conflicts: number[]
  /** AI playback: stepping through a precomputed solving route. */
  aiSolving: boolean
  /** Route steps already applied in the current AI run. */
  aiStep: number
  /** Total steps in the current AI run. */
  aiTotal: number
  /** Fast AI playback; persists across puzzles in a session. */
  aiFast: boolean
}

export const initialGameState: GameState = {
  screen: 'menu',
  generating: false,
  game: null,
  notes: [],
  selected: null,
  notesMode: false,
  resetMode: false,
  won: false,
  reviewing: false,
  undoStack: [],
  moves: 0,
  undos: 0,
  startTime: 0,
  elapsedSec: 0,
  toast: '',
  justOpened: [],
  conflicts: [],
  aiSolving: false,
  aiStep: 0,
  aiTotal: 0,
  aiFast: false,
}
