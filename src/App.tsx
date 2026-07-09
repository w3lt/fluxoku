import { GameScreen } from './components/GameScreen'
import { MenuScreen } from './components/MenuScreen'
import { ReviewBar } from './components/ReviewBar'
import { Toast } from './components/Toast'
import { WinOverlay } from './components/WinOverlay'
import { DEFAULT_OPTIONS } from './game/options'
import { useFluxokuGame } from './game/useFluxokuGame'
import styles from './App.module.scss'

function App() {
  const game = useFluxokuGame(DEFAULT_OPTIONS)
  const { state, actions } = game

  return (
    <div className={styles.app}>
      {state.screen === 'menu' ? <MenuScreen onStart={actions.start} /> : <GameScreen game={game} />}

      {game.showWin && (
        <WinOverlay
          stats={game.winStats}
          onPlayAgain={actions.playAgain}
          onReview={actions.review}
          onMenu={actions.goMenu}
        />
      )}

      {game.showReviewBar && <ReviewBar onPlayAgain={actions.playAgain} />}

      {state.toast && <Toast text={state.toast} />}
    </div>
  )
}

export default App
