import type { FluxokuGame } from '../game/useFluxokuGame'
import { Board } from './Board'
import { AiSolvingBanner, ResetModeBanner, TrappedBanner } from './GameBanners'
import { Logo } from './Logo'
import { SettingsButton } from './SettingsButton'
import { SidePanel } from './SidePanel'
import styles from './GameScreen.module.scss'

interface GameScreenProps {
  game: FluxokuGame
  onOpenSettings: () => void
}

export function GameScreen({ game, onOpenSettings }: GameScreenProps) {
  const { state, actions } = game
  return (
    <section className={styles.screen}>
      <header className={styles.header}>
        <Logo size="small" />
        <div className={styles.meta}>
          <div className={styles.pill}>{state.game?.label ?? ''}</div>
          {game.showTimer && <div className={styles.timer}>{game.timerText}</div>}
          <button type="button" className={styles.newBtn} onClick={actions.goMenu}>
            New puzzle
          </button>
          <SettingsButton
            className={styles.settingsBtn}
            iconClassName={styles.settingsIcon}
            onClick={onOpenSettings}
          />
        </div>
      </header>

      {game.trappedVisible && (
        <TrappedBanner
          sub={game.trappedSub}
          canReset={game.canReset}
          resetLabel={game.resetBtnLabel}
          onReset={actions.toggleResetMode}
          onUndo={actions.undo}
          onRestart={actions.restart}
        />
      )}

      {state.aiSolving && (
        <AiSolvingBanner
          status={game.aiStatus}
          speedLabel={game.aiSpeedLabel}
          onToggleSpeed={actions.aiToggleSpeed}
          onTakeOver={actions.aiStop}
        />
      )}

      {state.resetMode && <ResetModeBanner onCancel={actions.cancelReset} />}

      <div className={styles.layout}>
        {state.generating && <div className={styles.generating}>Shaping the board…</div>}

        {game.ready && (
          <>
            <Board cells={game.cells} onCellClick={actions.cellClick} />
            <SidePanel
              tokens={game.tokens}
              pad={game.pad}
              notesMode={state.notesMode}
              canUndo={game.canUndo}
              canErase={game.canErase}
              resetArmed={game.resetArmed}
              onDigit={actions.placeDigit}
              onUndo={actions.undo}
              onErase={actions.erase}
              onNotesToggle={actions.toggleNotes}
              onResetToggle={actions.toggleResetMode}
              onAiSolve={actions.aiSolve}
            />
          </>
        )}
      </div>
    </section>
  )
}
