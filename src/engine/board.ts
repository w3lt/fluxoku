// Board geometry and sudoku rule primitives shared by gameplay and generation.

/** 81 cells in row-major order; 0 means empty, 1-9 is a placed digit. */
export type Grid = number[]

export const CELL_COUNT = 81

export const rowOf = (i: number): number => Math.floor(i / 9)
export const colOf = (i: number): number => i % 9
export const boxOf = (i: number): number =>
  Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3)

/** Two distinct cells share a row, column, or 3x3 box. */
export function reaches(a: number, b: number): boolean {
  return a !== b && (rowOf(a) === rowOf(b) || colOf(a) === colOf(b) || boxOf(a) === boxOf(b))
}

// Precomputed peer lists (row + column + box) — the same set serves sudoku
// constraints and ball reachability.
const REACH: number[][] = []
for (let i = 0; i < CELL_COUNT; i++) {
  const peers: number[] = []
  for (let j = 0; j < CELL_COUNT; j++) if (reaches(i, j)) peers.push(j)
  REACH.push(peers)
}

export const reachList = (i: number): readonly number[] => REACH[i]

/** Digits that can legally go in cell `i`; empty when the cell is filled. */
export function candidatesFor(grid: Grid, i: number): number[] {
  if (grid[i]) return []
  const used = new Array<boolean>(10).fill(false)
  for (const j of REACH[i]) if (grid[j]) used[grid[j]] = true
  const out: number[] = []
  for (let d = 1; d <= 9; d++) if (!used[d]) out.push(d)
  return out
}

export type ConflictUnit = 'row' | 'column' | 'box'

export interface ConflictInfo {
  unit: ConflictUnit
  /** Cells already holding the conflicting digit within that unit. */
  cells: number[]
}

/** First unit that conflicts with placing `d` at `i`, or null when legal. */
export function conflictInfo(grid: Grid, i: number, d: number): ConflictInfo | null {
  const r = rowOf(i)
  const c = colOf(i)
  const b = boxOf(i)
  const hits: Record<ConflictUnit, number[]> = { row: [], column: [], box: [] }
  for (let j = 0; j < CELL_COUNT; j++) {
    if (j === i || grid[j] !== d) continue
    if (rowOf(j) === r) hits.row.push(j)
    if (colOf(j) === c) hits.column.push(j)
    if (boxOf(j) === b) hits.box.push(j)
  }
  for (const unit of ['row', 'column', 'box'] as const) {
    if (hits[unit].length) return { unit, cells: hits[unit] }
  }
  return null
}
