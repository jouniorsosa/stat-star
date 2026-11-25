import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, type Frame, type Gallery, type Overview, type Schedule } from './api'
import { AddFrameForm, FrameReady, Steps, type NewFrame } from './AddFrame'
import { useSession } from './session'

const TONES = ['#5B3A29', '#1F4B55', '#4A3F6B', '#3B5230', '#5C2B3B', '#5A4A1E', '#2E4466', '#6B2A22']

export function photoCount(n?: number) {
  return `${n ?? 0} photo${n === 1 ? '' : 's'}`
}

function niceDate(d: string) {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function Manage() {
  const { refresh: refreshSession } = useSession()
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState('')
  const [justAdded, setJustAdded] = useState<NewFrame | null>(null)
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
    const name = (new FormData(e.currentTarget).get('name') as string).trim()
    if (!name) return
    const r = await api<{ id: number }>('gallery-save', { body: { name } })
    navigate(`/gallery/${r.id}`)
  }

  async function signOut() {
    await api('logout')
    await refreshSession()
  }

  if (error) return <div className="wrap pad"><p className="error" role="alert">{error}</p></div>
  if (!data) return <p className="muted pad wrap">Loading your frames…</p>

  const inFrames = (g: Gallery) => data.frames.filter((f) => f.current_gallery_id === g.id || f.gallery_id === g.id)

  return (
    <div className="wrap manage">
      <div className="manage-head">
        <div>
          <h2 className="display">Your house, frame by frame</h2>
          <p className="muted">Galleries hold the photos. Frames are the spots in your house, each with a QR code. A frame shows one gallery at a time.</p>
        </div>
        <button type="button" className="link-btn" onClick={signOut}>Sign out</button>
      </div>

      <Steps galleries={data.galleries.length} frames={data.frames.length} />

      {justAdded && <FrameReady frame={justAdded} onDone={() => setJustAdded(null)} />}

      <section className="section" id="frames">
        <div className="section-head">
          <div>
            <h2 className="display">Frames</h2>
            <p className="muted small">Each one has its own QR code that never changes.</p>
          </div>
          {data.frames.length > 0 && <Link className="btn btn-ghost-dark" to="/print">Print all codes</Link>}
        </div>
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
          <div className="add-tile">
            <h3><span className="plus" aria-hidden="true">+</span> Add a frame</h3>
            {data.galleries.length === 0 && <p className="muted small">Tip: make a gallery first, so the frame has something to show.</p>}
            <AddFrameForm
              compact
              galleries={data.galleries}
              takenRooms={data.frames.map((f) => f.room)}
              onAdded={async (f) => { setJustAdded(f); await load() }}
            />
          </div>
        </div>
      </section>

      <section className="section" id="galleries">
        <div className="section-head">
          <div>
            <h2 className="display">Galleries</h2>
            <p className="muted small">Photos and an optional song. Open one to add or reorder photos.</p>
          </div>
        </div>
        <div className="gallery-grid">
          <form className="add-tile new-gallery" onSubmit={newGallery}>
            <h3><span className="plus" aria-hidden="true">+</span> New gallery</h3>
            <label className="field">
              <span>Name it</span>
              <input name="name" placeholder="Christmas 2025" maxLength={80} required />
            </label>
            <button className="btn btn-red" type="submit">Create and add photos</button>
          </form>
          {data.galleries.map((g, i) => {
            const frames = inFrames(g)
            const queued = data.schedules.some((s) => s.gallery_id === g.id)
            return (
              <article key={g.id} className="gallery-card">
                <Link to={`/gallery/${g.id}`} className="gallery-cover" style={{ background: TONES[i % TONES.length] }} aria-label={`Open ${g.name}`}>
                  {g.cover && <img src={g.cover} alt="" loading="lazy" />}
                  <span className="count-pill">{photoCount(g.count)}{g.music_url ? ' · ♪' : ''}</span>
                </Link>
                <div className="gallery-body">
                  <Link to={`/gallery/${g.id}`} className="g-title display">{g.name}</Link>
                  {frames.length ? (
                    <span className="status ok">In {frames.map((f) => f.room).join(', ')}</span>
                  ) : queued ? (
                    <span className="status ok">Scheduled</span>
                  ) : (
                    <span className="status warn">
                      Not in a frame yet · <Link to={`/gallery/${g.id}#put-in-frame`}>Put it in one</Link>
                    </span>
                  )}
                </div>
              </article>
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
  const [panel, setPanel] = useState<'none' | 'schedule' | 'rename'>('none')
  const next = schedules.find((s) => s.starts_on > today)

  async function addSchedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await act('schedule-add', { frame_id: frame.id, gallery_id: fd.get('gallery_id'), starts_on: fd.get('starts_on'), ends_on: fd.get('ends_on') || null })
    setPanel('none')
  }

  async function rename(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const room = (new FormData(e.currentTarget).get('room') as string).trim()
    if (room) await act('frame-save', { id: frame.id, room })
    setPanel('none')
  }

  return (
    <article className="frame-card">
      <div className="frame-art" style={{ background: tone }}>
        {current?.cover && <img src={current.cover} alt="" loading="lazy" />}
        <span className="room-pill">{frame.room}</span>
        <div className="now">
          <span className="now-label">{current ? 'NOW SHOWING' : 'SHOWING'}</span>
          <span className="now-name display">{current ? current.name : 'Nothing yet'}</span>
        </div>
      </div>
      <div className="frame-body">
        <label className="field">
          <span>Shows</span>
          <select value={frame.gallery_id ?? ''} onChange={(e) => act('frame-set', { id: frame.id, gallery_id: e.target.value || null })}>
            <option value="">Nothing</option>
            {galleries.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </label>

        {current && frame.gallery_id !== current.id && (
          <div className="next">On schedule today: {current.name}</div>
        )}
        {next && (
          <div className="next">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
            Switches to {byId.get(next.gallery_id)?.name || 'a gallery'} on {niceDate(next.starts_on)}
          </div>
        )}

        <div className="frame-actions">
          <Link className="btn btn-light" to={`/print?frame=${encodeURIComponent(frame.slug)}`}>Print code</Link>
          <a className="btn btn-ghost-dark" href={`/frames/f/${frame.slug}`} target="_blank" rel="noreferrer">Play</a>
        </div>

        {panel === 'schedule' ? (
          <form className="plan" onSubmit={addSchedule}>
            <strong>Show something else for a while</strong>
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
            <p className="hint">Afterwards it goes back to “{frame.gallery_id ? byId.get(frame.gallery_id)?.name : 'Nothing'}”.</p>
            <div className="row">
              <button className="btn btn-light grow" type="submit">Add to schedule</button>
              <button className="btn btn-ghost-dark" type="button" onClick={() => setPanel('none')}>Cancel</button>
            </div>
          </form>
        ) : panel === 'rename' ? (
          <form className="plan" onSubmit={rename}>
            <label className="field"><span>Frame name</span><input name="room" defaultValue={frame.room} maxLength={60} required /></label>
            <p className="hint">Its printed code keeps working.</p>
            <div className="row">
              <button className="btn btn-light grow" type="submit">Save</button>
              <button className="btn btn-ghost-dark" type="button" onClick={() => setPanel('none')}>Cancel</button>
            </div>
          </form>
        ) : null}

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

        <div className="row tiny-actions">
          {panel === 'none' && galleries.length > 0 && <button type="button" className="link-btn" onClick={() => setPanel('schedule')}>Schedule a change</button>}
          <span className="grow" />
          <button type="button" className="link-btn" onClick={() => setPanel(panel === 'rename' ? 'none' : 'rename')}>Rename</button>
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
