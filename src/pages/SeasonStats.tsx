import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Team, Player, PlayerGameStats } from '../types'
import { computePoints, computeRebounds, pct } from '../types'

interface PlayerSeason {
  player: Player
  team: Team
  games: number
  totals: {
    points: number; fgm: number; fga: number; three_pm: number; three_pa: number
    ftm: number; fta: number; oreb: number; dreb: number; reb: number
    assists: number; steals: number; blocks: number; turnovers: number; fouls: number
  }
}

type SortKey = 'name' | 'games' | 'points' | 'fgm' | 'fga' | 'three_pm' | 'three_pa' | 'ftm' | 'fta' | 'oreb' | 'dreb' | 'reb' | 'assists' | 'steals' | 'blocks' | 'turnovers' | 'fouls'

export default function SeasonStats() {
  const [playerSeasons, setPlayerSeasons] = useState<PlayerSeason[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [filterTeam, setFilterTeam] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('points')
  const [sortAsc, setSortAsc] = useState(false)
  const [showAvg, setShowAvg] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: allStats }, { data: allTeams }, { data: allPlayers }] = await Promise.all([
        supabase.from('player_game_stats').select('*'),
        supabase.from('teams').select('*').order('name'),
        supabase.from('players').select('*'),
      ])

      setTeams(allTeams ?? [])

      const playerMap = new Map((allPlayers ?? []).map(p => [p.id, p]))
      const teamMap = new Map((allTeams ?? []).map(t => [t.id, t]))

      // Group stats by player
      const grouped = new Map<string, PlayerGameStats[]>()
      for (const s of (allStats ?? []) as PlayerGameStats[]) {
        const existing = grouped.get(s.player_id) ?? []
        existing.push(s)
        grouped.set(s.player_id, existing)
      }

      const seasons: PlayerSeason[] = []
      for (const [playerId, gameStats] of grouped) {
        const player = playerMap.get(playerId)
        const team = teamMap.get(gameStats[0].team_id)
        if (!player || !team) continue

        const totals = gameStats.reduce(
          (acc, s) => ({
            points: acc.points + computePoints(s),
            fgm: acc.fgm + s.fgm,
            fga: acc.fga + s.fga,
            three_pm: acc.three_pm + s.three_pm,
            three_pa: acc.three_pa + s.three_pa,
            ftm: acc.ftm + s.ftm,
            fta: acc.fta + s.fta,
            oreb: acc.oreb + s.oreb,
            dreb: acc.dreb + s.dreb,
            reb: acc.reb + computeRebounds(s),
            assists: acc.assists + s.assists,
            steals: acc.steals + s.steals,
            blocks: acc.blocks + s.blocks,
            turnovers: acc.turnovers + s.turnovers,
            fouls: acc.fouls + s.fouls,
          }),
          { points: 0, fgm: 0, fga: 0, three_pm: 0, three_pa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, reb: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0 }
        )

        seasons.push({ player, team, games: gameStats.length, totals })
      }

      setPlayerSeasons(seasons)
      setLoading(false)
    }
    load()
  }, [])

  function handleSort(key: SortKey) {
    if (sortBy === key) setSortAsc(!sortAsc)
    else { setSortBy(key); setSortAsc(false) }
  }

  const filtered = filterTeam
    ? playerSeasons.filter(s => s.team.id === filterTeam)
    : playerSeasons

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortAsc ? 1 : -1
    if (sortBy === 'name') return dir * a.player.name.localeCompare(b.player.name)
    if (sortBy === 'games') return dir * (a.games - b.games)
    const aVal = a.totals[sortBy as keyof typeof a.totals] ?? 0
    const bVal = b.totals[sortBy as keyof typeof b.totals] ?? 0
    return dir * (aVal - bVal)
  })

  function avg(val: number, games: number): string {
    if (games === 0) return '0.0'
    return (val / games).toFixed(1)
  }

  function SortHeader({ label, sortKey, className = '' }: { label: string; sortKey: SortKey; className?: string }) {
    return (
      <th
        onClick={() => handleSort(sortKey)}
        className={`text-right px-1 py-2 cursor-pointer hover:text-orange-400 transition-colors select-none ${
          sortBy === sortKey ? 'text-orange-400' : 'text-gray-400'
        } ${className}`}
      >
        {label}{sortBy === sortKey ? (sortAsc ? ' ▲' : ' ▼') : ''}
      </th>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Season Stats</h1>

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterTeam}
          onChange={e => setFilterTeam(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
        >
          <option value="">All Teams</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <button
          onClick={() => setShowAvg(!showAvg)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            showAvg ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'
          }`}
        >
          {showAvg ? 'Per Game Avg' : 'Season Totals'}
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : sorted.length === 0 ? (
        <p className="text-gray-500">No stats yet. Play some games first!</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th
                  onClick={() => handleSort('name')}
                  className={`text-left py-2 px-2 sticky left-0 bg-gray-950 min-w-[140px] cursor-pointer hover:text-orange-400 ${
                    sortBy === 'name' ? 'text-orange-400' : 'text-gray-400'
                  }`}
                >
                  Player{sortBy === 'name' ? (sortAsc ? ' ▲' : ' ▼') : ''}
                </th>
                <th className="text-left px-1 py-2 text-gray-400">Team</th>
                <SortHeader label="GP" sortKey="games" />
                <SortHeader label="PTS" sortKey="points" />
                <SortHeader label="FGM" sortKey="fgm" />
                <SortHeader label="FGA" sortKey="fga" />
                <th className="text-right px-1 py-2 text-gray-400">FG%</th>
                <SortHeader label="3PM" sortKey="three_pm" />
                <SortHeader label="3PA" sortKey="three_pa" />
                <th className="text-right px-1 py-2 text-gray-400">3P%</th>
                <SortHeader label="FTM" sortKey="ftm" />
                <SortHeader label="FTA" sortKey="fta" />
                <th className="text-right px-1 py-2 text-gray-400">FT%</th>
                <SortHeader label="OREB" sortKey="oreb" />
                <SortHeader label="DREB" sortKey="dreb" />
                <SortHeader label="REB" sortKey="reb" />
                <SortHeader label="AST" sortKey="assists" />
                <SortHeader label="STL" sortKey="steals" />
                <SortHeader label="BLK" sortKey="blocks" />
                <SortHeader label="TO" sortKey="turnovers" />
                <SortHeader label="PF" sortKey="fouls" />
              </tr>
            </thead>
            <tbody>
              {sorted.map(s => {
                const t = s.totals
                const g = s.games
                const v = (val: number) => showAvg ? avg(val, g) : val
                return (
                  <tr key={s.player.id} className="border-b border-gray-900 hover:bg-gray-900/50">
                    <td className="py-2 px-2 sticky left-0 bg-gray-950">
                      <span className="text-orange-400 mr-1">#{s.player.number}</span>
                      {s.player.name}
                    </td>
                    <td className="px-1 text-gray-400 text-xs">{s.team.name}</td>
                    <td className="text-right px-1">{g}</td>
                    <td className="text-right px-1 font-bold">{v(t.points)}</td>
                    <td className="text-right px-1">{v(t.fgm)}</td>
                    <td className="text-right px-1">{v(t.fga)}</td>
                    <td className="text-right px-1 text-gray-400">{pct(t.fgm, t.fga)}</td>
                    <td className="text-right px-1">{v(t.three_pm)}</td>
                    <td className="text-right px-1">{v(t.three_pa)}</td>
                    <td className="text-right px-1 text-gray-400">{pct(t.three_pm, t.three_pa)}</td>
                    <td className="text-right px-1">{v(t.ftm)}</td>
                    <td className="text-right px-1">{v(t.fta)}</td>
                    <td className="text-right px-1 text-gray-400">{pct(t.ftm, t.fta)}</td>
                    <td className="text-right px-1">{v(t.oreb)}</td>
                    <td className="text-right px-1">{v(t.dreb)}</td>
                    <td className="text-right px-1 font-medium">{v(t.reb)}</td>
                    <td className="text-right px-1">{v(t.assists)}</td>
                    <td className="text-right px-1">{v(t.steals)}</td>
                    <td className="text-right px-1">{v(t.blocks)}</td>
                    <td className="text-right px-1">{v(t.turnovers)}</td>
                    <td className="text-right px-1">{v(t.fouls)}</td>
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
