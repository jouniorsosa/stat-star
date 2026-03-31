import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Team, Player } from '../types'

export default function GameSetup() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState<Team[]>([])
  const [homeTeamId, setHomeTeamId] = useState('')
  const [awayTeamId, setAwayTeamId] = useState('')
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
    } else {
      setHomePlayers([])
      setSelectedHome(new Set())
    }
  }, [homeTeamId])

  useEffect(() => {
    if (awayTeamId) {
      supabase.from('players').select('*').eq('team_id', awayTeamId).order('number')
        .then(({ data }) => { setAwayPlayers(data ?? []); setSelectedAway(new Set()) })
    } else {
      setAwayPlayers([])
      setSelectedAway(new Set())
    }
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
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      game_type: gameType,
      game_date: gameDate,
      status: 'in_progress',
    }).select().single()

    if (!game) return

    const statsRows = [
      ...[...selectedHome].map(pid => ({ game_id: game.id, player_id: pid, team_id: homeTeamId })),
      ...[...selectedAway].map(pid => ({ game_id: game.id, player_id: pid, team_id: awayTeamId })),
    ]
    await supabase.from('player_game_stats').insert(statsRows)
    navigate(`/game/live/${game.id}`)
  }

  function PlayerSelector({ players, selected, onToggle, label }: {
    players: Player[]; selected: Set<string>; onToggle: (id: string) => void; label: string
  }) {
    return (
      <div>
        <p className="text-sm text-gray-400 mb-2">{label} ({selected.size}/{requiredCount})</p>
        {players.length === 0 ? (
          <p className="text-gray-600 text-sm">No players on this team</p>
        ) : (
          <div className="space-y-1">
            {players.map(p => (
              <button
                key={p.id}
                onClick={() => onToggle(p.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  selected.has(p.id)
                    ? 'bg-orange-600/30 border border-orange-500 text-white'
                    : 'bg-gray-800 border border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                <span className="text-orange-400 font-bold w-8 text-center">#{p.number}</span>
                <span>{p.name}</span>
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
      <h1 className="text-2xl font-bold mb-6">New Game</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Game Type</label>
          <div className="flex gap-2">
            {(['5v5', '4v4'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setGameType(t); setSelectedHome(new Set()); setSelectedAway(new Set()) }}
                className={`flex-1 py-3 rounded-lg font-bold text-lg transition-colors ${
                  gameType === t ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Date</label>
          <input
            type="date"
            value={gameDate}
            onChange={e => setGameDate(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-bold mb-3 text-blue-400">Home Team</h2>
          <select
            value={homeTeamId}
            onChange={e => setHomeTeamId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white mb-4 focus:outline-none focus:border-orange-500"
          >
            <option value="">Select team...</option>
            {teams.filter(t => t.id !== awayTeamId).map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {homeTeamId && (
            <PlayerSelector
              players={homePlayers}
              selected={selectedHome}
              onToggle={id => togglePlayer(selectedHome, setSelectedHome, id)}
              label="Select active players"
            />
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-bold mb-3 text-red-400">Away Team</h2>
          <select
            value={awayTeamId}
            onChange={e => setAwayTeamId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white mb-4 focus:outline-none focus:border-orange-500"
          >
            <option value="">Select team...</option>
            {teams.filter(t => t.id !== homeTeamId).map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {awayTeamId && (
            <PlayerSelector
              players={awayPlayers}
              selected={selectedAway}
              onToggle={id => togglePlayer(selectedAway, setSelectedAway, id)}
              label="Select active players"
            />
          )}
        </div>
      </div>

      <button
        onClick={startGame}
        disabled={!canStart}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-colors ${
          canStart
            ? 'bg-green-600 hover:bg-green-500 text-white'
            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
        }`}
      >
        Start Game
      </button>
    </div>
  )
}
