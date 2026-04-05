import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Team, Player } from '../types'
import PlayerNotesPanel from '../components/PlayerNotesPanel'

export default function TeamRoster() {
  const { teamId } = useParams<{ teamId: string }>()
  const [team, setTeam] = useState<Team | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editNumber, setEditNumber] = useState('')
  const [notesPlayer, setNotesPlayer] = useState<string | null>(null)

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

  if (!team) return <div className="text-center py-12 text-gray-600">Loading...</div>

  return (
    <div>
      <Link to="/teams" className="text-gray-500 hover:text-gray-300 text-sm mb-6 inline-flex items-center gap-1 transition-colors">
        &larr; Back to Teams
      </Link>
      <h1 className="text-3xl font-black mb-2">{team.name}</h1>
      <p className="text-gray-500 mb-8">Manage player roster</p>

      <form onSubmit={addPlayer} className="flex gap-3 mb-8">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Player name"
          className="flex-1 bg-[#12121c] border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all" />
        <input value={number} onChange={e => setNumber(e.target.value)} placeholder="#" type="number"
          className="w-20 bg-[#12121c] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 text-center transition-all" />
        <button type="submit"
          className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/10 hover:shadow-orange-500/25">
          Add
        </button>
      </form>

      {players.length === 0 ? (
        <div className="text-center py-16 bg-[#12121c] border border-white/5 rounded-2xl">
          <p className="text-gray-500 text-lg mb-2">No players yet</p>
          <p className="text-gray-600 text-sm">Add players to this roster above!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {players.map(p => (
            <div key={p.id}>
              <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:border-white/10 transition-all">
                {editId === p.id ? (
                  <>
                    <input value={editNumber} onChange={e => setEditNumber(e.target.value)} type="number"
                      className="w-16 bg-[#0a0a0f] border border-white/10 rounded-lg px-2 py-2 text-white text-center focus:outline-none focus:border-orange-500/50" autoFocus />
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      className="flex-1 bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500/50"
                      onKeyDown={e => e.key === 'Enter' && saveEdit(p.id)} />
                    <button onClick={() => saveEdit(p.id)} className="text-green-400 hover:text-green-300 font-semibold px-3 py-1.5 rounded-lg hover:bg-green-400/10 transition-colors">Save</button>
                    <button onClick={() => setEditId(null)} className="text-gray-500 hover:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">Cancel</button>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/20 flex items-center justify-center font-black text-orange-400">
                      {p.number}
                    </div>
                    <span className="flex-1 font-semibold text-lg">{p.name}</span>
                    <Link to={`/players/${p.id}/shots`}
                      className="text-sm text-gray-500 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                      Shots
                    </Link>
                    <button
                      onClick={() => setNotesPlayer(notesPlayer === p.id ? null : p.id)}
                      className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                        notesPlayer === p.id ? 'bg-orange-500/20 text-orange-400' : 'text-gray-500 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      Notes
                    </button>
                    <button onClick={() => { setEditId(p.id); setEditName(p.name); setEditNumber(String(p.number)) }}
                      className="text-sm text-gray-500 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">Edit</button>
                    <button onClick={() => deletePlayer(p.id)}
                      className="text-sm text-red-400/70 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-400/10 transition-colors">Remove</button>
                  </>
                )}
              </div>
              {notesPlayer === p.id && (
                <div className="ml-16 mt-1 mb-3">
                  <PlayerNotesPanel playerId={p.id} playerName={p.name} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
