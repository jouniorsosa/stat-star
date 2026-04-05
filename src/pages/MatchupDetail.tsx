import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSeasonContext } from '../lib/SeasonContext'
import type { ScheduleEntry, Team, Player, Game, PlayerGameStats, ShotLocation } from '../types'
import { computePoints, computeRebounds, pct } from '../types'
import ShotChartDisplay from '../components/ShotChartDisplay'
import PlayerNotesPanel from '../components/PlayerNotesPanel'

interface PlayerAvg {
  player: Player
  games: number
  ppg: string; rpg: string; apg: string; spg: string; bpg: string; topg: string
  fgPct: string; threePct: string
}

export default function MatchupDetail() {
  const { scheduleId } = useParams<{ scheduleId: string }>()
  const { selectedSeason } = useSeasonContext()
  const [entry, setEntry] = useState<(ScheduleEntry & { home_team: Team; away_team: Team }) | null>(null)
  const [h2hGames, setH2hGames] = useState<(Game & { home_team: Team; away_team: Team })[]>([])
  const [homeRoster, setHomeRoster] = useState<Player[]>([])
  const [awayRoster, setAwayRoster] = useState<Player[]>([])
  const [homeAvgs, setHomeAvgs] = useState<PlayerAvg[]>([])
  const [awayAvgs, setAwayAvgs] = useState<PlayerAvg[]>([])
  const [h2hShots, setH2hShots] = useState<ShotLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [notesExpanded, setNotesExpanded] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      // 1. Fetch schedule entry
      const { data: e } = await supabase
        .from('schedule')
        .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)')
        .eq('id', scheduleId!)
        .single()
      if (!e) { setLoading(false); return }
      const sched = e as typeof entry
      setEntry(sched)
      if (!sched) return

      const homeId = sched.home_team_id
      const awayId = sched.away_team_id

      // 2. Fetch rosters
      const [{ data: hRoster }, { data: aRoster }] = await Promise.all([
        supabase.from('players').select('*').eq('team_id', homeId).order('number'),
        supabase.from('players').select('*').eq('team_id', awayId).order('number'),
      ])
      setHomeRoster(hRoster ?? [])
      setAwayRoster(aRoster ?? [])

      // 3. Fetch h2h games
      const { data: h2h } = await supabase
        .from('games')
        .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)')
        .eq('status', 'final')
        .or(`and(home_team_id.eq.${homeId},away_team_id.eq.${awayId}),and(home_team_id.eq.${awayId},away_team_id.eq.${homeId})`)
        .order('game_date', { ascending: false })
      setH2hGames((h2h ?? []) as typeof h2hGames)

      // 4. Fetch season stats for both teams (for averages)
      let seasonGameIds: string[] = []
      if (selectedSeason) {
        const { data: sg } = await supabase.from('games').select('id').eq('season_id', selectedSeason.id).eq('status', 'final')
        seasonGameIds = (sg ?? []).map(g => g.id)
      } else {
        const { data: sg } = await supabase.from('games').select('id').eq('status', 'final')
        seasonGameIds = (sg ?? []).map(g => g.id)
      }

      if (seasonGameIds.length > 0) {
        const { data: allStats } = await supabase.from('player_game_stats').select('*').in('game_id', seasonGameIds)
        const stats = (allStats ?? []) as PlayerGameStats[]

        function calcAvgs(roster: Player[], teamId: string): PlayerAvg[] {
          return roster.map(p => {
            const pStats = stats.filter(s => s.player_id === p.id && s.team_id === teamId)
            const g = pStats.length
            if (g === 0) return { player: p, games: 0, ppg: '0.0', rpg: '0.0', apg: '0.0', spg: '0.0', bpg: '0.0', topg: '0.0', fgPct: '.000', threePct: '.000' }
            const tot = pStats.reduce((a, s) => ({
              pts: a.pts + computePoints(s), reb: a.reb + computeRebounds(s),
              ast: a.ast + s.assists, stl: a.stl + s.steals, blk: a.blk + s.blocks, to: a.to + s.turnovers,
              fgm: a.fgm + s.fgm, fga: a.fga + s.fga, tpm: a.tpm + s.three_pm, tpa: a.tpa + s.three_pa,
            }), { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, to: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0 })
            return {
              player: p, games: g,
              ppg: (tot.pts / g).toFixed(1), rpg: (tot.reb / g).toFixed(1), apg: (tot.ast / g).toFixed(1),
              spg: (tot.stl / g).toFixed(1), bpg: (tot.blk / g).toFixed(1), topg: (tot.to / g).toFixed(1),
              fgPct: pct(tot.fgm, tot.fga), threePct: pct(tot.tpm, tot.tpa),
            }
          }).sort((a, b) => parseFloat(b.ppg) - parseFloat(a.ppg))
        }

        setHomeAvgs(calcAvgs(hRoster ?? [], homeId))
        setAwayAvgs(calcAvgs(aRoster ?? [], awayId))
      }

      // 5. H2H shot charts
      const h2hIds = (h2h ?? []).map(g => g.id)
      if (h2hIds.length > 0) {
        const { data: shots } = await supabase.from('shot_locations').select('*').in('game_id', h2hIds)
        setH2hShots((shots ?? []) as ShotLocation[])
      }

      setLoading(false)
    }
    load()
  }, [scheduleId, selectedSeason])

  if (loading) return <div className="text-center py-12 text-gray-600">Loading scouting report...</div>
  if (!entry) return <div className="text-center py-12 text-gray-500">Matchup not found</div>

  // H2H record
  const homeWins = h2hGames.filter(g =>
    (g.home_team_id === entry.home_team_id && g.home_score > g.away_score) ||
    (g.away_team_id === entry.home_team_id && g.away_score > g.home_score)
  ).length
  const awayWins = h2hGames.length - homeWins

  const awayPlayerIds = awayRoster.map(p => p.id)
  const homePlayerIds = homeRoster.map(p => p.id)
  const awayH2hShots = h2hShots.filter(s => awayPlayerIds.includes(s.player_id))
  const homeH2hShots = h2hShots.filter(s => homePlayerIds.includes(s.player_id))

  function RosterTable({ avgs, color, teamName }: { avgs: PlayerAvg[]; color: string; teamName: string }) {
    return (
      <div className="mb-6">
        <h3 className={`font-black text-sm mb-3 ${color}`}>{teamName} — Season Averages</h3>
        {avgs.length === 0 ? (
          <p className="text-gray-600 text-sm">No roster data</p>
        ) : (
          <div className="overflow-x-auto bg-[#12121c] border border-white/5 rounded-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-white/5 text-xs uppercase tracking-wider">
                  <th className="text-left py-2.5 px-3 sticky left-0 bg-[#12121c]">Player</th>
                  <th className="text-right px-2">GP</th>
                  <th className="text-right px-2">PPG</th>
                  <th className="text-right px-2">RPG</th>
                  <th className="text-right px-2">APG</th>
                  <th className="text-right px-2">SPG</th>
                  <th className="text-right px-2">BPG</th>
                  <th className="text-right px-2">FG%</th>
                  <th className="text-right px-2">3P%</th>
                  <th className="text-center px-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {avgs.map(a => (
                  <>
                    <tr key={a.player.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-3 sticky left-0 bg-[#12121c]">
                        <Link to={`/players/${a.player.id}/shots`} className="hover:text-orange-400 transition-colors">
                          <span className="text-orange-400 font-bold mr-1">{a.player.number}</span>
                          {a.player.name}
                        </Link>
                      </td>
                      <td className="text-right px-2">{a.games}</td>
                      <td className="text-right px-2 font-bold">{a.ppg}</td>
                      <td className="text-right px-2">{a.rpg}</td>
                      <td className="text-right px-2">{a.apg}</td>
                      <td className="text-right px-2">{a.spg}</td>
                      <td className="text-right px-2">{a.bpg}</td>
                      <td className="text-right px-2 text-gray-400">{a.fgPct}</td>
                      <td className="text-right px-2 text-gray-400">{a.threePct}</td>
                      <td className="text-center px-2">
                        <button onClick={() => setNotesExpanded(notesExpanded === a.player.id ? null : a.player.id)}
                          className={`text-xs px-2 py-1 rounded-lg transition-colors ${notesExpanded === a.player.id ? 'bg-orange-500/20 text-orange-400' : 'text-gray-600 hover:text-gray-400 hover:bg-white/5'}`}>
                          Scout
                        </button>
                      </td>
                    </tr>
                    {notesExpanded === a.player.id && (
                      <tr key={`notes-${a.player.id}`}>
                        <td colSpan={10} className="p-3 bg-[#0a0a0f]">
                          <PlayerNotesPanel playerId={a.player.id} playerName={a.player.name} compact />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <Link to="/schedule" className="text-gray-500 hover:text-gray-300 text-sm mb-6 inline-flex items-center gap-1 transition-colors">&larr; Schedule</Link>

      {/* Matchup Header */}
      <div className="bg-gradient-to-br from-[#12121c] to-[#0f0f1a] border border-white/5 rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 text-right">
            <p className="text-blue-400 font-black text-xl">{entry.home_team?.name}</p>
          </div>
          <div className="mx-6 text-center">
            <p className="text-gray-600 text-2xl font-black">VS</p>
          </div>
          <div className="flex-1 text-left">
            <p className="text-red-400 font-black text-xl">{entry.away_team?.name}</p>
          </div>
        </div>
        <div className="text-center text-gray-500 text-sm">
          {entry.game_date}{entry.game_time ? ` at ${entry.game_time}` : ''}
          {entry.location ? ` \u2022 ${entry.location}` : ''}
        </div>
        {entry.notes && <p className="text-center text-gray-600 text-xs mt-2">{entry.notes}</p>}
        {!entry.game_id && (
          <div className="text-center mt-4">
            <Link
              to={`/game/new?home=${entry.home_team_id}&away=${entry.away_team_id}&schedule=${entry.id}`}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-xl font-bold transition-all hover:shadow-lg hover:shadow-green-500/20 text-lg"
            >
              Start Game
            </Link>
          </div>
        )}
        {entry.game_id && (
          <div className="text-center mt-4">
            <Link to={`/game/${entry.game_id}`}
              className="text-orange-400 hover:text-orange-300 font-medium">View Box Score</Link>
          </div>
        )}
      </div>

      {/* H2H Record */}
      {h2hGames.length > 0 && (
        <div className="bg-[#12121c] border border-white/5 rounded-2xl p-5 mb-8">
          <h2 className="font-black text-sm uppercase tracking-wider text-gray-400 mb-3">Head-to-Head Record</h2>
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-blue-400 font-black text-3xl">{homeWins}</p>
              <p className="text-gray-500 text-xs">{entry.home_team?.name}</p>
            </div>
            <span className="text-gray-600 text-lg">-</span>
            <div className="text-center">
              <p className="text-red-400 font-black text-3xl">{awayWins}</p>
              <p className="text-gray-500 text-xs">{entry.away_team?.name}</p>
            </div>
          </div>
          <p className="text-center text-gray-600 text-xs mt-2">{h2hGames.length} game{h2hGames.length > 1 ? 's' : ''} played</p>
        </div>
      )}

      {/* Previous Games */}
      {h2hGames.length > 0 && (
        <div className="mb-8">
          <h2 className="font-black text-sm uppercase tracking-wider text-gray-400 mb-3">Previous Matchups</h2>
          <div className="space-y-2">
            {h2hGames.map(g => (
              <Link key={g.id} to={`/game/${g.id}`}
                className="block bg-[#12121c] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{g.home_team?.name}</span>
                  <span className="font-black text-lg mx-3">{g.home_score} - {g.away_score}</span>
                  <span className="font-medium">{g.away_team?.name}</span>
                </div>
                <p className="text-gray-600 text-xs text-center mt-1">{g.game_date}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Rosters with Season Averages */}
      <h2 className="text-xl font-black mb-4 flex items-center gap-2">
        <span className="w-1 h-6 bg-orange-500 rounded-full" />
        Scouting Report
      </h2>

      <RosterTable avgs={awayAvgs} color="text-red-400" teamName={entry.away_team?.name ?? 'Away'} />
      <RosterTable avgs={homeAvgs} color="text-blue-400" teamName={entry.home_team?.name ?? 'Home'} />

      {/* H2H Shot Charts */}
      {(homeH2hShots.length > 0 || awayH2hShots.length > 0) && (
        <>
          <h2 className="text-xl font-black mb-4 mt-8 flex items-center gap-2">
            <span className="w-1 h-6 bg-orange-500 rounded-full" />
            Shot Charts (Head-to-Head Games)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {homeH2hShots.length > 0 && (
              <ShotChartDisplay shots={homeH2hShots} players={homeRoster} title={`${entry.home_team?.name} H2H Shots`} />
            )}
            {awayH2hShots.length > 0 && (
              <ShotChartDisplay shots={awayH2hShots} players={awayRoster} title={`${entry.away_team?.name} H2H Shots`} />
            )}
          </div>
        </>
      )}
    </div>
  )
}
