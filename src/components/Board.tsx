import type { CellBg, CellView } from '../game/views'
import styles from './Board.module.scss'

const BG_CLASS: Record<CellBg, string> = {
  plain: styles.bgPlain,
  given: styles.bgGiven,
  peer: styles.bgPeer,
  peerGiven: styles.bgPeerGiven,
  same: styles.bgSame,
  reach: styles.bgReach,
  opened: styles.bgOpened,
  ball: styles.bgBall,
  resetTarget: styles.bgResetTarget,
  conflict: styles.bgConflict,
}

interface BoardProps {
  cells: CellView[]
  ballLeft: string
  ballTop: string
  onCellClick: (i: number) => void
}

export function Board({ cells, ballLeft, ballTop, onCellClick }: BoardProps) {
  return (
    <div className={styles.board}>
      <div className={styles.grid}>
        {cells.map((cell) => (
          <BoardCell key={cell.index} cell={cell} onClick={() => onCellClick(cell.index)} />
        ))}
      </div>
      <div className={styles.ball} style={{ left: ballLeft, top: ballTop }} aria-hidden="true">
        <div className={styles.ballRing} />
      </div>
    </div>
  )
}

function BoardCell({ cell, onClick }: { cell: CellView; onClick: () => void }) {
  const classes = [styles.cell, BG_CLASS[cell.bg]]
  if (cell.ring === 'selected') classes.push(styles.ringSelected)
  if (cell.ring === 'target') classes.push(styles.ringTarget)
  if (cell.dimmed) classes.push(styles.dimmed)

  const digitClasses = [styles.digit]
  if (cell.given) digitClasses.push(styles.digitGiven)
  if (cell.error) digitClasses.push(styles.digitError)

  return (
    <div role="button" aria-label={cell.aria} className={classes.join(' ')} onClick={onClick}>
      {cell.hasDigit && <span className={digitClasses.join(' ')}>{cell.digit}</span>}
      {cell.noteDigits.length > 0 && (
        <div className={styles.notes}>
          {cell.noteDigits.map((digit, slot) => (
            // Slots are positional (digit d lives in slot d-1), so the index is the identity.
            // eslint-disable-next-line react-x/no-array-index-key
            <span key={slot}>{digit}</span>
          ))}
        </div>
      )}
      {cell.dot && <div className={styles.dot} />}
    </div>
  )
}
