import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type Gallery } from './api'

export type NewFrame = { id: number; slug: string; room: string }

const SUGGESTIONS = ['Front hallway', 'Living room', 'Kitchen', 'Stairs', 'Office', 'Bedroom']

/**
 * The one form for making a frame. Used on the manage screen, in the gallery editor,
 * and on the print page, so a frame can be added wherever you happen to be.
 */
export function AddFrameForm(props: {
  galleries: Gallery[]
  galleryId?: number | null
  lockGallery?: boolean
  takenRooms?: string[]
  onAdded: (f: NewFrame) => void | Promise<void>
  compact?: boolean
}) {
  const { galleries, galleryId, lockGallery, takenRooms = [], onAdded, compact } = props
  const [room, setRoom] = useState('')
  const [gid, setGid] = useState<string>(galleryId ? String(galleryId) : galleries[0] ? String(galleries[0].id) : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const taken = new Set(takenRooms.map((r) => r.toLowerCase()))
  const ideas = SUGGESTIONS.filter((s) => !taken.has(s.toLowerCase())).slice(0, 4)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!room.trim()) return
    setBusy(true)
    setError('')
    try {
      const f = await api<{ id: number; slug: string }>('frame-save', { body: { room: room.trim(), gallery_id: gid || null } })
      const added = { ...f, room: room.trim() }
      setRoom('')
      await onAdded(added)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the frame')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className={'add-frame-form' + (compact ? ' compact' : '')} onSubmit={submit}>
      <label className="field">
        <span>Where will it hang?</span>
        <input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Front hallway" maxLength={60} required />
      </label>
      {ideas.length > 0 && !room && (
        <div className="chips" aria-label="Suggestions">
          {ideas.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => setRoom(s)}>{s}</button>
          ))}
        </div>
      )}
      {!lockGallery && (
        <label className="field">
          <span>What should it show?</span>
          <select value={gid} onChange={(e) => setGid(e.target.value)}>
            <option value="">Nothing yet</option>
            {galleries.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </label>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn btn-red" type="submit" disabled={busy || !room.trim()}>{busy ? 'Adding…' : 'Add frame'}</button>
      <p className="hint">This name makes its QR code, which never changes. You can rename the frame later without reprinting.</p>
    </form>
  )
}

/** Shown right after a frame is added: the obvious next step is printing its code. */
export function FrameReady({ frame, onDone }: { frame: NewFrame; onDone?: () => void }) {
  return (
    <div className="ready" role="status">
      <span className="ready-check" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
      </span>
      <div className="grow">
        <strong>{frame.room} is ready.</strong>
        <span> Print its code and put it in the frame.</span>
      </div>
      <Link className="btn btn-light" to={`/print?frame=${encodeURIComponent(frame.slug)}`}>Print its code</Link>
      {onDone && <button type="button" className="link-btn light" onClick={onDone} aria-label="Dismiss">Done</button>}
    </div>
  )
}

/** The three steps, with a tick on each one that is done. */
export function Steps({ galleries, frames }: { galleries: number; frames: number }) {
  const steps = [
    { n: 1, title: 'Make an album', body: 'Upload the photographs for one story. Add a song if you like.', done: galleries > 0, href: '#galleries' },
    { n: 2, title: 'Put it in a frame', body: 'A frame is a spot on your wall. Pick which album it shows.', done: frames > 0, href: '#frames' },
    { n: 3, title: 'Print the code', body: 'One QR card per frame. Print it once; swap what it plays any time.', done: false, href: '/frames/print' },
  ]
  const next = steps.find((s) => !s.done)?.n ?? 3
  return (
    <ol className="steps">
      {steps.map((s) => (
        <li key={s.n} className={(s.done ? 'done' : '') + (s.n === next ? ' is-next' : '')}>
          <a href={s.href}>
            <span className="step-n" aria-hidden="true">
              {s.done ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg> : s.n}
            </span>
            <span className="step-text">
              <strong>{s.title}{s.done && <span className="sr-only"> (done)</span>}</strong>
              <span>{s.body}</span>
            </span>
          </a>
        </li>
      ))}
    </ol>
  )
}
