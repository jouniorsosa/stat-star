import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { Season } from '../types'

interface SeasonContextType {
  seasons: Season[]
  activeSeason: Season | null
  selectedSeason: Season | null
  setSelectedSeason: (s: Season | null) => void
  refetchSeasons: () => Promise<void>
  loading: boolean
}

const SeasonContext = createContext<SeasonContextType>({
  seasons: [], activeSeason: null, selectedSeason: null,
  setSelectedSeason: () => {}, refetchSeasons: async () => {}, loading: true,
})

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchSeasons() {
    const { data } = await supabase.from('seasons').select('*').order('start_date', { ascending: false })
    const list = (data ?? []) as Season[]
    setSeasons(list)
    const active = list.find(s => s.active) ?? null
    if (!selectedSeason || !list.find(s => s.id === selectedSeason.id)) {
      setSelectedSeason(active)
    }
    setLoading(false)
  }

  useEffect(() => { fetchSeasons() }, [])

  const activeSeason = seasons.find(s => s.active) ?? null

  return (
    <SeasonContext.Provider value={{ seasons, activeSeason, selectedSeason, setSelectedSeason, refetchSeasons: fetchSeasons, loading }}>
      {children}
    </SeasonContext.Provider>
  )
}

export function useSeasonContext() {
  return useContext(SeasonContext)
}
