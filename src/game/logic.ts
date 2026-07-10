// Pure helpers over the current grid/ball; no React, no side effects.

import { CELL_COUNT, candidatesFor, reachList, type Grid } from '../engine/board'

/**
 * True when there is at least one legal placement reachable from `cell`.
 * Without auto-assist any empty reachable cell counts, since wrong digits
 * are accepted there.
 */
export function legalMoveFrom(grid: Grid, cell: number, autoAssist: boolean): boolean {
  for (const j of reachList(cell)) {
    if (!grid[j] && (!autoAssist || candidatesFor(grid, j).length)) return true
  }
  return false
}

/** Trapped: board unfinished and no reachable empty cell accepts any digit. */
export function computeTrapped(grid: Grid, ball: number, autoAssist: boolean): boolean {
  if (!grid.includes(0)) return false
  return !legalMoveFrom(grid, ball, autoAssist)
}

/** True when every cell matches the solution. */
export function isSolved(grid: Grid, solution: Grid): boolean {
  for (let i = 0; i < CELL_COUNT; i++) {
    if (grid[i] !== solution[i]) return false
  }
  return true
}

export function fmtTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
