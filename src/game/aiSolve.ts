// Bridges the rule-based solver to the game's flat-grid session state.

import Solution from '../ai/rule-based/solution'
import { colOf, rowOf, type Grid } from '../engine/board'

/** One AI placement: `digit` goes into `cell` and the ball follows it. */
export interface AiStep {
  cell: number
  digit: number
}

/**
 * Plans the placements that finish the puzzle from the current position, in
 * an order the ball can legally follow without using resets.
 * Returns [] when the board is already full, or null when no such route
 * exists from here (conflicting digits, an unsolvable grid, or a remainder
 * the ball cannot cover).
 */
export function planAiSolve(grid: Grid, ball: number): AiStep[] | null {
  const rows: number[][] = []
  for (let r = 0; r < 9; r++) rows.push(grid.slice(r * 9, r * 9 + 9))

  let solver: Solution
  try {
    // The constructor rejects boards with duplicate digits, which the player
    // can produce with auto-assist off.
    solver = new Solution(rows, [rowOf(ball), colOf(ball)])
  } catch {
    return null
  }

  solver.solve()
  const steps: AiStep[] = []
  for (let move = solver.nextMoves(); move !== null; move = solver.nextMoves()) {
    steps.push({ cell: move.position[0] * 9 + move.position[1], digit: move.value })
  }
  // nextMoves() yields nothing both when the board is full and when solving
  // failed; only the former is a valid empty plan.
  if (steps.length === 0 && grid.includes(0)) return null
  return steps
}
