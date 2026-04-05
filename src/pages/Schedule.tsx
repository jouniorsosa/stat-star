import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSeasonContext } from '../lib/SeasonContext'
import type { Team, ScheduleEntry, Game } from '../types'

export default function Schedule() {
  const { selectedSeason, seasons, setSelectedSeason } = useSeasonContext()
  const [entries, setEntries] = useState<(ScheduleEntry & { home_team: Team; away_team: Team; game?: Game })[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [homeId, setHomeId] = useState('')
  const [awayId, setAwayId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')

  async function loadEntries() {
    if (!selectedSeason) { setEntries([]); setLoading(false); return }
    const { data } = await supabase
      .from('schedule')
      .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*), game:games(*)')
      .eq('season_id', selectedSeason.id)
      .order('game_date', { ascending: true })
    setEntries((data ?? []) as typeof entries)
    setLoading(false)
  }

  useEffect(() => {
    supabase.from('teams').select('*').order('name').then(({ data }) => setTeams(data ?? []))
  }, [])
  useEffect(() => { setLoading(true); loadEntries() }, [selectedSeason])

  async function addEntry(e: React.FormEvent) {
    e.preventDefault()
    if (!homeId || !awayId || homeId === awayId || !selectedSeason) return
    await supabase.from('schedule').insert({
      season_id: selectedSeason.id,
      home_team_id: homeId, away_team_id: awayId,
      game_date: date, game_time: time || null, location: location || null, notes: notes || null,
    })
    setHomeId(''); setAwayId(''); setTime(''); setLocation(''); setNotes(''); setShowForm(false)
    loadEntries()
  }

  async function deleteEntry(id: string) {
    await supabase.from('schedule').delete().eq('id', id)
    loadEntries()
  }

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = entries.filter(e => !e.game_id && e.game_date >= today)
  const past = entries.filter(e => e.game_id || e.game_date < today)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black">Schedule</h1>
          <p className="text-gray-500">Upcoming and past matchups</p>
        </div>
        <select
          value={selectedSeason?.id ?? ''}
          onChange={e => { const s = seasons.find(x => x.id === e.target.value); setSelectedSeason(s ?? null) }}
          className="bg-[#12121c] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50"
        >
          {seasons.length === 0 && <option value="">No seasons</option>}
          {seasons.map(s => <option key={s.id} value={s.id}>{s.name}{s.active ? ' (Active)' : ''}</option>)}
        </select>
      </div>

      {!selectedSeason ? (
        <div className="text-center py-16 bg-[#12121c] border border-white/5 rounded-2xl">
          <p className="text-gray-500 text-lg mb-2">No season selected</p>
          <Link to="/seasons" className="text-orange-400 hover:text-orange-300 font-medium">Create a season first</Link>
        </div>
      ) : (
        <>
          <button onClick={() => setShowForm(!showForm)}
            className="mb-6 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/10">
            {showForm ? 'Cancel' : '+ Add Matchup'}
          </button>

          {showForm && (
            <form onSubmit={addEntry} className="bg-[#12121c] border border-white/5 rounded-2xl p-5 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <select value={homeId} onChange={e => setHomeId(e.target.value)}
                  className="bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50">
                  <option value="">Home team...</option>
                  {teams.filter(t => t.id !== awayId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select value={awayId} onChange={e => setAwayId(e.target.value)}
                  className="bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50">
                  <option value="">Away team...</option>
                  {teams.filter(t => t.id !== homeId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50" />
                <input value={time} onChange={e => setTime(e.target.value)} placeholder="Time (e.g. 7:00 PM)"
                  className="bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50" />
                <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location"
                  className="bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50" />
              </div>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)"
                className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 mb-3" />
              <button type="submit" className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-bold transition-all">
                Add to Schedule
              </button>
            </form>
          )}

          {loading ? (
            <div className="text-center py-12 text-gray-600">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-16 bg-[#12121c] border border-white/5 rounded-2xl">
              <p className="text-gray-500">No matchups scheduled yet</p>
            </div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-orange-500 rounded-full" />Upcoming
                  </h2>
                  <div className="space-y-3">
                    {upcoming.map(e => (
                      <div key={e.id} className="bg-[#12121c] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <Link to={`/schedule/${e.id}`} className="flex-1 min-w-[200px]">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-blue-400">{e.home_team?.name}</span>
                              <span className="text-gray-600">vs</span>
                              <span className="font-bold text-red-400">{e.away_team?.name}</span>
                            </div>
                            <p className="text-gray-500 text-sm mt-1">
                              {e.game_date}{e.game_time ? ` at ${e.game_time}` : ''}{e.location ? ` \u2022 ${e.location}` : ''}
                            </p>
                            {e.notes && <p className="text-gray-600 text-xs mt-1">{e.notes}</p>}
                          </Link>
                          <div className="flex gap-2">
                            <Link to={`/schedule/${e.id}`}
                              className="text-sm text-orange-400 hover:text-orange-300 px-3 py-1.5 rounded-lg hover:bg-orange-400/10 font-medium">
                              Scout
                            </Link>
                            <button onClick={() => deleteEntry(e.id)}
                              className="text-sm text-red-400/70 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-400/10">
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {past.length > 0 && (
                <div>
                  <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-gray-600 rounded-full" />Completed / Past
                  </h2>
                  <div className="space-y-3">
                    {past.map(e => {
                      const g = e.game as Game | undefined
                      const isLive = g?.status === 'in_progress'
                      return (
                        <Link key={e.id} to={g ? (isLive ? `/game/live/${g.id}` : `/game/${g.id}`) : `/schedule/${e.id}`}
                          className="block bg-[#12121c] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-3">
                                <span className="font-bold">{e.home_team?.name}</span>
                                {g ? (
                                  <span className="font-black text-lg">{g.home_score} - {g.away_score}</span>
                                ) : (
                                  <span className="text-gray-600">vs</span>
                                )}
                                <span className="font-bold">{e.away_team?.name}</span>
                              </div>
                              <p className="text-gray-500 text-sm mt-1">{e.game_date}</p>
                            </div>
                            {isLive ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-green-400">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />LIVE
                              </span>
                            ) : g ? (
                              <span className="text-gray-600 text-xs font-bold">FINAL</span>
                            ) : (
                              <span className="text-gray-700 text-xs">Not played</span>
                            )}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
