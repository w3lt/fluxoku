import type { DifficultyKey } from '../engine/generator'
import { Logo } from './Logo'
import styles from './MenuScreen.module.scss'

const MODES: { key: DifficultyKey; name: string; hint: string }[] = [
  { key: 'easy', name: 'Easy', hint: 'open board · 3 resets' },
  { key: 'normal', name: 'Normal', hint: 'moderate space · 2 resets' },
  { key: 'hard', name: 'Hard', hint: 'tight space · 1 reset' },
]

const HOW_TO = [
  'Normal sudoku rules — but you can only play near the ball.',
  'The ball opens cells in its row, column, and 3×3 box.',
  'Place a digit in a reachable cell. The ball moves there.',
  'Trapped with no moves? Spend a reset to relocate the ball.',
]

interface MenuScreenProps {
  onStart: (difficulty: DifficultyKey) => void
}

export function MenuScreen({ onStart }: MenuScreenProps) {
  return (
    <section className={styles.screen}>
      <div className={styles.inner}>
        <h1 className={styles.title}>
          <Logo size="large" />
        </h1>
        <p className={styles.tagline}>Sudoku where space changes every move.</p>

        <div className={styles.modes}>
          {MODES.map((mode) => (
            <button key={mode.key} type="button" className={styles.modeBtn} onClick={() => onStart(mode.key)}>
              <span className={styles.modeName}>{mode.name}</span>
              <span className={styles.modeHint}>{mode.hint}</span>
            </button>
          ))}
        </div>

        <div className={styles.howTo}>
          <div className={styles.howToTitle}>How to play</div>
          <ol className={styles.howToList}>
            {HOW_TO.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
