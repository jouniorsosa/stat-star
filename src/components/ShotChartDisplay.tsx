import { useState } from 'react'
import HalfCourt from './HalfCourt'
import type { ShotLocation, Player } from '../types'

interface Props {
  shots: ShotLocation[]
  players?: (Player & { id: string })[]
  title?: string
}

export default function ShotChartDisplay({ shots, players, title }: Props) {
  const [filterPlayer, setFilterPlayer] = useState<string>('')

  const filtered = filterPlayer ? shots.filter(s => s.player_id === filterPlayer) : shots
  const makes = filtered.filter(s => s.made).length
  const misses = filtered.filter(s => !s.made).length
  const total = makes + misses
  const pctVal = total > 0 ? ((makes / total) * 100).toFixed(1) : '0.0'

  const twoPt = filtered.filter(s => s.shot_type === '2pt')
  const threePt = filtered.filter(s => s.shot_type === '3pt')
  const twoPtMakes = twoPt.filter(s => s.made).length
  const threePtMakes = threePt.filter(s => s.made).length

  return (
    <div className="bg-[#12121c] border border-white/5 rounded-2xl p-5">
      {title && <h3 className="font-black text-sm mb-3">{title}</h3>}

      {players && players.length > 0 && (
        <select
          value={filterPlayer}
          onChange={e => setFilterPlayer(e.target.value)}
          className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm mb-4 focus:outline-none focus:border-orange-500/50"
        >
          <option value="">All Players ({shots.length} shots)</option>
          {players.map(p => {
            const count = shots.filter(s => s.player_id === p.id).length
            return count > 0 ? (
              <option key={p.id} value={p.id}>#{p.number} {p.name} ({count} shots)</option>
            ) : null
          })}
        </select>
      )}

      <HalfCourt mode="display" shots={filtered} />

      {/* Legend & stats */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="bg-[#0a0a0f] rounded-xl p-3">
          <p className="text-green-400 font-black text-xl">{makes}</p>
          <p className="text-gray-500 text-xs">Makes</p>
        </div>
        <div className="bg-[#0a0a0f] rounded-xl p-3">
          <p className="text-red-400 font-black text-xl">{misses}</p>
          <p className="text-gray-500 text-xs">Misses</p>
        </div>
        <div className="bg-[#0a0a0f] rounded-xl p-3">
          <p className="text-white font-black text-xl">{pctVal}%</p>
          <p className="text-gray-500 text-xs">Overall</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-center">
        <div className="bg-[#0a0a0f] rounded-xl p-2.5">
          <p className="text-sm font-bold">{twoPtMakes}/{twoPt.length} <span className="text-gray-500">2PT</span></p>
          <p className="text-xs text-gray-500">{twoPt.length > 0 ? ((twoPtMakes / twoPt.length) * 100).toFixed(1) : '0.0'}%</p>
        </div>
        <div className="bg-[#0a0a0f] rounded-xl p-2.5">
          <p className="text-sm font-bold">{threePtMakes}/{threePt.length} <span className="text-gray-500">3PT</span></p>
          <p className="text-xs text-gray-500">{threePt.length > 0 ? ((threePtMakes / threePt.length) * 100).toFixed(1) : '0.0'}%</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Made</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Missed</span>
      </div>
    </div>
  )
}
