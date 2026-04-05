import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { PlayerNote } from '../types'

interface Props {
  playerId: string
  playerName?: string
  compact?: boolean
}

export default function PlayerNotesPanel({ playerId, playerName, compact = false }: Props) {
  const [notes, setNotes] = useState<PlayerNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [expanded, setExpanded] = useState(!compact)
  const [loading, setLoading] = useState(true)

  async function loadNotes() {
    const { data } = await supabase
      .from('player_notes')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
    setNotes(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadNotes() }, [playerId])

  async function addNote(e: React.FormEvent) {
    e.preventDefault()
    const text = newNote.trim()
    if (!text) return
    await supabase.from('player_notes').insert({ player_id: playerId, note: text })
    setNewNote('')
    loadNotes()
  }

  async function deleteNote(id: string) {
    await supabase.from('player_notes').delete().eq('id', id)
    loadNotes()
  }

  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-orange-400 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
      >
        <span>Notes</span>
        {notes.length > 0 && (
          <span className="bg-orange-500/20 text-orange-400 font-bold px-1.5 py-0.5 rounded-full text-[10px]">
            {notes.length}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className={`${compact ? 'bg-[#0a0a0f] border border-white/5 rounded-xl p-4 mt-2' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-sm">
          {playerName ? `Notes - ${playerName}` : 'Scouting Notes'}
        </h4>
        {compact && (
          <button onClick={() => setExpanded(false)} className="text-gray-500 hover:text-gray-300 text-xs">
            Close
          </button>
        )}
      </div>

      <form onSubmit={addNote} className="flex gap-2 mb-3">
        <input
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="Add a note (strengths, weaknesses...)"
          className="flex-1 bg-[#12121c] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
        />
        <button
          type="submit"
          className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shrink-0"
        >
          Add
        </button>
      </form>

      {loading ? (
        <p className="text-gray-600 text-xs">Loading...</p>
      ) : notes.length === 0 ? (
        <p className="text-gray-600 text-xs">No notes yet</p>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {notes.map(n => (
            <div key={n.id} className="flex items-start gap-2 bg-[#12121c] rounded-lg p-3 border border-white/5 group">
              <p className="flex-1 text-sm text-gray-300">{n.note}</p>
              <button
                onClick={() => deleteNote(n.id)}
                className="text-red-400/50 hover:text-red-400 text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
