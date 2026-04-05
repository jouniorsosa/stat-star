import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSeasonContext } from '../lib/SeasonContext'
import type { Game, Team } from '../types'

export default function Dashboard() {
  const { activeSeason } = useSeasonContext()
  const [games, setGames] = useState<(Game & { home_team: Team; away_team: Team })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let query = supabase
      .from('games')
      .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)')
      .order('game_date', { ascending: false })
      .limit(10)

    if (activeSeason) {
      query = query.eq('season_id', activeSeason.id)
    }

    query.then(({ data }) => {
      setGames((data ?? []) as typeof games)
      setLoading(false)
    })
  }, [activeSeason])

  return (
    <div>
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent mb-3">
          Stat Star
        </h1>
        <p className="text-gray-500 text-lg">Real-time basketball stat tracking</p>
        {activeSeason && (
          <p className="text-orange-400/70 text-sm mt-1 font-medium">{activeSeason.name}</p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
        <Link to="/game/new"
          className="group relative overflow-hidden bg-gradient-to-br from-orange-600 to-amber-600 rounded-2xl p-5 text-center transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-orange-500/20">
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <div className="relative">
            <div className="text-3xl mb-1">+</div>
            <p className="font-bold text-white">New Game</p>
          </div>
        </Link>
        <Link to="/schedule"
          className="group bg-[#12121c] border border-white/5 rounded-2xl p-5 text-center transition-all duration-300 hover:border-white/10 hover:bg-[#16162a]">
          <div className="text-3xl mb-1">&#128197;</div>
          <p className="font-bold">Schedule</p>
        </Link>
        <Link to="/teams"
          className="group bg-[#12121c] border border-white/5 rounded-2xl p-5 text-center transition-all duration-300 hover:border-white/10 hover:bg-[#16162a]">
          <div className="text-3xl mb-1">&#9917;</div>
          <p className="font-bold">Teams</p>
        </Link>
        <Link to="/stats"
          className="group bg-[#12121c] border border-white/5 rounded-2xl p-5 text-center transition-all duration-300 hover:border-white/10 hover:bg-[#16162a]">
          <div className="text-3xl mb-1">&#9776;</div>
          <p className="font-bold">Stats</p>
        </Link>
      </div>

      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="w-1 h-6 bg-orange-500 rounded-full" />
        {activeSeason ? `${activeSeason.name} Games` : 'Recent Games'}
      </h2>
      {loading ? (
        <div className="text-center py-12 text-gray-600">Loading games...</div>
      ) : games.length === 0 ? (
        <div className="text-center py-16 bg-[#12121c] border border-white/5 rounded-2xl">
          <p className="text-gray-500 text-lg mb-2">No games yet</p>
          <p className="text-gray-600 text-sm">
            {activeSeason ? `No games in ${activeSeason.name}. ` : ''}
            Create some teams and start a game!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {games.map(g => (
            <Link key={g.id} to={g.status === 'in_progress' ? `/game/live/${g.id}` : `/game/${g.id}`}
              className="block bg-[#12121c] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all duration-200 group">
              <div className="flex items-center justify-between">
                <div className="flex-1 text-right pr-4">
                  <p className="font-bold text-lg group-hover:text-blue-400 transition-colors">{g.home_team?.name}</p>
                </div>
                <div className="text-center min-w-[100px]">
                  <p className="text-3xl font-black tracking-tight">
                    <span className={g.home_score > g.away_score ? 'text-white' : 'text-gray-500'}>{g.home_score}</span>
                    <span className="text-gray-600 mx-1">-</span>
                    <span className={g.away_score > g.home_score ? 'text-white' : 'text-gray-500'}>{g.away_score}</span>
                  </p>
                  {g.status === 'in_progress' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-green-400 mt-1">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />LIVE
                    </span>
                  ) : (
                    <span className="text-xs text-gray-600 mt-1 block">FINAL</span>
                  )}
                </div>
                <div className="flex-1 text-left pl-4">
                  <p className="font-bold text-lg group-hover:text-red-400 transition-colors">{g.away_team?.name}</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-3 text-center">{g.game_type} &middot; {g.game_date}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
