import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Game, Team, Player, PlayerGameStats, ShotLocation } from '../types'
import { computePoints, computeRebounds, pct } from '../types'
import ShotChartDisplay from '../components/ShotChartDisplay'
import PlayerNotesPanel from '../components/PlayerNotesPanel'

interface FullStats extends PlayerGameStats {
  player: Player
}

export default function BoxScore() {
  const { gameId } = useParams<{ gameId: string }>()
  const [game, setGame] = useState<(Game & { home_team: Team; away_team: Team }) | null>(null)
  const [stats, setStats] = useState<FullStats[]>([])
  const [shots, setShots] = useState<ShotLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [notesPlayer, setNotesPlayer] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('games').select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)').eq('id', gameId!).single(),
      supabase.from('player_game_stats').select('*, player:players(*)').eq('game_id', gameId!),
      supabase.from('shot_locations').select('*').eq('game_id', gameId!),
    ]).then(([{ data: g }, { data: s }, { data: sh }]) => {
      setGame(g as typeof game)
      setStats((s ?? []) as FullStats[])
      setShots((sh ?? []) as ShotLocation[])
      setLoading(false)
    })
  }, [gameId])

  if (loading) return <div className="text-center py-12 text-gray-600">Loading...</div>
  if (!game) return <div className="text-center py-12 text-gray-500">Game not found</div>

  const homeStats = stats.filter(s => s.team_id === game.home_team_id)
  const awayStats = stats.filter(s => s.team_id === game.away_team_id)
  const homeShots = shots.filter(s => homeStats.some(hs => hs.player_id === s.player_id))
  const awayShots = shots.filter(s => awayStats.some(as => as.player_id === s.player_id))
  const homePlayers = homeStats.map(s => s.player!).filter(Boolean)
  const awayPlayers = awayStats.map(s => s.player!).filter(Boolean)

  function TeamTable({ teamStats, team, color }: { teamStats: FullStats[]; team: Team; color: string }) {
    const totals = teamStats.reduce(
      (acc, s) => ({
        fgm: acc.fgm + s.fgm, fga: acc.fga + s.fga, three_pm: acc.three_pm + s.three_pm,
        three_pa: acc.three_pa + s.three_pa, ftm: acc.ftm + s.ftm, fta: acc.fta + s.fta,
        oreb: acc.oreb + s.oreb, dreb: acc.dreb + s.dreb, assists: acc.assists + s.assists,
        steals: acc.steals + s.steals, blocks: acc.blocks + s.blocks, turnovers: acc.turnovers + s.turnovers,
        fouls: acc.fouls + s.fouls, points: acc.points + computePoints(s),
      }),
      { fgm: 0, fga: 0, three_pm: 0, three_pa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0, points: 0 }
    )

    return (
      <div className="mb-8">
        <h2 className={`font-black text-lg mb-4 ${color}`}>{team.name}</h2>
        <div className="overflow-x-auto bg-[#12121c] border border-white/5 rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-white/5 text-xs uppercase tracking-wider">
                <th className="text-left py-3 px-3 sticky left-0 bg-[#12121c] min-w-[130px]">Player</th>
                <th className="text-right px-2">PTS</th>
                <th className="text-right px-2">FG</th>
                <th className="text-right px-2">FG%</th>
                <th className="text-right px-2">3P</th>
                <th className="text-right px-2">3P%</th>
                <th className="text-right px-2">FT</th>
                <th className="text-right px-2">FT%</th>
                <th className="text-right px-2">OREB</th>
                <th className="text-right px-2">DREB</th>
                <th className="text-right px-2">REB</th>
                <th className="text-right px-2">AST</th>
                <th className="text-right px-2">STL</th>
                <th className="text-right px-2">BLK</th>
                <th className="text-right px-2">TO</th>
                <th className="text-right px-2">PF</th>
                <th className="text-center px-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {teamStats.map(s => (
                <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-2.5 px-3 sticky left-0 bg-[#12121c]">
                    <Link to={`/players/${s.player_id}/shots`} className="hover:text-orange-400 transition-colors">
                      <span className="text-orange-400 font-bold mr-1.5">{s.player?.number}</span>
                      <span className="font-medium">{s.player?.name}</span>
                    </Link>
                  </td>
                  <td className="text-right px-2 font-black">{computePoints(s)}</td>
                  <td className="text-right px-2">{s.fgm}-{s.fga}</td>
                  <td className="text-right px-2 text-gray-500">{pct(s.fgm, s.fga)}</td>
                  <td className="text-right px-2">{s.three_pm}-{s.three_pa}</td>
                  <td className="text-right px-2 text-gray-500">{pct(s.three_pm, s.three_pa)}</td>
                  <td className="text-right px-2">{s.ftm}-{s.fta}</td>
                  <td className="text-right px-2 text-gray-500">{pct(s.ftm, s.fta)}</td>
                  <td className="text-right px-2">{s.oreb}</td>
                  <td className="text-right px-2">{s.dreb}</td>
                  <td className="text-right px-2 font-semibold">{computeRebounds(s)}</td>
                  <td className="text-right px-2">{s.assists}</td>
                  <td className="text-right px-2">{s.steals}</td>
                  <td className="text-right px-2">{s.blocks}</td>
                  <td className="text-right px-2">{s.turnovers}</td>
                  <td className="text-right px-2">{s.fouls}</td>
                  <td className="text-center px-2">
                    <button
                      onClick={() => setNotesPlayer(notesPlayer === s.player_id ? null : s.player_id)}
                      className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                        notesPlayer === s.player_id ? 'bg-orange-500/20 text-orange-400' : 'text-gray-600 hover:text-gray-400 hover:bg-white/5'
                      }`}
                    >
                      Scout
                    </button>
                  </td>
                </tr>
              ))}
              {notesPlayer && teamStats.some(s => s.player_id === notesPlayer) && (
                <tr>
                  <td colSpan={17} className="p-3 bg-[#0a0a0f]">
                    <PlayerNotesPanel
                      playerId={notesPlayer}
                      playerName={teamStats.find(s => s.player_id === notesPlayer)?.player?.name}
                      compact
                    />
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-white/10 font-black">
                <td className="py-3 px-3 sticky left-0 bg-[#12121c]">TOTALS</td>
                <td className="text-right px-2">{totals.points}</td>
                <td className="text-right px-2">{totals.fgm}-{totals.fga}</td>
                <td className="text-right px-2 text-gray-500">{pct(totals.fgm, totals.fga)}</td>
                <td className="text-right px-2">{totals.three_pm}-{totals.three_pa}</td>
                <td className="text-right px-2 text-gray-500">{pct(totals.three_pm, totals.three_pa)}</td>
                <td className="text-right px-2">{totals.ftm}-{totals.fta}</td>
                <td className="text-right px-2 text-gray-500">{pct(totals.ftm, totals.fta)}</td>
                <td className="text-right px-2">{totals.oreb}</td>
                <td className="text-right px-2">{totals.dreb}</td>
                <td className="text-right px-2">{totals.oreb + totals.dreb}</td>
                <td className="text-right px-2">{totals.assists}</td>
                <td className="text-right px-2">{totals.steals}</td>
                <td className="text-right px-2">{totals.blocks}</td>
                <td className="text-right px-2">{totals.turnovers}</td>
                <td className="text-right px-2">{totals.fouls}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Link to="/" className="text-gray-500 hover:text-gray-300 text-sm mb-6 inline-flex items-center gap-1 transition-colors">&larr; Home</Link>

      <div className="bg-gradient-to-br from-[#12121c] to-[#0f0f1a] border border-white/5 rounded-2xl p-8 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex-1 text-right">
            <p className="text-blue-400 font-bold uppercase tracking-wider text-sm">{game.home_team?.name}</p>
            <p className={`text-5xl font-black ${game.home_score >= game.away_score ? 'text-white' : 'text-gray-500'}`}>{game.home_score}</p>
          </div>
          <div className="mx-8 text-center">
            {game.status === 'in_progress' ? (
              <span className="inline-flex items-center gap-1.5 text-green-400 text-xs font-black">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />LIVE
              </span>
            ) : (
              <span className="text-gray-600 text-xs font-bold">FINAL</span>
            )}
          </div>
          <div className="flex-1 text-left">
            <p className="text-red-400 font-bold uppercase tracking-wider text-sm">{game.away_team?.name}</p>
            <p className={`text-5xl font-black ${game.away_score >= game.home_score ? 'text-white' : 'text-gray-500'}`}>{game.away_score}</p>
          </div>
        </div>
        <p className="text-center text-gray-600 text-sm mt-4">{game.game_type} &middot; {game.game_date}</p>
        {game.status === 'in_progress' && (
          <div className="text-center mt-4">
            <Link to={`/game/live/${game.id}`}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:shadow-lg hover:shadow-green-500/20">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />Continue Scoring
            </Link>
          </div>
        )}
      </div>

      <TeamTable teamStats={homeStats} team={game.home_team!} color="text-blue-400" />
      <TeamTable teamStats={awayStats} team={game.away_team!} color="text-red-400" />

      {/* Shot Charts */}
      {shots.length > 0 && (
        <>
          <h2 className="text-xl font-black mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-orange-500 rounded-full" />
            Shot Charts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {homeShots.length > 0 && (
              <ShotChartDisplay shots={homeShots} players={homePlayers} title={`${game.home_team?.name} Shots`} />
            )}
            {awayShots.length > 0 && (
              <ShotChartDisplay shots={awayShots} players={awayPlayers} title={`${game.away_team?.name} Shots`} />
            )}
          </div>
        </>
      )}
    </div>
  )
}
