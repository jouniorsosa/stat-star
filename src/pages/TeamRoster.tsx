import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Team, Player } from '../types'

export default function TeamRoster() {
  const { teamId } = useParams<{ teamId: string }>()
  const [team, setTeam] = useState<Team | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editNumber, setEditNumber] = useState('')

  async function load() {
    const { data: t } = await supabase.from('teams').select('*').eq('id', teamId!).single()
    setTeam(t)
    const { data: p } = await supabase.from('players').select('*').eq('team_id', teamId!).order('number')
    setPlayers(p ?? [])
  }

  useEffect(() => { load() }, [teamId])

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    const num = parseInt(number)
    if (!n || isNaN(num)) return
    await supabase.from('players').insert({ team_id: teamId!, name: n, number: num })
    setName('')
    setNumber('')
    load()
  }

  async function saveEdit(id: string) {
    const n = editName.trim()
    const num = parseInt(editNumber)
    if (!n || isNaN(num)) return
    await supabase.from('players').update({ name: n, number: num }).eq('id', id)
    setEditId(null)
    load()
  }

  async function deletePlayer(id: string) {
    if (!confirm('Remove this player?')) return
    await supabase.from('players').delete().eq('id', id)
    load()
  }

  if (!team) return <p className="text-gray-500">Loading...</p>

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/teams" className="text-gray-400 hover:text-gray-300">&larr; Teams</Link>
        <h1 className="text-2xl font-bold">{team.name} Roster</h1>
      </div>

      <form onSubmit={addPlayer} className="flex gap-2 mb-6">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Player name"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
        />
        <input
          value={number}
          onChange={e => setNumber(e.target.value)}
          placeholder="#"
          type="number"
          className="w-20 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-center"
        />
        <button
          type="submit"
          className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Add
        </button>
      </form>

      {players.length === 0 ? (
        <p className="text-gray-500">No players yet. Add some above!</p>
      ) : (
        <div className="space-y-2">
          {players.map(p => (
            <div
              key={p.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3"
            >
              {editId === p.id ? (
                <>
                  <input
                    value={editNumber}
                    onChange={e => setEditNumber(e.target.value)}
                    type="number"
                    className="w-16 bg-gray-800 border border-gray-600 rounded-lg px-2 py-2 text-white text-center focus:outline-none focus:border-orange-500"
                    autoFocus
                  />
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                    onKeyDown={e => e.key === 'Enter' && saveEdit(p.id)}
                  />
                  <button onClick={() => saveEdit(p.id)} className="text-green-400 hover:text-green-300 px-2">Save</button>
                  <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-300 px-2">Cancel</button>
                </>
              ) : (
                <>
                  <span className="w-10 text-center font-bold text-orange-400">#{p.number}</span>
                  <span className="flex-1 font-medium">{p.name}</span>
                  <button
                    onClick={() => { setEditId(p.id); setEditName(p.name); setEditNumber(String(p.number)) }}
                    className="text-sm text-gray-400 hover:text-gray-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deletePlayer(p.id)}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Remove
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
