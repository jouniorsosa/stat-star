import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, type Frame, type Gallery, type Overview, type Schedule } from './api'
import { useSession } from './session'

const TONES = ['#5B3A29', '#1F4B55', '#4A3F6B', '#3B5230', '#5C2B3B', '#5A4A1E', '#2E4466', '#6B2A22']

function niceDate(d: string) {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function Manage() {
  const { refresh: refreshSession } = useSession()
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const load = useCallback(async () => {
    try {
      setData(await api<Overview>('overview'))
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load')
    }
  }, [])
  useEffect(() => { load() }, [load])

  const byId = useMemo(() => new Map((data?.galleries || []).map((g) => [g.id, g])), [data])

  async function act(op: string, body: unknown) {
    try {
      await api(op, { body })
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'That did not work')
    }
  }

  async function newGallery(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const name = (new FormData(form).get('name') as string).trim()
    if (!name) return
    const r = await api<{ id: number }>('gallery-save', { body: { name } })
    navigate(`/gallery/${r.id}`)
  }

  async function newFrame(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const room = (fd.get('room') as string).trim()
    if (!room) return
    await act('frame-save', { room, gallery_id: fd.get('gallery_id') || null })
    form.reset()
  }

  async function signOut() {
    await api('logout')
    await refreshSession()
  }

  if (error) return <div className="wrap pad"><p className="error" role="alert">{error}</p></div>
  if (!data) return <p className="muted pad wrap">Loading your frames…</p>

  return (
    <div className="wrap manage">
      <section className="section">
        <div className="section-head">
          <h2 className="display">Frames</h2>
          <button type="button" className="link-btn" onClick={signOut}>Sign out</button>
        </div>
        {data.frames.length === 0 && <p className="muted">No frames yet. Add one for each spot in the house that will have a printed code.</p>}
        <div className="frame-grid">
          {data.frames.map((f, i) => (
            <FrameCard
              key={f.id}
              frame={f}
              tone={TONES[i % TONES.length]}
              galleries={data.galleries}
              current={f.current_gallery_id ? byId.get(f.current_gallery_id) : undefined}
              schedules={data.schedules.filter((s) => s.frame_id === f.id)}
              byId={byId}
              today={data.today}
              act={act}
            />
          ))}
        </div>
        <form className="card add-frame" onSubmit={newFrame}>
          <h3>Add a frame</h3>
          <div className="row">
            <label className="field grow">
              <span>Where is it?</span>
              <input name="room" placeholder="Front hallway" maxLength={60} required />
            </label>
            <label className="field grow">
              <span>Starts out showing</span>
              <select name="gallery_id" defaultValue="">
                <option value="">Nothing yet</option>
                {data.galleries.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
            <button className="btn btn-light" type="submit">Add frame</button>
          </div>
          <p className="muted small">Its QR code is made from the name you give it now and never changes, even if you rename the frame later.</p>
        </form>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="display">Galleries</h2>
        </div>
        <form className="row new-gallery" onSubmit={newGallery}>
          <label className="field grow">
            <span>New gallery</span>
            <input name="name" placeholder="Christmas 2025" maxLength={80} required />
          </label>
          <button className="btn btn-red" type="submit">Create and add photos</button>
        </form>
        <div className="gallery-list">
          {data.galleries.length === 0 && <p className="muted">No galleries yet.</p>}
          {data.galleries.map((g, i) => {
            const using = data.frames.filter((f) => f.current_gallery_id === g.id).length
            const queued = data.schedules.some((s) => s.gallery_id === g.id)
            return (
              <Link key={g.id} to={`/gallery/${g.id}`} className="gallery-row">
                <span className="thumb" style={{ background: TONES[i % TONES.length] }}>
                  {g.cover && <img src={g.cover} alt="" loading="lazy" />}
                </span>
                <span className="g-name display">{g.name}</span>
                <span className="muted">{g.count} photos</span>
                <span className="muted">{g.music_url ? 'With music' : 'No music'}</span>
                <span className="muted">{using ? `Showing in ${using} frame${using > 1 ? 's' : ''}` : queued ? 'Scheduled' : 'Not showing'}</span>
                <span className="open">Open →</span>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function FrameCard(props: {
  frame: Frame
  tone: string
  galleries: Gallery[]
  current?: Gallery
  schedules: Schedule[]
  byId: Map<number, Gallery>
  today: string
  act: (op: string, body: unknown) => Promise<void>
}) {
  const { frame, tone, galleries, current, schedules, byId, today, act } = props
  const [planning, setPlanning] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const next = schedules.find((s) => s.starts_on > today)

  async function addSchedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await act('schedule-add', { frame_id: frame.id, gallery_id: fd.get('gallery_id'), starts_on: fd.get('starts_on'), ends_on: fd.get('ends_on') || null })
    setPlanning(false)
  }

  async function rename(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const room = (new FormData(e.currentTarget).get('room') as string).trim()
    if (room) await act('frame-save', { id: frame.id, room })
    setRenaming(false)
  }

  return (
    <article className="frame-card">
      <div className="frame-art" style={{ background: tone }}>
        {current?.cover && <img src={current.cover} alt="" loading="lazy" />}
        <span className="room-pill">{frame.room}</span>
        <div className="now">
          <span className="now-label">NOW SHOWING</span>
          <span className="now-name display">{current ? current.name : 'Nothing yet'}</span>
        </div>
      </div>
      <div className="frame-body">
        <div className="meta">
          {current ? <>{current.count} photos · {current.music_url ? 'With music' : 'No music'}</> : 'Pick a gallery below'}
        </div>
        {next && (
          <div className="next">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
            Switches to {byId.get(next.gallery_id)?.name || 'a gallery'} on {niceDate(next.starts_on)}
          </div>
        )}
        <label className="field">
          <span>Usually shows</span>
          <select value={frame.gallery_id ?? ''} onChange={(e) => act('frame-set', { id: frame.id, gallery_id: e.target.value || null })}>
            <option value="">Nothing</option>
            {galleries.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </label>

        {schedules.length > 0 && (
          <ul className="sched-list">
            {schedules.map((s) => (
              <li key={s.id}>
                <span>
                  {byId.get(s.gallery_id)?.name || 'Gallery'} · {niceDate(s.starts_on)}
                  {s.ends_on ? ` – ${niceDate(s.ends_on)}` : ' onward'}
                </span>
                <button type="button" className="link-btn" onClick={() => act('schedule-delete', { id: s.id })} aria-label={`Remove ${byId.get(s.gallery_id)?.name} from the schedule`}>Remove</button>
              </li>
            ))}
          </ul>
        )}

        {planning ? (
          <form className="plan" onSubmit={addSchedule}>
            <label className="field">
              <span>Show</span>
              <select name="gallery_id" required defaultValue="">
                <option value="" disabled>Choose a gallery</option>
                {galleries.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
            <div className="row">
              <label className="field grow"><span>From</span><input type="date" name="starts_on" required min={today} defaultValue={today} /></label>
              <label className="field grow"><span>Until (optional)</span><input type="date" name="ends_on" min={today} /></label>
            </div>
            <div className="row">
              <button className="btn btn-light grow" type="submit">Add to schedule</button>
              <button className="btn btn-ghost-dark" type="button" onClick={() => setPlanning(false)}>Cancel</button>
            </div>
          </form>
        ) : renaming ? (
          <form className="row" onSubmit={rename}>
            <label className="field grow"><span>Frame name</span><input name="room" defaultValue={frame.room} maxLength={60} required /></label>
            <button className="btn btn-light" type="submit">Save</button>
          </form>
        ) : (
          <div className="row">
            <button type="button" className="btn btn-light grow" onClick={() => setPlanning(true)} disabled={!galleries.length}>Schedule a change</button>
            <a className="btn btn-ghost-dark" href={`/frames/f/${frame.slug}`} target="_blank" rel="noreferrer">Play</a>
          </div>
        )}
        <div className="row tiny-actions">
          <span className="muted small">Code: /f/{frame.slug}</span>
          <span className="grow" />
          <button type="button" className="link-btn" onClick={() => setRenaming((r) => !r)}>Rename</button>
          <button
            type="button"
            className="link-btn danger"
            onClick={() => { if (confirm(`Delete the "${frame.room}" frame? Its printed QR code will stop working.`)) act('frame-delete', { id: frame.id }) }}
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  )
}
