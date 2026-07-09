// Pure helpers over the current grid/ball; no React, no side effects.

import { candidatesFor, reachList, type Grid } from '../engine/board'

/** True when there is at least one legal placement reachable from `cell`. */
export function legalMoveFrom(grid: Grid, cell: number): boolean {
  for (const j of reachList(cell)) {
    if (!grid[j] && candidatesFor(grid, j).length) return true
  }
  return false
}

/** Trapped: board unfinished and no reachable empty cell accepts any digit. */
export function computeTrapped(grid: Grid, ball: number): boolean {
  if (!grid.includes(0)) return false
  return !legalMoveFrom(grid, ball)
}

export function fmtTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
