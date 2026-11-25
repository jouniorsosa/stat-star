import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { api, frameUrl, type Overview } from './api'
import { AddFrameForm } from './AddFrame'

type Card = { id: number; room: string; slug: string; qr: string; showing: string | null }

export default function Print() {
  const [params, setParams] = useSearchParams()
  const only = params.get('frame')
  const [data, setData] = useState<{ overview: Overview; cards: Card[] } | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const o = await api<Overview>('overview')
      const names = new Map(o.galleries.map((g) => [g.id, g.name]))
      const cards = await Promise.all(
        o.frames.map(async (f) => ({
          id: f.id,
          room: f.room,
          slug: f.slug,
          showing: f.current_gallery_id ? names.get(f.current_gallery_id) ?? null : null,
          qr: await QRCode.toDataURL(frameUrl(f.slug), { margin: 0, width: 600, errorCorrectionLevel: 'M', color: { dark: '#0A0A0B', light: '#FFFFFF' } }),
        })),
      )
      setData({ overview: o, cards })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load frames')
    }
  }, [])
  useEffect(() => { load() }, [load])

  if (error) return <div className="wrap pad"><p className="error" role="alert">{error}</p></div>
  if (!data) return <p className="muted pad wrap">Making codes…</p>

  const { overview, cards } = data
  const shown = only ? cards.filter((c) => c.slug === only) : cards

  if (!cards.length) {
    return (
      <div className="wrap print-empty">
        <div className="crumbs"><Link to="/#frames">← Back to frames</Link></div>
        <div className="card empty-card">
          <h2 className="display">No frames to print yet</h2>
          <p className="muted">
            Codes belong to <strong>frames</strong>, not galleries. Add a frame for the spot where it will hang,
            pick what it shows, and its card appears here.
          </p>
          <AddFrameForm galleries={overview.galleries} onAdded={async (f) => { await load(); setParams({ frame: f.slug }) }} />
        </div>
      </div>
    )
  }

  return (
    <div className="print-page">
      <div className="wrap no-print print-bar">
        <Link to="/#frames">← Back to frames</Link>
        <p className="muted">
          {only
            ? <>One card{cards.length > 1 && <>. <button type="button" className="link-btn" onClick={() => setParams({})}>Show all {cards.length} frames</button></>}</>
            : `${cards.length} card${cards.length === 1 ? '' : 's'}, one per frame. Each code points at its frame forever, so you only print it once.`}
        </p>
        <button type="button" className="btn btn-red" onClick={() => window.print()} disabled={!shown.length}>
          Print {shown.length === 1 ? 'this card' : `${shown.length} cards`}
        </button>
      </div>
      {only && !shown.length && <p className="muted wrap">That frame no longer exists. <button type="button" className="link-btn" onClick={() => setParams({})}>Show all frames</button></p>}
      <div className="cards">
        {shown.map((f) => (
          <div key={f.id} className="card-wrap">
            <article className="qr-card">
              <div className="qr-top">
                <span className="brand"><span className="brand-mark" aria-hidden="true" />Sosa Frames</span>
                <span className="qr-room">{f.room.toUpperCase()}</span>
              </div>
              <h2 className="qr-title">Point.<br />Scan.<br /><span>Remember.</span></h2>
              <div className="qr-bottom">
                <img className="qr" src={f.qr} alt={`QR code for the ${f.room} frame`} />
                <div>
                  <p className="qr-help">Open your camera and point it here. What plays changes with the season.</p>
                  <p className="qr-url">{frameUrl(f.slug).replace(/^https?:\/\//, '')}</p>
                </div>
              </div>
            </article>
            <p className="no-print card-note muted small">
              {f.showing ? `Showing now: ${f.showing}` : 'Not showing anything yet.'}{' '}
              {!only && cards.length > 1 && <button type="button" className="link-btn" onClick={() => setParams({ frame: f.slug })}>Print just this one</button>}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
