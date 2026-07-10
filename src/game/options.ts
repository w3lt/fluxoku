/** Player-facing rule/interface knobs exposed by the design. */
export interface GameOptions {
  /** 'warn' colors a placed digit red when it differs from the solution. */
  mistakeCheck: 'off' | 'warn'
  showTimer: boolean
  /** Fade empty cells the ball cannot reach. */
  dimUnreachable: boolean
  /**
   * Gate play by sudoku legality: the pad offers only digits that fit the
   * selected cell, conflicting entries are blocked, and a full board is a win.
   * Off, any digit goes in any reachable cell and only a correct board wins.
   */
  autoAssist: boolean
}

export const DEFAULT_OPTIONS: GameOptions = {
  mistakeCheck: 'off',
  showTimer: true,
  dimUnreachable: true,
  autoAssist: true,
}
