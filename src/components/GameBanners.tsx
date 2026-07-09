import styles from './GameBanners.module.scss'

interface TrappedBannerProps {
  sub: string
  canReset: boolean
  resetLabel: string
  onReset: () => void
  onUndo: () => void
  onRestart: () => void
}

/** Dark banner shown when the ball has no legal placements left. */
export function TrappedBanner({ sub, canReset, resetLabel, onReset, onUndo, onRestart }: TrappedBannerProps) {
  return (
    <div className={styles.container}>
      <div className={styles.trapped}>
        <div>
          <div className={styles.trappedTitle}>No legal spaces from here.</div>
          <div className={styles.trappedSub}>{sub}</div>
        </div>
        <div className={styles.trappedActions}>
          {canReset && (
            <button type="button" className={styles.resetBtn} onClick={onReset}>
              {resetLabel}
            </button>
          )}
          <button type="button" className={styles.ghostBtn} onClick={onUndo}>
            Undo
          </button>
          <button type="button" className={styles.ghostBtn} onClick={onRestart}>
            Restart
          </button>
        </div>
      </div>
    </div>
  )
}

interface ResetModeBannerProps {
  onCancel: () => void
}

/** Light banner shown while choosing where to relocate the ball. */
export function ResetModeBanner({ onCancel }: ResetModeBannerProps) {
  return (
    <div className={styles.container}>
      <div className={styles.resetMode}>
        <div className={styles.resetModeText}>Choose a filled cell to move the ball to.</div>
        <button type="button" className={styles.cancelBtn} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
