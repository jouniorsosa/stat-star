import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Team } from '../types'

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([])
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase.from('teams').select('*').order('name')
    setTeams(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addTeam(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    await supabase.from('teams').insert({ name })
    setNewName('')
    load()
  }

  async function saveEdit(id: string) {
    const name = editName.trim()
    if (!name) return
    await supabase.from('teams').update({ name }).eq('id', id)
    setEditId(null)
    load()
  }

  async function deleteTeam(id: string) {
    if (deleting === id) {
      // Second click = confirm
      await supabase.from('teams').delete().eq('id', id)
      setDeleting(null)
      load()
    } else {
      // First click = show confirm state
      setDeleting(id)
      setTimeout(() => setDeleting(prev => prev === id ? null : prev), 3000)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-black mb-2">Teams</h1>
      <p className="text-gray-500 mb-8">Create teams and manage player rosters</p>

      <form onSubmit={addTeam} className="flex gap-3 mb-8">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Enter team name..."
          className="flex-1 bg-[#12121c] border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
        />
        <button
          type="submit"
          className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/10 hover:shadow-orange-500/25"
        >
          Add Team
        </button>
      </form>

      {loading ? (
        <div className="text-center py-12 text-gray-600">Loading teams...</div>
      ) : teams.length === 0 ? (
        <div className="text-center py-16 bg-[#12121c] border border-white/5 rounded-2xl">
          <p className="text-gray-500 text-lg mb-2">No teams yet</p>
          <p className="text-gray-600 text-sm">Add your first team above!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {teams.map(t => (
            <div
              key={t.id}
              className="bg-[#12121c] border border-white/5 rounded-2xl p-5 flex items-center gap-4 hover:border-white/10 transition-all"
            >
              {editId === t.id ? (
                <>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="flex-1 bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500/50"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && saveEdit(t.id)}
                  />
                  <button onClick={() => saveEdit(t.id)} className="text-green-400 hover:text-green-300 font-semibold px-3 py-1.5 rounded-lg hover:bg-green-400/10 transition-colors">Save</button>
                  <button onClick={() => setEditId(null)} className="text-gray-500 hover:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">Cancel</button>
                </>
              ) : (
                <>
                  <Link to={`/teams/${t.id}`} className="flex-1 font-bold text-lg hover:text-orange-400 transition-colors">
                    {t.name}
                  </Link>
                  <Link
                    to={`/teams/${t.id}`}
                    className="text-sm text-gray-500 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors font-medium"
                  >
                    Roster
                  </Link>
                  <button
                    onClick={() => { setEditId(t.id); setEditName(t.name) }}
                    className="text-sm text-gray-500 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTeam(t.id)}
                    className={`text-sm font-bold px-3 py-1.5 rounded-lg transition-all ${
                      deleting === t.id
                        ? 'bg-red-600 text-white hover:bg-red-500 animate-pulse'
                        : 'text-red-400/70 hover:text-red-400 hover:bg-red-400/10'
                    }`}
                  >
                    {deleting === t.id ? 'Confirm Delete?' : 'Delete'}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
