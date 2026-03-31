import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Game, Team, Player, PlayerGameStats } from '../types'
import { computePoints, computeRebounds, pct } from '../types'

interface FullStats extends PlayerGameStats {
  player: Player
}

export default function BoxScore() {
  const { gameId } = useParams<{ gameId: string }>()
  const [game, setGame] = useState<(Game & { home_team: Team; away_team: Team }) | null>(null)
  const [stats, setStats] = useState<FullStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase
        .from('games')
        .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)')
        .eq('id', gameId!)
        .single(),
      supabase
        .from('player_game_stats')
        .select('*, player:players(*)')
        .eq('game_id', gameId!),
    ]).then(([{ data: g }, { data: s }]) => {
      setGame(g as typeof game)
      setStats((s ?? []) as FullStats[])
      setLoading(false)
    })
  }, [gameId])

  if (loading) return <p className="text-gray-500">Loading...</p>
  if (!game) return <p className="text-gray-500">Game not found</p>

  const homeStats = stats.filter(s => s.team_id === game.home_team_id)
  const awayStats = stats.filter(s => s.team_id === game.away_team_id)

  function TeamTable({ teamStats, team, color }: { teamStats: FullStats[]; team: Team; color: string }) {
    const totals = teamStats.reduce(
      (acc, s) => ({
        fgm: acc.fgm + s.fgm,
        fga: acc.fga + s.fga,
        three_pm: acc.three_pm + s.three_pm,
        three_pa: acc.three_pa + s.three_pa,
        ftm: acc.ftm + s.ftm,
        fta: acc.fta + s.fta,
        oreb: acc.oreb + s.oreb,
        dreb: acc.dreb + s.dreb,
        assists: acc.assists + s.assists,
        steals: acc.steals + s.steals,
        blocks: acc.blocks + s.blocks,
        turnovers: acc.turnovers + s.turnovers,
        fouls: acc.fouls + s.fouls,
        points: acc.points + computePoints(s),
      }),
      { fgm: 0, fga: 0, three_pm: 0, three_pa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0, points: 0 }
    )

    return (
      <div className="mb-8">
        <h2 className={`font-bold text-lg mb-3 ${color}`}>{team.name}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="text-left py-2 px-2 sticky left-0 bg-gray-950 min-w-[120px]">Player</th>
                <th className="text-right px-1">PTS</th>
                <th className="text-right px-1">FG</th>
                <th className="text-right px-1">FG%</th>
                <th className="text-right px-1">3P</th>
                <th className="text-right px-1">3P%</th>
                <th className="text-right px-1">FT</th>
                <th className="text-right px-1">FT%</th>
                <th className="text-right px-1">OREB</th>
                <th className="text-right px-1">DREB</th>
                <th className="text-right px-1">REB</th>
                <th className="text-right px-1">AST</th>
                <th className="text-right px-1">STL</th>
                <th className="text-right px-1">BLK</th>
                <th className="text-right px-1">TO</th>
                <th className="text-right px-1">PF</th>
              </tr>
            </thead>
            <tbody>
              {teamStats.map(s => {
                const pts = computePoints(s)
                const reb = computeRebounds(s)
                return (
                  <tr key={s.id} className="border-b border-gray-900 hover:bg-gray-900/50">
                    <td className="py-2 px-2 sticky left-0 bg-gray-950">
                      <span className="text-orange-400 mr-1">#{s.player?.number}</span>
                      {s.player?.name}
                    </td>
                    <td className="text-right px-1 font-bold">{pts}</td>
                    <td className="text-right px-1">{s.fgm}-{s.fga}</td>
                    <td className="text-right px-1 text-gray-400">{pct(s.fgm, s.fga)}</td>
                    <td className="text-right px-1">{s.three_pm}-{s.three_pa}</td>
                    <td className="text-right px-1 text-gray-400">{pct(s.three_pm, s.three_pa)}</td>
                    <td className="text-right px-1">{s.ftm}-{s.fta}</td>
                    <td className="text-right px-1 text-gray-400">{pct(s.ftm, s.fta)}</td>
                    <td className="text-right px-1">{s.oreb}</td>
                    <td className="text-right px-1">{s.dreb}</td>
                    <td className="text-right px-1 font-medium">{reb}</td>
                    <td className="text-right px-1">{s.assists}</td>
                    <td className="text-right px-1">{s.steals}</td>
                    <td className="text-right px-1">{s.blocks}</td>
                    <td className="text-right px-1">{s.turnovers}</td>
                    <td className="text-right px-1">{s.fouls}</td>
                  </tr>
                )
              })}
              <tr className="border-t-2 border-gray-700 font-bold">
                <td className="py-2 px-2 sticky left-0 bg-gray-950">TOTALS</td>
                <td className="text-right px-1">{totals.points}</td>
                <td className="text-right px-1">{totals.fgm}-{totals.fga}</td>
                <td className="text-right px-1 text-gray-400">{pct(totals.fgm, totals.fga)}</td>
                <td className="text-right px-1">{totals.three_pm}-{totals.three_pa}</td>
                <td className="text-right px-1 text-gray-400">{pct(totals.three_pm, totals.three_pa)}</td>
                <td className="text-right px-1">{totals.ftm}-{totals.fta}</td>
                <td className="text-right px-1 text-gray-400">{pct(totals.ftm, totals.fta)}</td>
                <td className="text-right px-1">{totals.oreb}</td>
                <td className="text-right px-1">{totals.dreb}</td>
                <td className="text-right px-1">{totals.oreb + totals.dreb}</td>
                <td className="text-right px-1">{totals.assists}</td>
                <td className="text-right px-1">{totals.steals}</td>
                <td className="text-right px-1">{totals.blocks}</td>
                <td className="text-right px-1">{totals.turnovers}</td>
                <td className="text-right px-1">{totals.fouls}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Link to="/" className="text-gray-400 hover:text-gray-300 text-sm mb-4 inline-block">&larr; Home</Link>

      {/* Score header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 text-right">
            <p className="text-blue-400 font-bold">{game.home_team?.name}</p>
          </div>
          <div className="mx-6 text-center">
            <p className="text-4xl font-bold">
              {game.home_score} - {game.away_score}
            </p>
            <p className={`text-xs mt-1 ${
              game.status === 'in_progress' ? 'text-green-400' : 'text-gray-500'
            }`}>
              {game.status === 'in_progress' ? 'LIVE' : 'FINAL'}
            </p>
          </div>
          <div className="flex-1 text-left">
            <p className="text-red-400 font-bold">{game.away_team?.name}</p>
          </div>
        </div>
        <p className="text-center text-gray-500 text-sm mt-2">
          {game.game_type} &middot; {game.game_date}
        </p>
        {game.status === 'in_progress' && (
          <div className="text-center mt-3">
            <Link
              to={`/game/live/${game.id}`}
              className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Continue Live Scoring
            </Link>
          </div>
        )}
      </div>

      <TeamTable teamStats={homeStats} team={game.home_team!} color="text-blue-400" />
      <TeamTable teamStats={awayStats} team={game.away_team!} color="text-red-400" />
    </div>
  )
}
