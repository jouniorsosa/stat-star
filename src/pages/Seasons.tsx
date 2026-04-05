import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSeasonContext } from '../lib/SeasonContext'
import type { Season } from '../types'

export default function Seasons() {
  const { seasons, refetchSeasons } = useSeasonContext()
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  async function addSeason(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !startDate || !endDate) return
    await supabase.from('seasons').insert({ name: name.trim(), start_date: startDate, end_date: endDate, active: seasons.length === 0 })
    setName(''); setStartDate(''); setEndDate('')
    refetchSeasons()
  }

  async function setActive(id: string) {
    await supabase.from('seasons').update({ active: true }).eq('id', id)
    refetchSeasons()
  }

  async function saveEdit(id: string) {
    if (!editName.trim() || !editStart || !editEnd) return
    await supabase.from('seasons').update({ name: editName.trim(), start_date: editStart, end_date: editEnd }).eq('id', id)
    setEditId(null)
    refetchSeasons()
  }

  async function deleteSeason(id: string) {
    if (deleting === id) {
      await supabase.from('seasons').delete().eq('id', id)
      setDeleting(null)
      refetchSeasons()
    } else {
      setDeleting(id)
      setTimeout(() => setDeleting(prev => prev === id ? null : prev), 3000)
    }
  }

  function startEdit(s: Season) {
    setEditId(s.id); setEditName(s.name); setEditStart(s.start_date); setEditEnd(s.end_date)
  }

  return (
    <div>
      <h1 className="text-3xl font-black mb-2">Seasons</h1>
      <p className="text-gray-500 mb-8">Manage basketball seasons</p>

      <form onSubmit={addSeason} className="bg-[#12121c] border border-white/5 rounded-2xl p-5 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Season name (e.g. Spring 2026)"
            className="bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50" />
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50" />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50" />
        </div>
        <button type="submit"
          className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/10">
          Create Season
        </button>
      </form>

      {seasons.length === 0 ? (
        <div className="text-center py-16 bg-[#12121c] border border-white/5 rounded-2xl">
          <p className="text-gray-500 text-lg mb-2">No seasons yet</p>
          <p className="text-gray-600 text-sm">Create your first season above!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {seasons.map(s => (
            <div key={s.id} className="bg-[#12121c] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
              {editId === s.id ? (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      className="bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500/50" autoFocus />
                    <input type="date" value={editStart} onChange={e => setEditStart(e.target.value)}
                      className="bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500/50" />
                    <input type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)}
                      className="bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500/50" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(s.id)} className="text-green-400 hover:text-green-300 font-semibold px-3 py-1.5 rounded-lg hover:bg-green-400/10">Save</button>
                    <button onClick={() => setEditId(null)} className="text-gray-500 hover:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-white/5">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-lg">{s.name}</h3>
                      {s.active && (
                        <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-0.5 rounded-full">ACTIVE</span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm">{s.start_date} to {s.end_date}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {!s.active && (
                      <button onClick={() => setActive(s.id)}
                        className="text-sm text-green-400 hover:text-green-300 px-3 py-1.5 rounded-lg hover:bg-green-400/10 font-medium transition-colors">
                        Set Active
                      </button>
                    )}
                    <button onClick={() => startEdit(s)}
                      className="text-sm text-gray-500 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 font-medium transition-colors">
                      Edit
                    </button>
                    <button onClick={() => deleteSeason(s.id)}
                      className={`text-sm font-bold px-3 py-1.5 rounded-lg transition-all ${
                        deleting === s.id ? 'bg-red-600 text-white hover:bg-red-500 animate-pulse' : 'text-red-400/70 hover:text-red-400 hover:bg-red-400/10'
                      }`}>
                      {deleting === s.id ? 'Confirm?' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
