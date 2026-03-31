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
    if (!confirm('Delete this team and all its players?')) return
    await supabase.from('teams').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Teams</h1>

      <form onSubmit={addTeam} className="flex gap-2 mb-6">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New team name"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
        />
        <button
          type="submit"
          className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Add Team
        </button>
      </form>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : teams.length === 0 ? (
        <p className="text-gray-500">No teams yet. Add one above!</p>
      ) : (
        <div className="space-y-2">
          {teams.map(t => (
            <div
              key={t.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3"
            >
              {editId === t.id ? (
                <>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && saveEdit(t.id)}
                  />
                  <button onClick={() => saveEdit(t.id)} className="text-green-400 hover:text-green-300 px-2 py-1">Save</button>
                  <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-300 px-2 py-1">Cancel</button>
                </>
              ) : (
                <>
                  <Link to={`/teams/${t.id}`} className="flex-1 font-medium hover:text-orange-400 transition-colors">
                    {t.name}
                  </Link>
                  <Link to={`/teams/${t.id}`} className="text-sm text-gray-400 hover:text-gray-300">
                    Roster
                  </Link>
                  <button
                    onClick={() => { setEditId(t.id); setEditName(t.name) }}
                    className="text-sm text-gray-400 hover:text-gray-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTeam(t.id)}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Delete
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
