import styles from './ReviewBar.module.scss'

interface ReviewBarProps {
  onPlayAgain: () => void
}

/** Floating pill shown while inspecting a solved board. */
export function ReviewBar({ onPlayAgain }: ReviewBarProps) {
  return (
    <div className={styles.bar}>
      <span className={styles.text}>Solved — reviewing board</span>
      <button type="button" className={styles.playBtn} onClick={onPlayAgain}>
        Play again
      </button>
    </div>
  )
}
