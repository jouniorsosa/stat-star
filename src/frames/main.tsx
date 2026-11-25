import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom'
import './frames.css'
import Manage from './Manage'
import GalleryEdit from './GalleryEdit'
import Print from './Print'
import Play from './Play'
import { AdminOnly, SessionProvider } from './session'
import { FAMILY_NAME } from './api'



function Home() {
  const { hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
  }, [hash])
  return (
    <div className="page">
      <TopBar />
      <Masthead />
      <div id="manage">
        <AdminOnly><Manage /></AdminOnly>
      </div>
      <Footer />
    </div>
  )
}

function TopBar() {
  return (
    <header className="topbar">
      <Link to="/" className="mono topbar-brand">Sosa · Family Photographs</Link>
      <nav aria-label="Main">
        <Link className="btn ghost sm" to="/print">Print QR sheet</Link>
        <a className="btn ghost sm" href="/">All projects</a>
      </nav>
    </header>
  )
}

function Masthead() {
  return (
    <section className="masthead">
      <div className="mono">— Family Photographs —</div>
      <h1>{FAMILY_NAME}</h1>
      <div className="ornament" aria-hidden="true">
        <span>◆</span><hr className="rule" /><span>◆</span><hr className="rule" /><span>◆</span>
      </div>
      <p>
        Scan a code on the wall. A slideshow begins. Every frame in the house holds a story,
        and the story can change with the seasons.
      </p>
      <a href="#manage" className="btn">Open the archive <span aria-hidden="true">→</span></a>
    </section>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <span className="mono">{window.location.host}/frames</span>
      <span className="mono muted">☞ Scan · Watch · Remember</span>
      <span className="mono">private · family only</span>
    </footer>
  )
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="page">
      <TopBar />
      <AdminOnly>{children}</AdminOnly>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/frames">
      <SessionProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/gallery/:id" element={<Page><GalleryEdit /></Page>} />
          <Route path="/print" element={<Page><Print /></Page>} />
          <Route path="/preview/:id" element={<AdminOnly><Play preview /></AdminOnly>} />
          <Route path="/f/:slug" element={<Play />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
)
