import { useState } from 'react'
import { GameScreen } from './components/GameScreen'
import { MenuScreen } from './components/MenuScreen'
import { ReviewBar } from './components/ReviewBar'
import { SettingsDialog } from './components/SettingsDialog'
import { Toast } from './components/Toast'
import { WinOverlay } from './components/WinOverlay'
import { DEFAULT_OPTIONS } from './game/options'
import { useSettings } from './game/settings'
import { useFluxokuGame } from './game/useFluxokuGame'
import styles from './App.module.scss'

function App() {
  const { settings, toggleAutoAssist } = useSettings()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const game = useFluxokuGame({ ...DEFAULT_OPTIONS, autoAssist: settings.autoAssist })
  const { state, actions } = game
  const openSettings = () => setSettingsOpen(true)

  return (
    <div className={styles.app}>
      {state.screen === 'menu' ? (
        <MenuScreen onStart={actions.start} onOpenSettings={openSettings} />
      ) : (
        <GameScreen game={game} onOpenSettings={openSettings} />
      )}

      {game.showWin && (
        <WinOverlay
          stats={game.winStats}
          onPlayAgain={actions.playAgain}
          onReview={actions.review}
          onMenu={actions.goMenu}
        />
      )}

      {game.showReviewBar && <ReviewBar onPlayAgain={actions.playAgain} />}

      {settingsOpen && (
        <SettingsDialog
          autoAssist={settings.autoAssist}
          onToggleAutoAssist={toggleAutoAssist}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {state.toast && <Toast text={state.toast} />}
    </div>
  )
}

export default App
