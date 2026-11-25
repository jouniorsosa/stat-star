import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { api, frameUrl, type Overview } from './api'

export default function Print() {
  const [frames, setFrames] = useState<{ id: number; room: string; slug: string; qr: string }[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const o = await api<Overview>('overview')
        const withQr = await Promise.all(
          o.frames.map(async (f) => ({
            id: f.id,
            room: f.room,
            slug: f.slug,
            qr: await QRCode.toDataURL(frameUrl(f.slug), { margin: 0, width: 600, errorCorrectionLevel: 'M', color: { dark: '#0A0A0B', light: '#FFFFFF' } }),
          })),
        )
        setFrames(withQr)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load frames')
      }
    })()
  }, [])

  if (error) return <div className="wrap pad"><p className="error" role="alert">{error}</p></div>
  if (!frames) return <p className="muted pad wrap">Making codes…</p>

  return (
    <div className="print-page">
      <div className="wrap no-print print-bar">
        <Link to="/#manage">← Back</Link>
        <p className="muted">One card per frame. Each code points at its frame forever, so you only print it once.</p>
        <button type="button" className="btn btn-red" onClick={() => window.print()} disabled={!frames.length}>Print</button>
      </div>
      {!frames.length && <p className="muted wrap">Add a frame first.</p>}
      <div className="cards">
        {frames.map((f) => (
          <article key={f.id} className="qr-card">
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
        ))}
      </div>
    </div>
  )
}
