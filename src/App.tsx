import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Teams from './pages/Teams'
import TeamRoster from './pages/TeamRoster'
import GameSetup from './pages/GameSetup'
import LiveGame from './pages/LiveGame'
import BoxScore from './pages/BoxScore'
import SeasonStats from './pages/SeasonStats'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/teams', label: 'Teams' },
  { to: '/game/new', label: 'New Game' },
  { to: '/stats', label: 'Stats' },
]

export default function App() {
  const location = useLocation()
  const isLiveGame = location.pathname.startsWith('/game/live/')

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {!isLiveGame && (
        <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 flex items-center h-14 gap-1">
            <Link to="/" className="text-orange-500 font-bold text-lg mr-4 shrink-0">
              BBall Stats
            </Link>
            {navItems.map(n => (
              <Link
                key={n.to}
                to={n.to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === n.to
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}
              >
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
      )}

      <main className={isLiveGame ? '' : 'max-w-5xl mx-auto px-4 py-6'}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/teams/:teamId" element={<TeamRoster />} />
          <Route path="/game/new" element={<GameSetup />} />
          <Route path="/game/live/:gameId" element={<LiveGame />} />
          <Route path="/game/:gameId" element={<BoxScore />} />
          <Route path="/stats" element={<SeasonStats />} />
        </Routes>
      </main>
    </div>
  )
}
