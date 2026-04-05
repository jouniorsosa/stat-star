import type { ShotLocation } from '../types'

interface Props {
  mode: 'input' | 'display'
  onTap?: (x: number, y: number) => void
  pendingDot?: { x: number; y: number } | null
  shots?: ShotLocation[]
  className?: string
}

export default function HalfCourt({ mode, onTap, pendingDot, shots = [], className = '' }: Props) {
  const W = 500
  const H = 470

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (mode !== 'input' || !onTap) return
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    onTap(x, y)
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`w-full ${className}`}
      onPointerDown={handlePointerDown}
      style={{ touchAction: 'none' }}
    >
      {/* Court background */}
      <rect x="0" y="0" width={W} height={H} rx="8" fill="#1a1a2e" />

      {/* Court outline */}
      <rect x="10" y="10" width={W - 20} height={H - 20} rx="4" fill="none" stroke="#2a2a4a" strokeWidth="2" />

      {/* Half court line */}
      <line x1="10" y1={H - 15} x2={W - 10} y2={H - 15} stroke="#2a2a4a" strokeWidth="1.5" />

      {/* Paint / key (rectangle) */}
      <rect x={(W - 160) / 2} y="10" width="160" height="190" fill="none" stroke="#3a3a5a" strokeWidth="2" />

      {/* Free throw circle */}
      <circle cx={W / 2} cy="200" r="60" fill="none" stroke="#3a3a5a" strokeWidth="1.5" strokeDasharray="4,4" />

      {/* Basket / rim */}
      <circle cx={W / 2} cy="55" r="10" fill="none" stroke="#ff6b35" strokeWidth="2.5" />
      {/* Backboard */}
      <line x1={(W - 40) / 2} y1="40" x2={(W + 40) / 2} y2="40" stroke="#ff6b35" strokeWidth="3" />

      {/* 3-point arc */}
      <path
        d={`M 40 10 L 40 130 Q 40 350 ${W / 2} 370 Q ${W - 40} 350 ${W - 40} 130 L ${W - 40} 10`}
        fill="none"
        stroke="#4a4a6a"
        strokeWidth="2"
      />

      {/* Restricted area arc */}
      <path
        d={`M ${W / 2 - 40} 55 Q ${W / 2 - 40} 100 ${W / 2} 100 Q ${W / 2 + 40} 100 ${W / 2 + 40} 55`}
        fill="none"
        stroke="#3a3a5a"
        strokeWidth="1.5"
      />

      {/* Zone labels (subtle) */}
      <text x={W / 2} y={H - 35} textAnchor="middle" fill="#333355" fontSize="11" fontWeight="bold">MID-RANGE</text>
      <text x={W / 2} y="150" textAnchor="middle" fill="#333355" fontSize="11" fontWeight="bold">PAINT</text>
      <text x="60" y={H / 2} textAnchor="middle" fill="#333355" fontSize="10" fontWeight="bold">3PT</text>
      <text x={W - 60} y={H / 2} textAnchor="middle" fill="#333355" fontSize="10" fontWeight="bold">3PT</text>

      {/* Display mode: shot dots */}
      {mode === 'display' && shots.map(s => (
        <circle
          key={s.id}
          cx={s.x * W}
          cy={s.y * H}
          r="7"
          fill={s.made ? '#22c55e' : '#ef4444'}
          fillOpacity="0.8"
          stroke={s.made ? '#16a34a' : '#dc2626'}
          strokeWidth="1.5"
        />
      ))}

      {/* Input mode: pending dot */}
      {mode === 'input' && pendingDot && (
        <>
          <circle cx={pendingDot.x * W} cy={pendingDot.y * H} r="12" fill="#f59e0b" fillOpacity="0.3">
            <animate attributeName="r" values="12;18;12" dur="1s" repeatCount="indefinite" />
          </circle>
          <circle cx={pendingDot.x * W} cy={pendingDot.y * H} r="6" fill="#f59e0b" stroke="#fbbf24" strokeWidth="2" />
        </>
      )}

      {/* Tap hint for input mode */}
      {mode === 'input' && !pendingDot && (
        <text x={W / 2} y={H / 2 + 40} textAnchor="middle" fill="#666688" fontSize="14" fontWeight="bold">
          Tap court to mark shot location
        </text>
      )}
    </svg>
  )
}
