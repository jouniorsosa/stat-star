import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { upload } from '@vercel/blob/client'
import { API, api, type Gallery, type Photo } from './api'

type GalleryData = { gallery: Gallery; photos: Photo[]; usedBy: { room: string }[] }

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

  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!list.length) return
    let done = 0
    let failed = 0
    setProgress({ done, total: list.length, failed })
    // A few at a time keeps big batches from overwhelming a phone connection.
    const queue = [...list]
    async function worker() {
      for (let f = queue.shift(); f; f = queue.shift()) {
        try {
          const blob = await upload(`galleries/${gid}/${safeName(f.name)}`, f, { access: 'public', handleUploadUrl: `${API}?op=upload` })
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
    <div className="wrap editor">
      <div className="crumbs"><Link to="/#manage">← All frames and galleries</Link></div>

      <form className="card details" onSubmit={saveDetails} key={g.id + g.name + g.caption}>
        <div className="row">
          <label className="field grow"><span>Gallery name</span><input name="name" defaultValue={g.name} maxLength={80} required /></label>
          <label className="field grow"><span>A line shown on the slideshow (optional)</span><input name="caption" defaultValue={g.caption} maxLength={300} placeholder="Summer 2019 · Cape Cod" /></label>
          <button className="btn btn-light" type="submit">Save</button>
        </div>
        <p className="muted small">
          {data.usedBy.length ? `Usually shown in: ${data.usedBy.map((u) => u.room).join(', ')}.` : 'Not set as the usual gallery for any frame yet.'}{' '}
          <Link to={`/preview/${g.id}`}>Preview the slideshow</Link>
        </p>
      </form>

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
        <p className="display">Drop photos here</p>
        <p className="muted">or</p>
        <button type="button" className="btn btn-red" onClick={() => fileInput.current?.click()}>Choose photos</button>
        <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }} />
        {progress && (
          <p role="status" className="progress">
            Uploaded {progress.done} of {progress.total}
            {progress.failed ? ` · ${progress.failed} failed` : ''}
            {progress.done === progress.total && progress.failed ? <button type="button" className="link-btn" onClick={() => setProgress(null)}> Dismiss</button> : null}
          </p>
        )}
      </section>

      <div className="section-head">
        <h2 className="display">{data.photos.length} photo{data.photos.length === 1 ? '' : 's'}</h2>
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
            <img src={p.url} alt={p.caption || `Photo ${i + 1}`} loading="lazy" />
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
                <button type="button" className="link-btn danger" onClick={async () => { if (confirm('Delete this photo?')) { await api('photo-delete', { body: { id: p.id } }); load() } }}>Delete</button>
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
            if (!confirm(`Delete "${g.name}" and all ${data.photos.length} photos? This cannot be undone.`)) return
            await api('gallery-delete', { body: { id: gid } })
            navigate('/')
          }}
        >
          Delete this gallery
        </button>
      </div>
    </div>
  )
}
