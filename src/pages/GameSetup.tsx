import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSeasonContext } from '../lib/SeasonContext'
import type { Team, Player } from '../types'

export default function GameSetup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { activeSeason } = useSeasonContext()
  const [teams, setTeams] = useState<Team[]>([])
  const [homeTeamId, setHomeTeamId] = useState(searchParams.get('home') ?? '')
  const [awayTeamId, setAwayTeamId] = useState(searchParams.get('away') ?? '')
  const scheduleId = searchParams.get('schedule')
  const [gameType, setGameType] = useState<'4v4' | '5v5'>('5v5')
  const [gameDate, setGameDate] = useState(new Date().toISOString().slice(0, 10))
  const [homePlayers, setHomePlayers] = useState<Player[]>([])
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([])
  const [selectedHome, setSelectedHome] = useState<Set<string>>(new Set())
  const [selectedAway, setSelectedAway] = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase.from('teams').select('*').order('name').then(({ data }) => setTeams(data ?? []))
  }, [])

  useEffect(() => {
    if (homeTeamId) {
      supabase.from('players').select('*').eq('team_id', homeTeamId).order('number')
        .then(({ data }) => { setHomePlayers(data ?? []); setSelectedHome(new Set()) })
    } else { setHomePlayers([]); setSelectedHome(new Set()) }
  }, [homeTeamId])

  useEffect(() => {
    if (awayTeamId) {
      supabase.from('players').select('*').eq('team_id', awayTeamId).order('number')
        .then(({ data }) => { setAwayPlayers(data ?? []); setSelectedAway(new Set()) })
    } else { setAwayPlayers([]); setSelectedAway(new Set()) }
  }, [awayTeamId])

  const requiredCount = gameType === '4v4' ? 4 : 5

  function togglePlayer(set: Set<string>, setFn: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else if (next.size < requiredCount) next.add(id)
    setFn(next)
  }

  async function startGame() {
    if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) return
    if (selectedHome.size !== requiredCount || selectedAway.size !== requiredCount) return
    const { data: game } = await supabase.from('games').insert({
      home_team_id: homeTeamId, away_team_id: awayTeamId, game_type: gameType,
      game_date: gameDate, status: 'in_progress',
      season_id: activeSeason?.id ?? null,
    }).select().single()
    if (!game) return

    // Link to schedule entry if from scouting report
    if (scheduleId) {
      await supabase.from('schedule').update({ game_id: game.id }).eq('id', scheduleId)
    }

    const statsRows = [
      ...[...selectedHome].map(pid => ({ game_id: game.id, player_id: pid, team_id: homeTeamId })),
      ...[...selectedAway].map(pid => ({ game_id: game.id, player_id: pid, team_id: awayTeamId })),
    ]
    await supabase.from('player_game_stats').insert(statsRows)
    navigate(`/game/live/${game.id}`)
  }

  function PlayerSelector({ players, selected, onToggle }: {
    players: Player[]; selected: Set<string>; onToggle: (id: string) => void
  }) {
    return (
      <div>
        <p className="text-sm text-gray-500 mb-3">Select players ({selected.size}/{requiredCount})</p>
        {players.length === 0 ? (
          <p className="text-gray-600 text-sm py-4 text-center">No players on roster</p>
        ) : (
          <div className="space-y-2">
            {players.map(p => (
              <button key={p.id} onClick={() => onToggle(p.id)}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
                  selected.has(p.id)
                    ? 'bg-gradient-to-r from-orange-600/20 to-amber-600/10 border border-orange-500/40 text-white shadow-inner shadow-orange-500/5'
                    : 'bg-[#0a0a0f] border border-white/5 text-gray-400 hover:border-white/10'
                }`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                  selected.has(p.id) ? 'bg-orange-500/30 text-orange-300' : 'bg-white/5 text-gray-500'
                }`}>{p.number}</div>
                <span className="font-medium">{p.name}</span>
                {selected.has(p.id) && <span className="ml-auto text-orange-400 text-lg">&#10003;</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const canStart = homeTeamId && awayTeamId && homeTeamId !== awayTeamId
    && selectedHome.size === requiredCount && selectedAway.size === requiredCount

  return (
    <div>
      <h1 className="text-3xl font-black mb-1">New Game</h1>
      <p className="text-gray-500 mb-1">Set up teams and players</p>
      {activeSeason && (
        <p className="text-orange-400/60 text-sm mb-6 font-medium">Season: {activeSeason.name}</p>
      )}
      {scheduleId && (
        <div className="bg-green-600/10 border border-green-500/20 rounded-xl px-4 py-2 mb-6 text-green-400 text-sm">
          Starting from scheduled matchup
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div>
          <label className="block text-sm text-gray-500 mb-2 font-medium">Game Type</label>
          <div className="flex gap-2">
            {(['5v5', '4v4'] as const).map(t => (
              <button key={t}
                onClick={() => { setGameType(t); setSelectedHome(new Set()); setSelectedAway(new Set()) }}
                className={`flex-1 py-3.5 rounded-xl font-black text-lg transition-all ${
                  gameType === t
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-500/20'
                    : 'bg-[#12121c] text-gray-500 border border-white/5 hover:border-white/10'
                }`}>{t}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-2 font-medium">Date</label>
          <input type="date" value={gameDate} onChange={e => setGameDate(e.target.value)}
            className="w-full bg-[#12121c] border border-white/10 rounded-xl px-5 py-3.5 text-white focus:outline-none focus:border-orange-500/50 transition-all" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#12121c] border border-blue-500/10 rounded-2xl p-5">
          <h2 className="font-black text-blue-400 mb-4 text-lg">Home Team</h2>
          <select value={homeTeamId} onChange={e => setHomeTeamId(e.target.value)}
            className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white mb-4 focus:outline-none focus:border-orange-500/50">
            <option value="">Select team...</option>
            {teams.filter(t => t.id !== awayTeamId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {homeTeamId && <PlayerSelector players={homePlayers} selected={selectedHome}
            onToggle={id => togglePlayer(selectedHome, setSelectedHome, id)} />}
        </div>
        <div className="bg-[#12121c] border border-red-500/10 rounded-2xl p-5">
          <h2 className="font-black text-red-400 mb-4 text-lg">Away Team</h2>
          <select value={awayTeamId} onChange={e => setAwayTeamId(e.target.value)}
            className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white mb-4 focus:outline-none focus:border-orange-500/50">
            <option value="">Select team...</option>
            {teams.filter(t => t.id !== homeTeamId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {awayTeamId && <PlayerSelector players={awayPlayers} selected={selectedAway}
            onToggle={id => togglePlayer(selectedAway, setSelectedAway, id)} />}
        </div>
      </div>

      <button onClick={startGame} disabled={!canStart}
        className={`w-full py-5 rounded-2xl font-black text-lg transition-all ${
          canStart
            ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-500/20 hover:shadow-green-500/30'
            : 'bg-[#12121c] text-gray-600 border border-white/5 cursor-not-allowed'
        }`}>
        {canStart ? 'Start Game' : `Select ${requiredCount} players per team to start`}
      </button>
    </div>
  )
}
