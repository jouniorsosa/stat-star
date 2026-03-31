import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Game, Team, Player, PlayerGameStats, StatKey, StatAction } from '../types'
import { computePoints } from '../types'

interface FullStats extends PlayerGameStats {
  player: Player
}

export default function LiveGame() {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const [game, setGame] = useState<Game & { home_team: Team; away_team: Team } | null>(null)
  const [stats, setStats] = useState<FullStats[]>([])
  const [actionLog, setActionLog] = useState<StatAction[]>([])
  const [activePlayer, setActivePlayer] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: g } = await supabase
      .from('games')
      .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)')
      .eq('id', gameId!)
      .single()
    setGame(g as typeof game)

    const { data: s } = await supabase
      .from('player_game_stats')
      .select('*, player:players(*)')
      .eq('game_id', gameId!)
    setStats((s ?? []) as FullStats[])
  }, [gameId])

  useEffect(() => { load() }, [load])

  async function recordStat(playerId: string, stat: StatKey, value: number = 1) {
    const row = stats.find(s => s.player_id === playerId)
    if (!row) return

    const updated = { ...row, [stat]: row[stat] + value }
    setStats(prev => prev.map(s => s.player_id === playerId ? { ...s, [stat]: s[stat] + value } : s))
    setActionLog(prev => [...prev, { playerId, stat, value, timestamp: Date.now() }])

    await supabase
      .from('player_game_stats')
      .update({ [stat]: updated[stat] })
      .eq('id', row.id)

    // Update game score
    const homeScore = stats
      .filter(s => s.team_id === game?.home_team_id)
      .reduce((sum, s) => {
        const curr = s.player_id === playerId ? updated : s
        return sum + computePoints(curr)
      }, 0)
    const awayScore = stats
      .filter(s => s.team_id === game?.away_team_id)
      .reduce((sum, s) => {
        const curr = s.player_id === playerId ? updated : s
        return sum + computePoints(curr)
      }, 0)

    await supabase.from('games').update({ home_score: homeScore, away_score: awayScore }).eq('id', gameId!)
    setGame(prev => prev ? { ...prev, home_score: homeScore, away_score: awayScore } : prev)
  }

  async function undoLast() {
    if (actionLog.length === 0) return
    const last = actionLog[actionLog.length - 1]
    const row = stats.find(s => s.player_id === last.playerId)
    if (!row) return

    const newVal = Math.max(0, row[last.stat] - last.value)
    setStats(prev => prev.map(s => s.player_id === last.playerId ? { ...s, [last.stat]: newVal } : s))
    setActionLog(prev => prev.slice(0, -1))

    await supabase
      .from('player_game_stats')
      .update({ [last.stat]: newVal })
      .eq('id', row.id)

    // Recalculate score
    const updatedStats = stats.map(s => s.player_id === last.playerId ? { ...s, [last.stat]: newVal } : s)
    const homeScore = updatedStats.filter(s => s.team_id === game?.home_team_id).reduce((sum, s) => sum + computePoints(s), 0)
    const awayScore = updatedStats.filter(s => s.team_id === game?.away_team_id).reduce((sum, s) => sum + computePoints(s), 0)
    await supabase.from('games').update({ home_score: homeScore, away_score: awayScore }).eq('id', gameId!)
    setGame(prev => prev ? { ...prev, home_score: homeScore, away_score: awayScore } : prev)
  }

  async function endGame() {
    if (!confirm('End this game and mark as final?')) return
    await supabase.from('games').update({ status: 'final' }).eq('id', gameId!)
    navigate(`/game/${gameId}`)
  }

  if (!game) return <p className="text-gray-500 p-4">Loading...</p>

  const homeStats = stats.filter(s => s.team_id === game.home_team_id)
  const awayStats = stats.filter(s => s.team_id === game.away_team_id)

  const statButtons: { label: string; action: (pid: string) => void; color: string }[] = [
    { label: '+2 Made', action: pid => { recordStat(pid, 'fgm'); recordStat(pid, 'fga') }, color: 'bg-green-700 hover:bg-green-600' },
    { label: '+2 Miss', action: pid => recordStat(pid, 'fga'), color: 'bg-red-800 hover:bg-red-700' },
    { label: '+3 Made', action: pid => { recordStat(pid, 'three_pm'); recordStat(pid, 'three_pa'); recordStat(pid, 'fgm'); recordStat(pid, 'fga') }, color: 'bg-green-600 hover:bg-green-500' },
    { label: '+3 Miss', action: pid => { recordStat(pid, 'three_pa'); recordStat(pid, 'fga') }, color: 'bg-red-700 hover:bg-red-600' },
    { label: 'FT Made', action: pid => { recordStat(pid, 'ftm'); recordStat(pid, 'fta') }, color: 'bg-emerald-700 hover:bg-emerald-600' },
    { label: 'FT Miss', action: pid => recordStat(pid, 'fta'), color: 'bg-red-900 hover:bg-red-800' },
    { label: 'OREB', action: pid => recordStat(pid, 'oreb'), color: 'bg-blue-700 hover:bg-blue-600' },
    { label: 'DREB', action: pid => recordStat(pid, 'dreb'), color: 'bg-blue-800 hover:bg-blue-700' },
    { label: 'AST', action: pid => recordStat(pid, 'assists'), color: 'bg-purple-700 hover:bg-purple-600' },
    { label: 'STL', action: pid => recordStat(pid, 'steals'), color: 'bg-yellow-700 hover:bg-yellow-600' },
    { label: 'BLK', action: pid => recordStat(pid, 'blocks'), color: 'bg-indigo-700 hover:bg-indigo-600' },
    { label: 'TO', action: pid => recordStat(pid, 'turnovers'), color: 'bg-orange-800 hover:bg-orange-700' },
    { label: 'FOUL', action: pid => recordStat(pid, 'fouls'), color: 'bg-rose-800 hover:bg-rose-700' },
  ]

  function PlayerRow({ s }: { s: FullStats }) {
    const pts = computePoints(s)
    const isActive = activePlayer === s.player_id
    return (
      <div className="mb-2">
        <button
          onClick={() => setActivePlayer(isActive ? null : s.player_id)}
          className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            isActive
              ? 'bg-orange-600/30 border-2 border-orange-500 text-white'
              : 'bg-gray-800 border border-gray-700 text-gray-300'
          }`}
        >
          <span className="text-orange-400 font-bold w-8 text-center text-sm">#{s.player?.number}</span>
          <span className="flex-1 font-medium text-sm truncate">{s.player?.name}</span>
          <span className="font-bold text-lg min-w-[2rem] text-right">{pts}</span>
          <span className="text-xs text-gray-500 w-20 text-right">
            {s.oreb + s.dreb}r {s.assists}a {s.steals}s
          </span>
        </button>
        {isActive && (
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-1 mt-1 px-1">
            {statButtons.map(b => (
              <button
                key={b.label}
                onClick={() => b.action(s.player_id)}
                className={`${b.color} text-white text-xs font-bold py-3 rounded-lg transition-colors min-h-[44px]`}
              >
                {b.label}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Score header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex-1 text-right">
            <p className="text-blue-400 font-bold text-sm">{game.home_team?.name}</p>
            <p className="text-3xl font-bold">{game.home_score}</p>
          </div>
          <div className="mx-4 text-center">
            <p className="text-green-400 text-xs font-bold mb-1">LIVE</p>
            <p className="text-gray-500 text-xs">{game.game_type}</p>
          </div>
          <div className="flex-1 text-left">
            <p className="text-red-400 font-bold text-sm">{game.away_team?.name}</p>
            <p className="text-3xl font-bold">{game.away_score}</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-900/50 border-b border-gray-800 px-4 py-2">
        <div className="flex gap-2 max-w-5xl mx-auto justify-center">
          <button
            onClick={undoLast}
            disabled={actionLog.length === 0}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              actionLog.length > 0
                ? 'bg-yellow-700 hover:bg-yellow-600 text-white'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            Undo ({actionLog.length})
          </button>
          <button
            onClick={endGame}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-700 hover:bg-red-600 text-white transition-colors"
          >
            End Game
          </button>
          <Link
            to="/"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
          >
            Home
          </Link>
        </div>
      </div>

      {/* Player lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto px-4 py-4">
        <div>
          <h3 className="text-blue-400 font-bold text-sm mb-2">{game.home_team?.name}</h3>
          {homeStats.map(s => <PlayerRow key={s.id} s={s} />)}
        </div>
        <div>
          <h3 className="text-red-400 font-bold text-sm mb-2">{game.away_team?.name}</h3>
          {awayStats.map(s => <PlayerRow key={s.id} s={s} />)}
        </div>
      </div>
    </div>
  )
}
