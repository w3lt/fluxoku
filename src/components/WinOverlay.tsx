import styles from './WinOverlay.module.scss'

interface WinOverlayProps {
  stats: { time: string; moves: string; resets: string; undos: string }
  onPlayAgain: () => void
  onReview: () => void
  onMenu: () => void
}

export function WinOverlay({ stats, onPlayAgain, onReview, onMenu }: WinOverlayProps) {
  return (
    <div className={styles.scrim}>
      <div className={styles.card}>
        <div className={styles.title}>Puzzle solved.</div>
        <div className={styles.subtitle}>You kept the space alive.</div>
        <div className={styles.stats}>
          <div className={styles.statLabel}>Time</div>
          <div className={styles.statValue}>{stats.time}</div>
          <div className={styles.statLabel}>Moves</div>
          <div className={styles.statValue}>{stats.moves}</div>
          <div className={styles.statLabel}>Resets used</div>
          <div className={styles.statValue}>{stats.resets}</div>
          <div className={styles.statLabel}>Undos</div>
          <div className={styles.statValue}>{stats.undos}</div>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.primaryBtn} onClick={onPlayAgain}>
            Play again
          </button>
          <div className={styles.actionRow}>
            <button type="button" className={styles.ghostBtn} onClick={onReview}>
              Review board
            </button>
            <button type="button" className={styles.ghostBtn} onClick={onMenu}>
              Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
