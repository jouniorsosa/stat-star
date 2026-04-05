import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSeasonContext } from '../lib/SeasonContext'
import type { Team, Player, PlayerGameStats } from '../types'
import { computePoints, computeRebounds, pct } from '../types'

interface PlayerSeason {
  player: Player; team: Team; games: number
  totals: { points: number; fgm: number; fga: number; three_pm: number; three_pa: number; ftm: number; fta: number; oreb: number; dreb: number; reb: number; assists: number; steals: number; blocks: number; turnovers: number; fouls: number }
}

type SortKey = 'name' | 'games' | 'points' | 'fgm' | 'fga' | 'three_pm' | 'three_pa' | 'ftm' | 'fta' | 'oreb' | 'dreb' | 'reb' | 'assists' | 'steals' | 'blocks' | 'turnovers' | 'fouls'

export default function SeasonStats() {
  const { seasons, selectedSeason, setSelectedSeason } = useSeasonContext()
  const [playerSeasons, setPlayerSeasons] = useState<PlayerSeason[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [filterTeam, setFilterTeam] = useState('')
  const [filterSeasonId, setFilterSeasonId] = useState<string>(selectedSeason?.id ?? '')
  const [sortBy, setSortBy] = useState<SortKey>('points')
  const [sortAsc, setSortAsc] = useState(false)
  const [showAvg, setShowAvg] = useState(true)
  const [loading, setLoading] = useState(true)

  // Sync with context
  useEffect(() => {
    if (selectedSeason && !filterSeasonId) setFilterSeasonId(selectedSeason.id)
  }, [selectedSeason])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: allTeams } = await supabase.from('teams').select('*').order('name')
      const { data: allPlayers } = await supabase.from('players').select('*')
      setTeams(allTeams ?? [])

      // Get game IDs for the selected season (or all games)
      let gameIds: string[] | null = null
      if (filterSeasonId) {
        const { data: sg } = await supabase.from('games').select('id').eq('season_id', filterSeasonId)
        gameIds = (sg ?? []).map(g => g.id)
      }

      // Fetch stats: either filtered by game IDs or all
      let statsData: PlayerGameStats[]
      if (gameIds !== null) {
        if (gameIds.length === 0) { setPlayerSeasons([]); setLoading(false); return }
        const { data } = await supabase.from('player_game_stats').select('*').in('game_id', gameIds)
        statsData = (data ?? []) as PlayerGameStats[]
      } else {
        const { data } = await supabase.from('player_game_stats').select('*')
        statsData = (data ?? []) as PlayerGameStats[]
      }

      const playerMap = new Map((allPlayers ?? []).map(p => [p.id, p]))
      const teamMap = new Map((allTeams ?? []).map(t => [t.id, t]))
      const grouped = new Map<string, PlayerGameStats[]>()
      for (const s of statsData) {
        const existing = grouped.get(s.player_id) ?? []
        existing.push(s)
        grouped.set(s.player_id, existing)
      }
      const result: PlayerSeason[] = []
      for (const [playerId, gameStats] of grouped) {
        const player = playerMap.get(playerId)
        const team = teamMap.get(gameStats[0].team_id)
        if (!player || !team) continue
        const totals = gameStats.reduce(
          (acc, s) => ({
            points: acc.points + computePoints(s), fgm: acc.fgm + s.fgm, fga: acc.fga + s.fga,
            three_pm: acc.three_pm + s.three_pm, three_pa: acc.three_pa + s.three_pa,
            ftm: acc.ftm + s.ftm, fta: acc.fta + s.fta, oreb: acc.oreb + s.oreb, dreb: acc.dreb + s.dreb,
            reb: acc.reb + computeRebounds(s), assists: acc.assists + s.assists, steals: acc.steals + s.steals,
            blocks: acc.blocks + s.blocks, turnovers: acc.turnovers + s.turnovers, fouls: acc.fouls + s.fouls,
          }),
          { points: 0, fgm: 0, fga: 0, three_pm: 0, three_pa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, reb: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0 }
        )
        result.push({ player, team, games: gameStats.length, totals })
      }
      setPlayerSeasons(result)
      setLoading(false)
    }
    load()
  }, [filterSeasonId])

  function handleSeasonChange(id: string) {
    setFilterSeasonId(id)
    const s = seasons.find(x => x.id === id) ?? null
    setSelectedSeason(s)
  }

  function handleSort(key: SortKey) {
    if (sortBy === key) setSortAsc(!sortAsc)
    else { setSortBy(key); setSortAsc(false) }
  }

  const filtered = filterTeam ? playerSeasons.filter(s => s.team.id === filterTeam) : playerSeasons
  const sorted = [...filtered].sort((a, b) => {
    const dir = sortAsc ? 1 : -1
    if (sortBy === 'name') return dir * a.player.name.localeCompare(b.player.name)
    if (sortBy === 'games') return dir * (a.games - b.games)
    return dir * ((a.totals[sortBy as keyof typeof a.totals] ?? 0) - (b.totals[sortBy as keyof typeof b.totals] ?? 0))
  })

  function avg(val: number, games: number): string {
    return games === 0 ? '0.0' : (val / games).toFixed(1)
  }

  function SH({ label, sk }: { label: string; sk: SortKey }) {
    return (
      <th onClick={() => handleSort(sk)} className={`text-right px-2 py-3 cursor-pointer hover:text-orange-400 transition-colors select-none text-xs uppercase tracking-wider ${sortBy === sk ? 'text-orange-400' : 'text-gray-500'}`}>
        {label}{sortBy === sk ? (sortAsc ? ' \u25B2' : ' \u25BC') : ''}
      </th>
    )
  }

  const seasonLabel = filterSeasonId ? seasons.find(s => s.id === filterSeasonId)?.name : 'All Seasons'

  return (
    <div>
      <h1 className="text-3xl font-black mb-2">Stats</h1>
      <p className="text-gray-500 mb-8">Player leaderboards{seasonLabel ? ` \u2014 ${seasonLabel}` : ''}</p>

      <div className="flex flex-wrap gap-3 mb-6">
        <select value={filterSeasonId} onChange={e => handleSeasonChange(e.target.value)}
          className="bg-[#12121c] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500/50 text-sm">
          <option value="">All Seasons</option>
          {seasons.map(s => <option key={s.id} value={s.id}>{s.name}{s.active ? ' (Active)' : ''}</option>)}
        </select>
        <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)}
          className="bg-[#12121c] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500/50 text-sm">
          <option value="">All Teams</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button onClick={() => setShowAvg(!showAvg)}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${showAvg ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-500/10' : 'bg-[#12121c] text-gray-500 border border-white/5'}`}>
          {showAvg ? 'Per Game Avg' : 'Season Totals'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-600">Loading stats...</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 bg-[#12121c] border border-white/5 rounded-2xl">
          <p className="text-gray-500 text-lg mb-2">No stats yet</p>
          <p className="text-gray-600 text-sm">Play some games first!</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-[#12121c] border border-white/5 rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th onClick={() => handleSort('name')} className={`text-left py-3 px-3 sticky left-0 bg-[#12121c] min-w-[150px] cursor-pointer hover:text-orange-400 text-xs uppercase tracking-wider ${sortBy === 'name' ? 'text-orange-400' : 'text-gray-500'}`}>
                  Player{sortBy === 'name' ? (sortAsc ? ' \u25B2' : ' \u25BC') : ''}
                </th>
                <th className="text-left px-2 py-3 text-gray-500 text-xs uppercase tracking-wider">Team</th>
                <SH label="GP" sk="games" /><SH label="PTS" sk="points" />
                <SH label="FGM" sk="fgm" /><SH label="FGA" sk="fga" />
                <th className="text-right px-2 py-3 text-gray-500 text-xs">FG%</th>
                <SH label="3PM" sk="three_pm" /><SH label="3PA" sk="three_pa" />
                <th className="text-right px-2 py-3 text-gray-500 text-xs">3P%</th>
                <SH label="FTM" sk="ftm" /><SH label="FTA" sk="fta" />
                <th className="text-right px-2 py-3 text-gray-500 text-xs">FT%</th>
                <SH label="OREB" sk="oreb" /><SH label="DREB" sk="dreb" />
                <SH label="REB" sk="reb" /><SH label="AST" sk="assists" />
                <SH label="STL" sk="steals" /><SH label="BLK" sk="blocks" />
                <SH label="TO" sk="turnovers" /><SH label="PF" sk="fouls" />
              </tr>
            </thead>
            <tbody>
              {sorted.map(s => {
                const t = s.totals; const g = s.games
                const v = (val: number) => showAvg ? avg(val, g) : val
                return (
                  <tr key={s.player.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-3 sticky left-0 bg-[#12121c]">
                      <Link to={`/players/${s.player.id}/shots`} className="hover:text-orange-400 transition-colors">
                        <span className="text-orange-400 font-bold mr-1.5">{s.player.number}</span>
                        <span className="font-medium">{s.player.name}</span>
                      </Link>
                    </td>
                    <td className="px-2 text-gray-500 text-xs">{s.team.name}</td>
                    <td className="text-right px-2">{g}</td>
                    <td className="text-right px-2 font-black">{v(t.points)}</td>
                    <td className="text-right px-2">{v(t.fgm)}</td>
                    <td className="text-right px-2">{v(t.fga)}</td>
                    <td className="text-right px-2 text-gray-500">{pct(t.fgm, t.fga)}</td>
                    <td className="text-right px-2">{v(t.three_pm)}</td>
                    <td className="text-right px-2">{v(t.three_pa)}</td>
                    <td className="text-right px-2 text-gray-500">{pct(t.three_pm, t.three_pa)}</td>
                    <td className="text-right px-2">{v(t.ftm)}</td>
                    <td className="text-right px-2">{v(t.fta)}</td>
                    <td className="text-right px-2 text-gray-500">{pct(t.ftm, t.fta)}</td>
                    <td className="text-right px-2">{v(t.oreb)}</td>
                    <td className="text-right px-2">{v(t.dreb)}</td>
                    <td className="text-right px-2 font-semibold">{v(t.reb)}</td>
                    <td className="text-right px-2">{v(t.assists)}</td>
                    <td className="text-right px-2">{v(t.steals)}</td>
                    <td className="text-right px-2">{v(t.blocks)}</td>
                    <td className="text-right px-2">{v(t.turnovers)}</td>
                    <td className="text-right px-2">{v(t.fouls)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
