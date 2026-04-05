import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Player, ShotLocation, Game } from '../types'
import ShotChartDisplay from '../components/ShotChartDisplay'
import PlayerNotesPanel from '../components/PlayerNotesPanel'

export default function PlayerShotChart() {
  const { playerId } = useParams<{ playerId: string }>()
  const [player, setPlayer] = useState<Player | null>(null)
  const [shots, setShots] = useState<ShotLocation[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [filterGame, setFilterGame] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: sh }] = await Promise.all([
        supabase.from('players').select('*').eq('id', playerId!).single(),
        supabase.from('shot_locations').select('*').eq('player_id', playerId!).order('created_at', { ascending: false }),
      ])
      setPlayer(p)
      setShots((sh ?? []) as ShotLocation[])

      // Get unique game IDs from shots
      const gameIds = [...new Set((sh ?? []).map((s: ShotLocation) => s.game_id))]
      if (gameIds.length > 0) {
        const { data: g } = await supabase.from('games').select('*').in('id', gameIds).order('game_date', { ascending: false })
        setGames((g ?? []) as Game[])
      }
      setLoading(false)
    }
    load()
  }, [playerId])

  if (loading) return <div className="text-center py-12 text-gray-600">Loading...</div>
  if (!player) return <div className="text-center py-12 text-gray-500">Player not found</div>

  const filtered = filterGame ? shots.filter(s => s.game_id === filterGame) : shots

  return (
    <div>
      <Link to="/teams" className="text-gray-500 hover:text-gray-300 text-sm mb-6 inline-flex items-center gap-1 transition-colors">&larr; Back</Link>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/20 flex items-center justify-center font-black text-orange-400 text-2xl">
          {player.number}
        </div>
        <div>
          <h1 className="text-3xl font-black">{player.name}</h1>
          <p className="text-gray-500">Shot Chart &middot; {shots.length} total shots</p>
        </div>
      </div>

      {games.length > 0 && (
        <select
          value={filterGame}
          onChange={e => setFilterGame(e.target.value)}
          className="bg-[#12121c] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm mb-6 focus:outline-none focus:border-orange-500/50"
        >
          <option value="">All Games ({shots.length} shots)</option>
          {games.map(g => {
            const count = shots.filter(s => s.game_id === g.id).length
            return <option key={g.id} value={g.id}>{g.game_date} ({count} shots)</option>
          })}
        </select>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-[#12121c] border border-white/5 rounded-2xl">
          <p className="text-gray-500 text-lg mb-2">No shot data</p>
          <p className="text-gray-600 text-sm">Shot locations will appear here once recorded during games</p>
        </div>
      ) : (
        <div className="max-w-lg mx-auto">
          <ShotChartDisplay shots={filtered} title={filterGame ? 'Game Shots' : 'All Games'} />
        </div>
      )}

      {/* Scouting notes */}
      <div className="mt-8">
        <h2 className="text-xl font-black mb-4 flex items-center gap-2">
          <span className="w-1 h-6 bg-orange-500 rounded-full" />
          Scouting Notes
        </h2>
        <div className="max-w-lg">
          <PlayerNotesPanel playerId={playerId!} playerName={player.name} />
        </div>
      </div>
    </div>
  )
}
