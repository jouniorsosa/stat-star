import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Game, Team } from '../types'

export default function Dashboard() {
  const [games, setGames] = useState<(Game & { home_team: Team; away_team: Team })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('games')
      .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)')
      .order('game_date', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setGames((data ?? []) as typeof games)
        setLoading(false)
      })
  }, [])

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <Link
          to="/game/new"
          className="flex-1 bg-orange-600 hover:bg-orange-500 text-white rounded-xl p-6 text-center font-bold text-lg transition-colors"
        >
          Start New Game
        </Link>
        <Link
          to="/teams"
          className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-xl p-6 text-center font-bold text-lg transition-colors border border-gray-700"
        >
          Manage Teams
        </Link>
        <Link
          to="/stats"
          className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-xl p-6 text-center font-bold text-lg transition-colors border border-gray-700"
        >
          Season Stats
        </Link>
      </div>

      <h2 className="text-xl font-bold mb-4">Recent Games</h2>
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : games.length === 0 ? (
        <p className="text-gray-500">No games yet. Create some teams and start a game!</p>
      ) : (
        <div className="space-y-3">
          {games.map(g => (
            <Link
              key={g.id}
              to={g.status === 'in_progress' ? `/game/live/${g.id}` : `/game/${g.id}`}
              className="block bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 text-right">
                  <p className="font-bold">{g.home_team?.name}</p>
                </div>
                <div className="mx-4 text-center min-w-[80px]">
                  <p className="text-2xl font-bold">
                    {g.home_score} - {g.away_score}
                  </p>
                  <p className={`text-xs mt-1 ${
                    g.status === 'in_progress' ? 'text-green-400' : 'text-gray-500'
                  }`}>
                    {g.status === 'in_progress' ? 'LIVE' : g.status === 'final' ? 'FINAL' : g.game_date}
                  </p>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold">{g.away_team?.name}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {g.game_type} &middot; {g.game_date}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
