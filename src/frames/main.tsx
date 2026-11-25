import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom'
import './frames.css'
import Hero from './Hero'
import Manage from './Manage'
import GalleryEdit from './GalleryEdit'
import Print from './Print'
import Play from './Play'
import { AdminOnly, SessionProvider } from './session'

function Home() {
  const { hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
  }, [hash])
  return (
    <>
      <TopBar />
      <Hero />
      <div id="manage">
        <AdminOnly><Manage /></AdminOnly>
      </div>
    </>
  )
}

function TopBar() {
  return (
    <header className="topbar">
      <Link to="/" className="brand"><span className="brand-mark" aria-hidden="true" />Sosa Frames</Link>
      <nav aria-label="Main">
        <a href="/">All projects</a>
      </nav>
    </header>
  )
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar />
      <AdminOnly>{children}</AdminOnly>
    </>
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
