import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { upload } from '@vercel/blob/client'
import { API, api, img, isVideo, type Gallery, type Photo } from './api'
import { AddFrameForm, FrameReady, type NewFrame } from './AddFrame'

type GalleryData = { gallery: Gallery; photos: Photo[]; usedBy: { room: string; slug: string }[] }

function tally(items: Photo[]) {
  const videos = items.filter((p) => isVideo(p.url)).length
  const photos = items.length - videos
  const parts = [`${photos} photo${photos === 1 ? '' : 's'}`]
  if (videos) parts.push(`${videos} video${videos === 1 ? '' : 's'}`)
  return parts.join(' · ')
}

function safeName(name: string) {
  return name.replace(/[^\w.-]+/g, '-').slice(-80) || 'file'
}

export default function GalleryEdit() {
  const { id } = useParams()
  const gid = Number(id)
  const navigate = useNavigate()
  const [data, setData] = useState<GalleryData | null>(null)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<{ done: number; total: number; failed: number } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [dragId, setDragId] = useState<number | null>(null)
  const [ready, setReady] = useState<NewFrame | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const musicInput = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      setData(await api<GalleryData>('gallery', { query: { id: gid } }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the gallery')
    }
  }, [gid])
  useEffect(() => { load() }, [load])

  // Arriving from "Put it in one" on the manage screen jumps straight to the frame box.
  useEffect(() => {
    if (data && window.location.hash === '#put-in-frame') document.getElementById('put-in-frame')?.scrollIntoView({ block: 'center' })
  }, [data])

  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'))
    if (!list.length) return
    let done = 0
    let failed = 0
    setProgress({ done, total: list.length, failed })
    // A few at a time keeps big batches from overwhelming a phone connection.
    const queue = [...list]
    async function worker() {
      for (let f = queue.shift(); f; f = queue.shift()) {
        try {
          const blob = await upload(`galleries/${gid}/${safeName(f.name)}`, f, {
            access: 'public',
            handleUploadUrl: `${API}?op=upload`,
            // big phone videos go up in pieces, so one dropped connection does not lose the whole file
            multipart: f.size > 20 * 1024 * 1024,
          })
          await api('photo-add', { body: { gallery_id: gid, url: blob.url, pathname: blob.pathname } })
        } catch {
          failed++
        }
        done++
        setProgress({ done, total: list.length, failed })
      }
    }
    await Promise.all([worker(), worker(), worker()])
    await load()
    if (!failed) setProgress(null)
  }

  async function setMusic(file: File) {
    try {
      const blob = await upload(`music/${gid}/${safeName(file.name)}`, file, { access: 'public', handleUploadUrl: `${API}?op=upload` })
      await api('gallery-music', { body: { id: gid, url: blob.url, name: file.name.replace(/\.[^.]+$/, '') } })
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not upload the song')
    }
  }

  async function saveDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await api('gallery-save', { body: { id: gid, name: fd.get('name'), caption: fd.get('caption') } })
    await load()
  }

  async function reorder(ids: number[]) {
    if (!data) return
    const map = new Map(data.photos.map((p) => [p.id, p]))
    setData({ ...data, photos: ids.map((i) => map.get(i)!).filter(Boolean) })
    await api('photo-order', { body: { gallery_id: gid, ids } })
  }

  function move(index: number, by: number) {
    if (!data) return
    const ids = data.photos.map((p) => p.id)
    const to = index + by
    if (to < 0 || to >= ids.length) return
    ;[ids[index], ids[to]] = [ids[to], ids[index]]
    reorder(ids)
  }

  function dropOn(targetId: number) {
    if (!data || dragId === null || dragId === targetId) return
    const ids = data.photos.map((p) => p.id).filter((i) => i !== dragId)
    ids.splice(ids.indexOf(targetId), 0, dragId)
    setDragId(null)
    reorder(ids)
  }

  if (error) return <div className="wrap pad"><p className="error" role="alert">{error}</p><Link to="/">← Back to frames</Link></div>
  if (!data) return <p className="muted pad wrap">Loading…</p>
  const g = data.gallery

  return (
    <div className={'wrap editor' + (data.photos.length ? '' : ' empty')}>
      <div className="crumbs"><Link to="/#manage">← Archive</Link></div>

      <form className="card details" onSubmit={saveDetails} key={g.id + g.name + g.caption}>
        <div className="row">
          <label className="field grow"><span>Album name</span><input name="name" defaultValue={g.name} maxLength={80} required /></label>
          <label className="field grow"><span>A line shown on the slideshow (optional)</span><input name="caption" defaultValue={g.caption} maxLength={300} placeholder="Summer 2019 · Cape Cod" /></label>
          <button className="btn btn-light" type="submit">Save</button>
        </div>
        <p className="muted small">
          <Link to={`/preview/${g.id}`}>Preview the slideshow</Link>
        </p>
      </form>

      {ready && <FrameReady frame={ready} onDone={() => setReady(null)} />}

      {data.usedBy.length > 0 ? (
        <section id="put-in-frame" className="card frame-status ok">
          <div className="grow">
            <h3>Showing in {data.usedBy.map((u) => u.room).join(', ')}</h3>
            <p className="muted small">Anyone who scans {data.usedBy.length > 1 ? 'those frames' : 'that frame'} sees this album.</p>
          </div>
          <div className="row">
            {data.usedBy.map((u) => (
              <Link key={u.slug} className="btn btn-light" to={`/print?frame=${encodeURIComponent(u.slug)}`}>Print {u.room} code</Link>
            ))}
          </div>
        </section>
      ) : (
        <section id="put-in-frame" className="card frame-status warn">
          <div className="frame-status-copy">
            <span className="badge-warn">Next step</span>
            <h3>Put this album in a frame</h3>
            <p className="muted">Nobody can scan it until it is. A frame is a spot in your house; it gets a QR code you print once.</p>
          </div>
          <AddFrameForm compact galleries={[]} galleryId={g.id} lockGallery onAdded={async (f) => { setReady(f); await load() }} />
        </section>
      )}

      <section className="card music">
        <div>
          <h3>Music</h3>
          {g.music_url ? (
            <div className="row">
              <span className="song">{g.music_name || 'Song'}</span>
              <audio controls preload="none" src={g.music_url} />
              <button type="button" className="link-btn danger" onClick={async () => { await api('gallery-music', { body: { id: gid, url: null } }); load() }}>Remove</button>
            </div>
          ) : (
            <p className="muted">No music. The slideshow plays silently.</p>
          )}
        </div>
        <button type="button" className="btn btn-ghost-dark" onClick={() => musicInput.current?.click()}>{g.music_url ? 'Change song' : 'Add a song'}</button>
        <input ref={musicInput} type="file" accept="audio/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) setMusic(f); e.target.value = '' }} />
      </section>

      <section
        className={'dropzone' + (dragOver ? ' over' : '')}
        onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragOver(true) } }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { if (e.dataTransfer.files.length) { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) } }}
      >
        <p className="display">Drop photos or videos here</p>
        <p className="muted">or</p>
        <button type="button" className="btn btn-red" onClick={() => fileInput.current?.click()}>Choose photos or videos</button>
        <input ref={fileInput} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }} />
        {progress && (
          <p role="status" className="progress">
            Uploaded {progress.done} of {progress.total}
            {progress.failed ? ` · ${progress.failed} failed` : ''}
            {progress.done === progress.total && progress.failed ? <button type="button" className="link-btn" onClick={() => setProgress(null)}> Dismiss</button> : null}
          </p>
        )}
      </section>

      <div className="section-head">
        <h2 className="display">{tally(data.photos)}</h2>
        <span className="muted small">Drag to reorder, or use the arrows</span>
      </div>
      <div className="photo-grid">
        {data.photos.map((p, i) => (
          <figure
            key={p.id}
            className={'photo' + (dragId === p.id ? ' dragging' : '')}
            draggable
            onDragStart={() => setDragId(p.id)}
            onDragEnd={() => setDragId(null)}
            onDragOver={(e) => { if (dragId !== null) e.preventDefault() }}
            onDrop={(e) => { e.preventDefault(); dropOn(p.id) }}
          >
            {isVideo(p.url) ? (
              <>
                <video src={`${p.url}#t=0.5`} muted playsInline preload="metadata" aria-label={p.caption || `Video ${i + 1}`} />
                <span className="vid-badge" aria-hidden="true">▶ Video</span>
              </>
            ) : (
              <img src={img(p.url, 640)} alt={p.caption || `Photo ${i + 1}`} loading="lazy" />
            )}
            <span className="num">{i + 1}</span>
            <figcaption>
              <input
                aria-label={`Caption for photo ${i + 1}`}
                defaultValue={p.caption}
                placeholder="Add a caption"
                maxLength={300}
                onBlur={(e) => { if (e.target.value !== p.caption) api('photo-caption', { body: { id: p.id, caption: e.target.value } }) }}
              />
              <div className="row">
                <button type="button" className="icon-btn" aria-label={`Move photo ${i + 1} earlier`} onClick={() => move(i, -1)} disabled={i === 0}>←</button>
                <button type="button" className="icon-btn" aria-label={`Move photo ${i + 1} later`} onClick={() => move(i, 1)} disabled={i === data.photos.length - 1}>→</button>
                <span className="grow" />
                <button type="button" className="link-btn danger" onClick={async () => { if (confirm(isVideo(p.url) ? 'Delete this video?' : 'Delete this photo?')) { await api('photo-delete', { body: { id: p.id } }); load() } }}>Delete</button>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="danger-zone">
        <button
          type="button"
          className="link-btn danger"
          onClick={async () => {
            if (!confirm(`Delete "${g.name}" and all ${tally(data.photos)}? This cannot be undone.`)) return
            await api('gallery-delete', { body: { id: gid } })
            navigate('/')
          }}
        >
          Delete this album
        </button>
      </div>
    </div>
  )
}
