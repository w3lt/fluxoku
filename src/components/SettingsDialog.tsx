import styles from './SettingsDialog.module.scss'

const AUTO_ASSIST_ON_DESC =
  'On — the number pad only offers digits that fit the selected cell, and conflicting entries are blocked.'
const AUTO_ASSIST_OFF_DESC =
  'Off — place any digit in any reachable cell. Wrong numbers are accepted, making the game harder.'

interface SettingsDialogProps {
  autoAssist: boolean
  onToggleAutoAssist: () => void
  onClose: () => void
}

export function SettingsDialog({ autoAssist, onToggleAutoAssist, onClose }: SettingsDialogProps) {
  return (
    <div className={styles.scrim} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>Settings</div>
          <button type="button" className={styles.closeBtn} aria-label="Close settings" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.row}>
          <div className={styles.rowText}>
            <div className={styles.rowTitle}>Auto-detect possible options</div>
            <div className={styles.rowDesc}>
              {autoAssist ? AUTO_ASSIST_ON_DESC : AUTO_ASSIST_OFF_DESC}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoAssist}
            aria-label="Auto-detect possible options"
            className={autoAssist ? `${styles.switch} ${styles.switchOn}` : styles.switch}
            onClick={onToggleAutoAssist}
          >
            <span className={styles.knob} />
          </button>
        </div>

        <div className={styles.note}>Changes apply immediately, including to a puzzle in progress.</div>
      </div>
    </div>
  )
}
