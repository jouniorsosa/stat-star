import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError, img, screenWidth, type PlayData } from './api'

const SPEEDS = { slow: 9000, normal: 6000, fast: 3500 } as const
type Speed = keyof typeof SPEEDS
const MAX_PIPS = 40

/** Full-screen Ken Burns slideshow. /f/:slug is what a QR code opens; /preview/:id is for checking an album. */
export default function Play({ preview = false }: { preview?: boolean }) {
  const { slug, id } = useParams()
  const [data, setData] = useState<PlayData | null>(null)
  const [error, setError] = useState('')
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [reverse, setReverse] = useState(false)
  const [speed, setSpeed] = useState<Speed>('normal')
  const [musicOn, setMusicOn] = useState(true)
  const [started, setStarted] = useState(false)
  const [idle, setIdle] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const audio = useRef<HTMLAudioElement>(null)
  const idleTimer = useRef<number | undefined>(undefined)
  const touchX = useRef<number | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        if (preview) {
          const g = await api<{ gallery: PlayData['gallery']; photos: PlayData['photos'] }>('gallery', { query: { id: Number(id) } })
          setData({ frame: { room: 'Preview' }, gallery: g.gallery, photos: g.photos })
        } else {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
          setData(await api<PlayData>('play', { query: { slug: slug || '', tz } }))
        }
      } catch (e) {
        setError(e instanceof ApiError && e.status === 404 ? 'This code does not match a frame.' : 'The slideshow could not load. Check your connection and try again.')
      }
    })()
  }, [slug, id, preview])

  const photos = data?.photos || []
  const count = photos.length
  const hasMusic = !!data?.gallery?.music_url
  const ready = count > 0 && (started || !hasMusic)
  const duration = SPEEDS[speed]

  // show the controls, then fade them after a few quiet seconds
  const wake = useCallback(() => {
    setIdle(false)
    window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => setIdle(true), 3500)
  }, [])
  useEffect(() => { wake(); return () => window.clearTimeout(idleTimer.current) }, [wake])

  const go = useCallback((by: number) => {
    setIdx((i) => (i + by + count) % count)
    wake()
  }, [count, wake])

  // advance
  useEffect(() => {
    if (!ready || !playing || count < 2) return
    const t = window.setTimeout(() => setIdx((i) => (i + (reverse ? -1 : 1) + count) % count), duration)
    return () => window.clearTimeout(t)
  }, [ready, playing, reverse, duration, idx, count])

  // preload neighbours
  useEffect(() => {
    if (count > 1) for (const k of [1, -1]) { const pre = new Image(); pre.src = img(photos[(idx + k + count) % count].url, screenWidth()) }
  }, [idx, count, photos])

  // music follows play/pause and the music button
  useEffect(() => {
    const a = audio.current
    if (!a || !started) return
    if (playing && musicOn) a.play().catch(() => {})
    else a.pause()
  }, [playing, musicOn, started])

  const canFullscreen = typeof document !== 'undefined' && !!document.fullscreenEnabled
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) root.current?.requestFullscreen?.().catch(() => {})
    else document.exitFullscreen?.()
  }, [])

  useEffect(() => {
    function key(e: KeyboardEvent) {
      wake()
      if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p) }
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key.toLowerCase() === 'r') setReverse((r) => !r)
      else if (e.key.toLowerCase() === 'm') setMusicOn((m) => !m)
      else if (e.key.toLowerCase() === 'f') toggleFullscreen()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [go, wake, toggleFullscreen])

  if (error) return <div className="p-msg"><div className="mono">— The Sosa Family Archive —</div><h1>Not found</h1><p>{error}</p></div>
  if (!data) return <div className="p-msg"><div className="mono">— The Sosa Family Archive —</div><p>Opening the album…</p></div>
  if (!data.gallery || !count) {
    return (
      <div className="p-msg">
        <div className="mono">— {data.frame.room} —</div>
        <h1>Nothing on display</h1>
        <p>This frame is resting between albums. Check back soon.</p>
      </div>
    )
  }

  const g = data.gallery
  const photo = photos[idx]
  const pad = (n: number) => String(n).padStart(2, '0')
  const progress = ((idx + 1) / count) * 100

  return (
    <div
      ref={root}
      className={'player' + (idle && ready ? ' idle hide-cursor' : '') + (playing ? '' : ' paused')}
      style={{ ['--dur' as string]: `${duration + 600}ms` }}
      onMouseMove={wake}
      onTouchStart={(e) => { wake(); touchX.current = e.touches[0].clientX }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        touchX.current = null
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
      }}
    >
      {photos.map((p, i) => {
        const near = i === idx || i === (idx + 1) % count || i === (idx - 1 + count) % count
        return (
          <div key={p.id} className={`slide kb${i % 4}` + (i === idx ? ' on' : '')} aria-hidden={i !== idx}>
            {near && <img src={img(p.url, screenWidth())} alt={i === idx ? p.caption || `${g.name}, photograph ${i + 1}` : ''} />}
          </div>
        )
      })}
      <div className="grain" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />

      <button type="button" className="p-tap prev" aria-label="Previous photograph" onClick={() => go(-1)} />
      <button type="button" className="p-tap next" aria-label="Next photograph" onClick={() => go(1)} />

      <div className="p-top fadeable">
        <div className="p-top-left">
          {preview && <Link className="p-btn-outline" to={`/gallery/${id}`}><span aria-hidden="true">←</span> Album</Link>}
          <div className={preview ? 'p-title-block' : ''}>
            <div className="p-title">{g.name}</div>
            <div className="p-sub">{[g.caption, data.frame.room].filter(Boolean).join(' · ')}</div>
          </div>
        </div>
        <div className="p-count" aria-label={`Photograph ${idx + 1} of ${count}`}>
          <b>{pad(idx + 1)}</b><span>/ {pad(count)}</span>
        </div>
      </div>

      {hasMusic && started && musicOn && (
        <div className="p-music fadeable">
          <div className={'bars' + (playing ? ' on' : '')} aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="mono">{g.music_name || 'Music'}</div>
        </div>
      )}

      <div className="p-caption fadeable">
        <div className="mono">— {g.name} —</div>
        {photo.caption && <div className="p-cap-text">{photo.caption}</div>}
      </div>

      {count <= MAX_PIPS && count > 1 && (
        <div className="p-pips fadeable">
          {photos.map((p, i) => (
            <button key={p.id} type="button" className={'p-pip' + (i === idx ? ' on' : '')} aria-label={`Go to photograph ${i + 1}`} onClick={() => { setIdx(i); wake() }}>
              <i />
            </button>
          ))}
        </div>
      )}

      <div className="p-controls fadeable">
        <div className="p-controls-inner">
          <div className="p-cluster">
            <button type="button" className={'p-ctrl hide-sm' + (reverse ? ' active' : '')} aria-pressed={reverse} aria-label="Play in reverse" onClick={() => setReverse((r) => !r)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 8h13a5 5 0 0 1 0 10h-6" /><polyline points="6 5 3 8 6 11" /></svg>
            </button>
            <button type="button" className="p-ctrl" aria-label="Previous photograph" onClick={() => go(-1)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 6h2v12H6zm3 6l8-6v12z" /></svg>
            </button>
            <button type="button" className="p-ctrl primary" aria-label={playing ? 'Pause' : 'Play'} onClick={() => { setPlaying((p) => !p); wake() }}>
              {playing
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z" /></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>}
            </button>
            <button type="button" className="p-ctrl" aria-label="Next photograph" onClick={() => go(1)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 6v12l8-6zM16 6h2v12h-2z" /></svg>
            </button>
          </div>

          <div className="p-progress">
            <div className="p-track">
              <div className="p-fill" style={{ width: `${progress}%` }} />
              <div key={`${idx}-${playing}-${speed}`} className={'p-tick' + (playing && ready ? ' run' : '')} />
            </div>
          </div>

          <div className="p-cluster">
            <div className="p-speed hide-sm" role="group" aria-label="Speed">
              {(Object.keys(SPEEDS) as Speed[]).map((s) => (
                <button key={s} type="button" aria-pressed={speed === s} onClick={() => setSpeed(s)}>{s}</button>
              ))}
            </div>
            {hasMusic && (
              <button type="button" className={'p-ctrl' + (musicOn ? ' active' : '')} aria-pressed={musicOn} aria-label={musicOn ? 'Turn music off' : 'Turn music on'} onClick={() => { setMusicOn((m) => !m); setStarted(true) }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />{!musicOn && <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />}</svg>
              </button>
            )}
            {canFullscreen && (
              <button type="button" className="p-ctrl hide-sm" aria-label="Full screen" onClick={toggleFullscreen}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {hasMusic && <audio ref={audio} src={g.music_url!} loop preload="auto" />}

      {hasMusic && !started && (
        <div className="p-start">
          <div className="mono">— {data.frame.room} —</div>
          <h1>{g.name}</h1>
          <div className="ornament" aria-hidden="true"><span>◆</span><hr className="rule" /><span>◆</span><hr className="rule" /><span>◆</span></div>
          <button type="button" className="btn" onClick={() => setStarted(true)}>▶ Play with music</button>
          <button type="button" className="link-btn" onClick={() => { setMusicOn(false); setStarted(true) }}>Watch without sound</button>
        </div>
      )}
    </div>
  )
}
