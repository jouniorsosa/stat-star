import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { api, FAMILY_NAME, frameUrl, img, type Overview } from './api'
import { AddFrameForm } from './AddFrame'
import { photoCount } from './Manage'

type Card = { id: number; room: string; slug: string; qr: string; showing: string | null; cover: string | null; count: number }
type Style = 'cards' | 'minimal'

export default function Print() {
  const [params, setParams] = useSearchParams()
  const only = params.get('frame')
  const [style, setStyle] = useState<Style>('cards')
  const [data, setData] = useState<{ overview: Overview; cards: Card[] } | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const o = await api<Overview>('overview')
      const byId = new Map(o.galleries.map((g) => [g.id, g]))
      const cards = await Promise.all(
        o.frames.map(async (f) => {
          const g = f.current_gallery_id ? byId.get(f.current_gallery_id) : undefined
          return {
            id: f.id,
            room: f.room,
            slug: f.slug,
            showing: g?.name ?? null,
            cover: g?.cover ?? null,
            count: g?.count ?? 0,
            qr: await QRCode.toDataURL(frameUrl(f.slug), { margin: 0, width: 600, errorCorrectionLevel: 'M', color: { dark: '#2a211a', light: '#faf4e6' } }),
          }
        }),
      )
      setData({ overview: o, cards })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load frames')
    }
  }, [])
  useEffect(() => { load() }, [load])

  if (error) return <div className="wrap pad"><p className="error" role="alert">{error}</p></div>
  if (!data) return <p className="muted pad wrap">Setting the type…</p>

  const { overview, cards } = data
  const shown = only ? cards.filter((c) => c.slug === only) : cards
  const printed = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  if (!cards.length) {
    return (
      <div className="wrap">
        <div className="crumbs"><Link to="/#frames">← Archive</Link></div>
        <div className="card empty-card">
          <div className="mono">— QR Sheet —</div>
          <h2>No frames to print yet</h2>
          <p className="muted">
            Codes belong to <strong>frames</strong>, not albums. Add a frame for the spot where it will hang,
            choose what it shows, and its card appears here.
          </p>
          <AddFrameForm galleries={overview.galleries} onAdded={async (f) => { await load(); setParams({ frame: f.slug }) }} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="print-bar no-print">
        <Link className="btn ghost sm" to="/#frames">← Archive</Link>
        <div className="seg">
          <span className="mono">Sheet style:</span>
          <button type="button" className={'btn sm' + (style === 'cards' ? '' : ' ghost')} aria-pressed={style === 'cards'} onClick={() => setStyle('cards')}>Framed cards</button>
          <button type="button" className={'btn sm' + (style === 'minimal' ? '' : ' ghost')} aria-pressed={style === 'minimal'} onClick={() => setStyle('minimal')}>Minimal tags</button>
          {only && cards.length > 1 && <button type="button" className="link-btn" onClick={() => setParams({})}>Show all {cards.length} frames</button>}
        </div>
        <button type="button" className="btn" onClick={() => window.print()} disabled={!shown.length}>Print sheet</button>
      </div>

      {only && !shown.length && <p className="muted wrap pad">That frame no longer exists. <button type="button" className="link-btn" onClick={() => setParams({})}>Show all frames</button></p>}

      {shown.length > 0 && (
        <div className="sheet">
          <header className="sheet-head">
            <div className="mono">{window.location.host}</div>
            <div style={{ textAlign: 'center' }}>
              <div className="mono">— QR Sheet —</div>
              <h1>{FAMILY_NAME}</h1>
            </div>
            <div className="mono">printed · {printed}</div>
          </header>

          {style === 'cards' ? (
            <div className="cards-grid">
              {shown.map((c, i) => (
                <div key={c.id} className="framed-card">
                  <div className="mono">Frame · {c.showing ? 'now showing' : 'resting'}</div>
                  <h3>{c.room}</h3>
                  <div className="sub">{c.showing ? c.showing : 'What plays here changes with the seasons'}</div>
                  <hr className="rule" style={{ margin: '14px 0 0' }} />
                  <div className="cover">
                    {c.cover ? <img className="sepia-photo" src={img(c.cover, 1080)} alt="" /> : (<><div className={`ph-fill t${i % 4}`} /><span className="ph-label">cover</span></>)}
                  </div>
                  <div className="qr-row">
                    <div className="qr-box"><img src={c.qr} alt={`QR code for the ${c.room} frame`} /></div>
                    <div style={{ minWidth: 0 }}>
                      <div className="mono">scan to view</div>
                      <div style={{ fontStyle: 'italic', fontSize: 17, marginTop: 4 }}>{c.showing ? photoCount(c.count) : 'A slideshow begins'}</div>
                      <div className="mono" style={{ fontSize: 10, marginTop: 4, wordBreak: 'break-all' }}>{frameUrl(c.slug).replace(/^https?:\/\//, '')}</div>
                    </div>
                  </div>
                  {!only && cards.length > 1 && (
                    <div className="no-print card-note"><button type="button" className="link-btn" onClick={() => setParams({ frame: c.slug })}>Print just this one</button></div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="minimal-grid">
              {shown.map((c) => (
                <div key={c.id} className="minimal-tag">
                  <div className="qr-box"><img src={c.qr} alt={`QR code for the ${c.room} frame`} /></div>
                  <div className="mono" style={{ marginTop: 12 }}>Frame</div>
                  <h3>{c.room}</h3>
                  <div className="mono" style={{ fontSize: 10, marginTop: 4 }}>scan · watch · remember</div>
                </div>
              ))}
            </div>
          )}

          <footer className="sheet-foot">
            <div className="mono">Cut along dotted lines ✂</div>
            <div className="mono">{FAMILY_NAME} · private · family only</div>
          </footer>
        </div>
      )}
    </div>
  )
}
