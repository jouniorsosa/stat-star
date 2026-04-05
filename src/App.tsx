import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { SeasonProvider } from './lib/SeasonContext'
import Dashboard from './pages/Dashboard'
import Teams from './pages/Teams'
import TeamRoster from './pages/TeamRoster'
import Seasons from './pages/Seasons'
import Schedule from './pages/Schedule'
import MatchupDetail from './pages/MatchupDetail'
import GameSetup from './pages/GameSetup'
import LiveGame from './pages/LiveGame'
import BoxScore from './pages/BoxScore'
import SeasonStats from './pages/SeasonStats'
import PlayerShotChart from './pages/PlayerShotChart'

const navItems = [
  { to: '/', label: 'Home', icon: '\u2302' },
  { to: '/schedule', label: 'Schedule', icon: '\uD83D\uDCC5' },
  { to: '/teams', label: 'Teams', icon: '\u26BD' },
  { to: '/game/new', label: 'New Game', icon: '+' },
  { to: '/stats', label: 'Stats', icon: '\u2261' },
  { to: '/seasons', label: 'Seasons', icon: '\uD83C\uDFC6' },
]

export default function App() {
  const location = useLocation()
  const isLiveGame = location.pathname.startsWith('/game/live/')

  return (
    <SeasonProvider>
      <div className="min-h-screen bg-[#0a0a0f] text-gray-100 font-sans">
        {!isLiveGame && (
          <nav className="bg-gradient-to-r from-[#0f1018] to-[#131320] border-b border-white/5 sticky top-0 z-50 backdrop-blur-xl">
            <div className="max-w-6xl mx-auto px-4 flex items-center h-16 gap-1 overflow-x-auto">
              <Link to="/" className="flex items-center gap-2 mr-4 shrink-0 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-shadow">
                  BB
                </div>
                <span className="text-white font-bold text-lg hidden sm:block">Stat Star</span>
              </Link>
              {navItems.map(n => {
                const active = location.pathname === n.to
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 shrink-0 ${
                      active
                        ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/10 text-orange-400 shadow-inner shadow-orange-500/10'
                        : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
                    }`}
                  >
                    <span className="mr-1">{n.icon}</span>{n.label}
                  </Link>
                )
              })}
            </div>
          </nav>
        )}

        <main className={isLiveGame ? '' : 'max-w-6xl mx-auto px-4 py-8'}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:teamId" element={<TeamRoster />} />
            <Route path="/seasons" element={<Seasons />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/schedule/:scheduleId" element={<MatchupDetail />} />
            <Route path="/game/new" element={<GameSetup />} />
            <Route path="/game/live/:gameId" element={<LiveGame />} />
            <Route path="/game/:gameId" element={<BoxScore />} />
            <Route path="/stats" element={<SeasonStats />} />
            <Route path="/players/:playerId/shots" element={<PlayerShotChart />} />
          </Routes>
        </main>
      </div>
    </SeasonProvider>
  )
}
