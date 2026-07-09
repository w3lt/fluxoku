import type { PadKey } from '../game/views'
import styles from './SidePanel.module.scss'

interface SidePanelProps {
  tokens: boolean[]
  pad: PadKey[]
  notesMode: boolean
  canUndo: boolean
  canErase: boolean
  resetArmed: boolean
  onDigit: (d: number) => void
  onUndo: () => void
  onErase: () => void
  onNotesToggle: () => void
  onResetToggle: () => void
}

export function SidePanel(props: SidePanelProps) {
  const { tokens, pad, notesMode, canUndo, canErase, resetArmed } = props
  return (
    <div className={styles.panel}>
      <div className={styles.status}>
        <div className={styles.statusLabel}>Resets</div>
        <div className={styles.tokens}>
          {tokens.map((filled, slot) => (
            // Tokens are positional; only the filled count matters.
            // eslint-disable-next-line react-x/no-array-index-key
            <div key={slot} className={`${styles.token} ${filled ? styles.tokenFilled : ''}`} />
          ))}
        </div>
      </div>

      <div className={styles.pad}>
        {pad.map((key) => (
          <button
            key={key.digit}
            type="button"
            aria-label={`Place ${key.digit}`}
            className={`${styles.padKey} ${key.enabled ? '' : styles.padKeyMuted}`}
            onClick={() => props.onDigit(key.digit)}
          >
            {key.digit}
          </button>
        ))}
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={`${styles.controlBtn} ${canUndo ? '' : styles.controlMuted}`}
          onClick={props.onUndo}
        >
          Undo <span className={styles.kbd}>U</span>
        </button>
        <button
          type="button"
          className={`${styles.controlBtn} ${canErase ? '' : styles.controlMuted}`}
          onClick={props.onErase}
        >
          Erase <span className={styles.kbd}>⌫</span>
        </button>
        <button
          type="button"
          className={`${styles.controlBtn} ${notesMode ? styles.notesActive : ''}`}
          onClick={props.onNotesToggle}
        >
          Notes <span className={styles.kbdDim}>N</span>
        </button>
        <button
          type="button"
          className={`${styles.controlBtn} ${resetArmed ? styles.resetArmed : styles.resetIdle}`}
          onClick={props.onResetToggle}
        >
          Reset <span className={styles.kbdReset}>R</span>
        </button>
      </div>

      <div className={styles.legend}>
        Tinted cells with a <span className={styles.legendDot} /> are in reach of the ball{' '}
        <span className={styles.legendBall} />. Arrow keys move, 1–9 place, Esc cancels.
      </div>
    </div>
  )
}
