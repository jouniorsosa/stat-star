import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { startHero } from './heroCanvas.js'
import { DEFAULT_THEME, THEMES, type ThemeId } from './themes'

export default function Hero() {
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME)
  const canvas = useRef<HTMLCanvasElement>(null)
  const current = useRef<ThemeId>(themeId)
  current.current = themeId

  useEffect(() => {
    if (!canvas.current) return
    return startHero(canvas.current, () => current.current)
  }, [])

  const th = THEMES.find((t) => t.id === themeId) || THEMES[0]

  return (
    <section className="hero" style={{ background: th.bg }}>
      <canvas ref={canvas} className="hero-canvas" aria-hidden="true" />
      <div className="hero-copy">
        <div className="hero-kicker" style={{ color: th.kickerColor, background: th.kickerBg }}>{th.kicker}</div>
        <h1
          className="hero-title"
          style={{ fontFamily: th.titleFont, letterSpacing: th.titleSpacing, color: th.titleColor, WebkitTextStroke: th.titleStroke, textShadow: th.titleShadow }}
        >
          Sosa Frames
        </h1>
        <p className="hero-sub" style={{ color: th.subColor, background: th.subBg }}>
          Every frame in the house is a doorway to a story. Choose what each one plays today.
        </p>
      </div>
      <div className="hero-actions">
        <a href="#manage" className="btn" style={{ background: th.btnBg, color: th.btnFg }}>
          Manage frames <span aria-hidden="true">→</span>
        </a>
        <Link to="/print" className="btn btn-ghost" style={{ color: th.ghostFg, borderColor: th.ghostFg, background: th.ghostBg }}>
          Print codes
        </Link>
      </div>
      <div className="hero-themes" role="group" aria-label="Choose a theme">
        {THEMES.map((t) => {
          const on = t.id === themeId
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={on}
              onClick={() => setThemeId(t.id)}
              className={'theme-pill' + (th.light ? ' on-light' : '') + (on ? ' is-on' : '')}
            >
              <span className="theme-dot" style={{ background: t.dot }} aria-hidden="true" />
              {t.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}
