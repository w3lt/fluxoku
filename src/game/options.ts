/** Player-facing rule/interface knobs exposed by the design. */
export interface GameOptions {
  /** 'warn' colors a placed digit red when it differs from the solution. */
  mistakeCheck: 'off' | 'warn'
  showTimer: boolean
  /** Fade empty cells the ball cannot reach. */
  dimUnreachable: boolean
}

export const DEFAULT_OPTIONS: GameOptions = {
  mistakeCheck: 'off',
  showTimer: true,
  dimUnreachable: true,
}
