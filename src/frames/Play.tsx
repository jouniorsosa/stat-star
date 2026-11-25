import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, ApiError, type PlayData } from './api'

const SLIDE_MS = 6000

/** Full-screen slideshow. /f/:slug is what a QR code opens; /preview/:id is for checking a gallery. */
export default function Play({ preview = false }: { preview?: boolean }) {
  const { slug, id } = useParams()
  const [data, setData] = useState<PlayData | null>(null)
  const [error, setError] = useState('')
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [started, setStarted] = useState(false)
  const [musicOn, setMusicOn] = useState(true)
  const audio = useRef<HTMLAudioElement>(null)

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

  // advance
  useEffect(() => {
    if (!ready || !playing || count < 2) return
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), SLIDE_MS)
    return () => clearTimeout(t)
  }, [ready, playing, index, count])

  // preload the next photo
  useEffect(() => {
    if (count > 1) { const img = new Image(); img.src = photos[(index + 1) % count].url }
  }, [index, count, photos])

  // music follows play/pause and the music toggle
  useEffect(() => {
    const a = audio.current
    if (!a || !started) return
    if (playing && musicOn) a.play().catch(() => {})
    else a.pause()
  }, [playing, musicOn, started])

  const go = useCallback((by: number) => setIndex((i) => (i + by + count) % count), [count])

  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p) }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [go])

  // swipe
  const touchX = useRef<number | null>(null)

  if (error) return <div className="play-msg"><span className="brand-mark" aria-hidden="true" /><p>{error}</p></div>
  if (!data) return <div className="play-msg"><span className="brand-mark spin" aria-hidden="true" /><p>Loading…</p></div>
  if (!data.gallery || !count) {
    return (
      <div className="play-msg">
        <span className="brand-mark" aria-hidden="true" />
        <p className="display">{data.frame.room}</p>
        <p>Nothing is playing on this frame right now. Check back soon.</p>
      </div>
    )
  }

  const g = data.gallery
  const photo = photos[index]

  return (
    <div
      className="play"
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        touchX.current = null
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
      }}
    >
      {photos.map((p, i) => (
        <img
          key={p.id}
          src={i === index || i === (index + 1) % count || i === (index - 1 + count) % count ? p.url : undefined}
          alt={i === index ? p.caption || `${g.name}, photo ${i + 1}` : ''}
          aria-hidden={i !== index}
          className={'slide' + (i === index ? ' on' : '') + (i === index && playing ? ' drift' : '')}
        />
      ))}
      <div className="shade-top" aria-hidden="true" />
      <div className="shade-bottom" aria-hidden="true" />

      <button type="button" className="tap tap-prev" aria-label="Previous photo" onClick={() => go(-1)} />
      <button type="button" className="tap tap-next" aria-label="Next photo" onClick={() => go(1)} />

      <div className="play-top">
        <div className="bar" role="img" aria-label={`Photo ${index + 1} of ${count}`}>
          <span style={{ width: `${((index + 1) / count) * 100}%` }} />
        </div>
        <div className="play-head">
          <span className="room"><span className="brand-mark small" aria-hidden="true" />{data.frame.room}</span>
          {hasMusic && started && (
            <button type="button" className="round" aria-label={musicOn ? 'Turn music off' : 'Turn music on'} aria-pressed={musicOn} onClick={() => setMusicOn((m) => !m)}>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" />{!musicOn && <path d="M3 3l18 18" />}
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="play-caption">
        {g.caption && <div className="kicker">{g.caption}</div>}
        <h1 className="display">{g.name}</h1>
        {photo.caption && <p>{photo.caption}</p>}
      </div>

      <div className="play-controls">
        {hasMusic && <div className="eq" aria-hidden="true" data-on={playing && musicOn ? '1' : '0'}><i /><i /><i /><i /></div>}
        <div className="pc-text">
          <span className="pc-title">{hasMusic ? g.music_name || 'Music' : g.name}</span>
          <span className="pc-sub">Photo {index + 1} of {count}</span>
        </div>
        <button type="button" className="round red" aria-label={playing ? 'Pause slideshow' : 'Play slideshow'} onClick={() => setPlaying((p) => !p)}>
          {playing
            ? <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1" /><rect x="14" y="4" width="5" height="16" rx="1" /></svg>
            : <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l13 8-13 8z" /></svg>}
        </button>
      </div>

      {hasMusic && <audio ref={audio} src={g.music_url!} loop preload="auto" />}

      {hasMusic && !started && (
        <div className="start">
          <p className="kicker">{data.frame.room}</p>
          <h1 className="display">{g.name}</h1>
          <button type="button" className="btn btn-red big" onClick={() => setStarted(true)}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l13 8-13 8z" /></svg> Play with music
          </button>
          <button type="button" className="link-btn light" onClick={() => { setMusicOn(false); setStarted(true) }}>Watch without sound</button>
        </div>
      )}
    </div>
  )
}
