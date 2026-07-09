// Puzzle generation: solved-grid construction, clue digging with a uniqueness
// check, and Fluxoku-specific playability (a ball path with limited resets).

import { CELL_COUNT, candidatesFor, reachList, reaches, type Grid } from './board'
import { mulberry32, shuffle, type Rng } from './rng'

export type DifficultyKey = 'easy' | 'normal' | 'hard'

export interface DifficultyDef {
  key: DifficultyKey
  label: string
  clues: number
  resets: number
  blurb: string
}

export const DIFFICULTIES: Record<DifficultyKey, DifficultyDef> = {
  easy: { key: 'easy', label: 'Easy', clues: 40, resets: 3, blurb: 'Open board, many ways forward' },
  normal: { key: 'normal', label: 'Normal', clues: 34, resets: 2, blurb: 'Moderate space, some planning' },
  hard: { key: 'hard', label: 'Hard', clues: 30, resets: 1, blurb: 'Tight space. Traps are real' },
}

export interface Puzzle {
  givens: Grid
  solution: Grid
  /** Starting ball cell (index of a given). */
  ball: number
  resets: number
  difficulty: DifficultyKey
  label: string
}

/** Counts solutions up to `cap`; mutates `grid` but restores it before returning. */
function countSolutions(grid: Grid, cap: number): number {
  let best = -1
  let bestC: number[] | null = null
  for (let i = 0; i < CELL_COUNT; i++) {
    if (!grid[i]) {
      const c = candidatesFor(grid, i)
      if (c.length === 0) return 0
      if (!bestC || c.length < bestC.length) {
        best = i
        bestC = c
        if (c.length === 1) break
      }
    }
  }
  if (best === -1 || !bestC) return 1
  let n = 0
  for (const d of bestC) {
    grid[best] = d
    n += countSolutions(grid, cap - n)
    if (n >= cap) {
      grid[best] = 0
      return n
    }
  }
  grid[best] = 0
  return n
}

/** Backtracking fill over the most-constrained empty cell. */
function genSolved(rng: Rng): Grid {
  const grid: Grid = new Array<number>(CELL_COUNT).fill(0)
  const fill = (): boolean => {
    let best = -1
    let bestC: number[] | null = null
    for (let k = 0; k < CELL_COUNT; k++) {
      if (!grid[k]) {
        const c = candidatesFor(grid, k)
        if (c.length === 0) return false
        if (!bestC || c.length < bestC.length) {
          best = k
          bestC = c
          if (c.length === 1) break
        }
      }
    }
    if (best === -1 || !bestC) return true
    for (const d of shuffle(bestC.slice(), rng)) {
      grid[best] = d
      if (fill()) return true
    }
    grid[best] = 0
    return false
  }
  fill()
  return grid
}

/** Removes clues in symmetric pairs while the solution stays unique. */
function dig(solution: Grid, clueTarget: number, rng: Rng): Grid {
  const grid = solution.slice()
  const order = shuffle([...Array(CELL_COUNT).keys()], rng)
  let clues = CELL_COUNT
  for (const i of order) {
    if (clues <= clueTarget) break
    const j = 80 - i
    const cells = i === j ? [i] : [i, j]
    if (cells.some((c) => grid[c] === 0)) continue
    const saved = cells.map((c) => grid[c])
    cells.forEach((c) => {
      grid[c] = 0
    })
    if (countSolutions(grid.slice(), 2) !== 1) {
      cells.forEach((c, k) => {
        grid[c] = saved[k]
      })
    } else {
      clues -= cells.length
    }
  }
  return grid
}

/** Greedy solvability probe: can the ball visit every empty cell with `resets` relocations? */
function findPath(givens: Grid, solution: Grid, start: number, resets: number, rng: Rng): boolean {
  const grid = givens.slice()
  let ball = start
  let resetsLeft = resets
  const remaining = new Set<number>()
  for (let i = 0; i < CELL_COUNT; i++) if (!grid[i]) remaining.add(i)
  while (remaining.size) {
    const options = [...remaining].filter((i) => reaches(ball, i))
    if (!options.length) {
      if (resetsLeft <= 0) return false
      const targets: number[] = []
      for (let i = 0; i < CELL_COUNT; i++) {
        if (grid[i] && i !== ball) {
          for (const r of remaining) {
            if (reaches(i, r)) {
              targets.push(i)
              break
            }
          }
        }
      }
      if (!targets.length) return false
      ball = targets[Math.floor(rng() * targets.length)]
      resetsLeft--
      continue
    }
    // Warnsdorff-style: prefer the option with fewest onward choices (avoids stranding cells)
    let best: number | null = null
    let bestScore = Infinity
    for (const o of shuffle(options, rng)) {
      let onward = 0
      for (const r of remaining) if (r !== o && reaches(o, r)) onward++
      if (remaining.size > 1 && onward === 0) continue
      if (onward < bestScore) {
        bestScore = onward
        best = o
      }
    }
    if (best === null) best = options[0]
    grid[best] = solution[best]
    remaining.delete(best)
    ball = best
  }
  return true
}

/** Picks a starting given with breathing room and a verified winning path. */
function pickBall(givens: Grid, solution: Grid, resets: number, rng: Rng): number {
  const starts: { i: number; opts: number }[] = []
  for (let i = 0; i < CELL_COUNT; i++) {
    if (givens[i]) {
      let opts = 0
      for (const j of reachList(i)) if (!givens[j] && candidatesFor(givens, j).length) opts++
      if (opts >= 4) starts.push({ i, opts })
    }
  }
  shuffle(starts, rng)
  starts.sort((a, b) => b.opts - a.opts)
  const pool = shuffle(starts.slice(0, 12), rng)
  for (const s of pool) {
    for (let t = 0; t < 3; t++) {
      if (findPath(givens, solution, s.i, resets, rng)) return s.i
    }
  }
  return -1
}

export function generatePuzzle(diffKey: DifficultyKey, seed?: number): Puzzle {
  const d = DIFFICULTIES[diffKey] ?? DIFFICULTIES.normal
  const rng = mulberry32(seed ?? ((Date.now() & 0xffffff) ^ Math.floor(Math.random() * 1e9)))
  for (let attempt = 0; attempt < 12; attempt++) {
    const solution = genSolved(rng)
    const givens = dig(solution, d.clues, rng)
    const ball = pickBall(givens, solution, d.resets, rng)
    if (ball >= 0) {
      return { givens, solution, ball, resets: d.resets, difficulty: d.key, label: d.label }
    }
  }
  // Fallback: easier dig, guaranteed start
  const solution = genSolved(rng)
  const givens = dig(solution, 46, rng)
  let ball = pickBall(givens, solution, d.resets, rng)
  if (ball < 0) ball = givens.findIndex((v) => v > 0)
  return { givens, solution, ball, resets: d.resets, difficulty: d.key, label: d.label }
}
