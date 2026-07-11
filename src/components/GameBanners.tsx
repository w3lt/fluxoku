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

interface AiSolvingBannerProps {
  status: string
  speedLabel: string
  onToggleSpeed: () => void
  onTakeOver: () => void
}

/** Progress banner shown while the AI plays out its solving route. */
export function AiSolvingBanner({ status, speedLabel, onToggleSpeed, onTakeOver }: AiSolvingBannerProps) {
  return (
    <div className={styles.container}>
      <div className={styles.ai}>
        <div className={styles.aiInfo}>
          <div className={styles.aiDot} />
          <div className={styles.aiTitle}>AI is solving…</div>
          <div className={styles.aiStatus}>{status}</div>
        </div>
        <div className={styles.aiActions}>
          <button type="button" className={styles.aiSpeedBtn} onClick={onToggleSpeed}>
            {speedLabel}
          </button>
          <button type="button" className={styles.aiTakeOverBtn} onClick={onTakeOver}>
            Take over
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
