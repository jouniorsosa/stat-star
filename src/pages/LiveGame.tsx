import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Game, Team, Player, PlayerGameStats, StatKey, StatAction } from '../types'
import { computePoints } from '../types'
import HalfCourt from '../components/HalfCourt'

interface FullStats extends PlayerGameStats {
  player: Player
  active: boolean
}

type PendingStat = {
  label: string
  stats: { stat: StatKey; value: number }[]
  color: string
  isShotStat: boolean
  shotType?: '2pt' | '3pt'
  shotMade?: boolean
}

type SubMode = { teamId: string; side: 'home' | 'away' } | null

const SHOT_LABELS = ['2PT Made', '2PT Miss', '3PT Made', '3PT Miss']

function getShotInfo(label: string): { shotType: '2pt' | '3pt'; shotMade: boolean } | null {
  switch (label) {
    case '2PT Made': return { shotType: '2pt', shotMade: true }
    case '2PT Miss': return { shotType: '2pt', shotMade: false }
    case '3PT Made': return { shotType: '3pt', shotMade: true }
    case '3PT Miss': return { shotType: '3pt', shotMade: false }
    default: return null
  }
}

export default function LiveGame() {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const [game, setGame] = useState<Game & { home_team: Team; away_team: Team } | null>(null)
  const [stats, setStats] = useState<FullStats[]>([])
  const [actionLog, setActionLog] = useState<StatAction[]>([])
  const [pendingStat, setPendingStat] = useState<PendingStat | null>(null)
  const [pendingLocation, setPendingLocation] = useState<{ x: number; y: number } | null>(null)
  const [subMode, setSubMode] = useState<SubMode>(null)
  const [subOut, setSubOut] = useState<string | null>(null)
  const [benchPlayers, setBenchPlayers] = useState<Player[]>([])

  const load = useCallback(async () => {
    const { data: g } = await supabase
      .from('games')
      .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)')
      .eq('id', gameId!)
      .single()
    setGame(g as typeof game)
    const { data: s } = await supabase
      .from('player_game_stats')
      .select('*, player:players(*)')
      .eq('game_id', gameId!)
    setStats((s ?? []) as FullStats[])
  }, [gameId])

  useEffect(() => { load() }, [load])

  async function enterSubMode(teamId: string, side: 'home' | 'away') {
    setPendingStat(null)
    setPendingLocation(null)
    const { data: roster } = await supabase.from('players').select('*').eq('team_id', teamId).order('number')
    const inGameIds = new Set(stats.filter(s => s.team_id === teamId).map(s => s.player_id))
    setBenchPlayers((roster ?? []).filter(p => !inGameIds.has(p.id)))
    setSubMode({ teamId, side })
    setSubOut(null)
  }

  function cancelSub() { setSubMode(null); setSubOut(null); setBenchPlayers([]) }

  async function completeSub(benchPlayerId: string) {
    if (!subOut || !subMode) return
    const outRow = stats.find(s => s.player_id === subOut)
    if (outRow) await supabase.from('player_game_stats').update({ active: false }).eq('id', outRow.id)
    const existingRow = stats.find(s => s.player_id === benchPlayerId)
    if (existingRow) {
      await supabase.from('player_game_stats').update({ active: true }).eq('id', existingRow.id)
    } else {
      await supabase.from('player_game_stats').insert({ game_id: gameId!, player_id: benchPlayerId, team_id: subMode.teamId, active: true })
    }
    cancelSub()
    load()
  }

  function selectStat(label: string, statEntries: { stat: StatKey; value: number }[], color: string) {
    if (subMode) return
    const shotInfo = getShotInfo(label)
    const isShotStat = shotInfo !== null
    setPendingStat({ label, stats: statEntries, color, isShotStat, shotType: shotInfo?.shotType, shotMade: shotInfo?.shotMade })
    setPendingLocation(null)
  }

  async function applyStatToPlayer(playerId: string) {
    if (!pendingStat) return

    const row = stats.find(s => s.player_id === playerId)
    if (!row) return

    // Build the complete update: apply ALL stat changes at once
    const dbUpdates: Record<string, number> = {}
    const newActions: StatAction[] = []
    let updatedRow = { ...row }

    for (const { stat, value } of pendingStat.stats) {
      updatedRow = { ...updatedRow, [stat]: updatedRow[stat] + value }
      dbUpdates[stat] = updatedRow[stat]
      newActions.push({ playerId, stat, value, timestamp: Date.now() })
    }

    // Update local state atomically
    setStats(prev => prev.map(s => s.player_id === playerId ? updatedRow : s))
    setActionLog(prev => [...prev, ...newActions])

    // Persist stat changes to DB
    await supabase.from('player_game_stats').update(dbUpdates).eq('id', row.id)

    // Recalculate scores using the fully updated row
    const updatedAll = stats.map(s => s.player_id === playerId ? updatedRow : s)
    const homeScore = updatedAll.filter(s => s.team_id === game?.home_team_id).reduce((sum, s) => sum + computePoints(s), 0)
    const awayScore = updatedAll.filter(s => s.team_id === game?.away_team_id).reduce((sum, s) => sum + computePoints(s), 0)
    await supabase.from('games').update({ home_score: homeScore, away_score: awayScore }).eq('id', gameId!)
    setGame(prev => prev ? { ...prev, home_score: homeScore, away_score: awayScore } : prev)

    // If there's a shot location, save it and tag the action log entries
    if (pendingLocation && pendingStat.isShotStat && pendingStat.shotType !== undefined && pendingStat.shotMade !== undefined) {
      const { data: loc } = await supabase.from('shot_locations').insert({
        game_id: gameId!,
        player_id: playerId,
        x: pendingLocation.x,
        y: pendingLocation.y,
        shot_type: pendingStat.shotType,
        made: pendingStat.shotMade,
      }).select('id').single()

      if (loc) {
        setActionLog(prev => {
          const updated = [...prev]
          for (let i = updated.length - 1; i >= 0 && i >= updated.length - pendingStat.stats.length; i--) {
            if (updated[i].playerId === playerId) {
              updated[i] = { ...updated[i], shotLocationId: loc.id }
            }
          }
          return updated
        })
      }
    }

    setPendingStat(null)
    setPendingLocation(null)
  }

  async function undoLast() {
    if (actionLog.length === 0) return
    const last = actionLog[actionLog.length - 1]
    const row = stats.find(s => s.player_id === last.playerId)
    if (!row) return
    const newVal = Math.max(0, row[last.stat] - last.value)
    setStats(prev => prev.map(s => s.player_id === last.playerId ? { ...s, [last.stat]: newVal } : s))
    setActionLog(prev => prev.slice(0, -1))
    await supabase.from('player_game_stats').update({ [last.stat]: newVal }).eq('id', row.id)

    // If this action had a shot location, delete it
    if (last.shotLocationId) {
      await supabase.from('shot_locations').delete().eq('id', last.shotLocationId)
    }

    const updatedStats = stats.map(s => s.player_id === last.playerId ? { ...s, [last.stat]: newVal } : s)
    const homeScore = updatedStats.filter(s => s.team_id === game?.home_team_id).reduce((sum, s) => sum + computePoints(s), 0)
    const awayScore = updatedStats.filter(s => s.team_id === game?.away_team_id).reduce((sum, s) => sum + computePoints(s), 0)
    await supabase.from('games').update({ home_score: homeScore, away_score: awayScore }).eq('id', gameId!)
    setGame(prev => prev ? { ...prev, home_score: homeScore, away_score: awayScore } : prev)
  }

  async function endGame() {
    if (!confirm('End this game and mark as final?')) return
    await supabase.from('games').update({ status: 'final' }).eq('id', gameId!)
    navigate(`/game/${gameId}`)
  }

  if (!game) return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-gray-600">Loading...</div>

  const homeActive = stats.filter(s => s.team_id === game.home_team_id && s.active)
  const awayActive = stats.filter(s => s.team_id === game.away_team_id && s.active)
  const homeBench = stats.filter(s => s.team_id === game.home_team_id && !s.active)
  const awayBench = stats.filter(s => s.team_id === game.away_team_id && !s.active)

  const showCourt = pendingStat?.isShotStat && !subMode

  const statButtons: { label: string; stats: { stat: StatKey; value: number }[]; color: string }[] = [
    { label: '2PT Made', stats: [{ stat: 'fgm', value: 1 }, { stat: 'fga', value: 1 }], color: 'from-green-600 to-green-700' },
    { label: '2PT Miss', stats: [{ stat: 'fga', value: 1 }], color: 'from-red-700 to-red-800' },
    { label: '3PT Made', stats: [{ stat: 'three_pm', value: 1 }, { stat: 'three_pa', value: 1 }, { stat: 'fgm', value: 1 }, { stat: 'fga', value: 1 }], color: 'from-green-500 to-emerald-600' },
    { label: '3PT Miss', stats: [{ stat: 'three_pa', value: 1 }, { stat: 'fga', value: 1 }], color: 'from-red-600 to-red-700' },
    { label: 'FT Made', stats: [{ stat: 'ftm', value: 1 }, { stat: 'fta', value: 1 }], color: 'from-emerald-600 to-teal-700' },
    { label: 'FT Miss', stats: [{ stat: 'fta', value: 1 }], color: 'from-red-800 to-red-900' },
    { label: 'OFF REB', stats: [{ stat: 'oreb', value: 1 }], color: 'from-blue-600 to-blue-700' },
    { label: 'DEF REB', stats: [{ stat: 'dreb', value: 1 }], color: 'from-blue-700 to-blue-800' },
    { label: 'ASSIST', stats: [{ stat: 'assists', value: 1 }], color: 'from-purple-600 to-purple-700' },
    { label: 'STEAL', stats: [{ stat: 'steals', value: 1 }], color: 'from-yellow-600 to-yellow-700' },
    { label: 'BLOCK', stats: [{ stat: 'blocks', value: 1 }], color: 'from-indigo-600 to-indigo-700' },
    { label: 'TURNOVER', stats: [{ stat: 'turnovers', value: 1 }], color: 'from-orange-700 to-orange-800' },
    { label: 'FOUL', stats: [{ stat: 'fouls', value: 1 }], color: 'from-rose-700 to-rose-800' },
  ]

  function PlayerButton({ s, side }: { s: FullStats; side: 'home' | 'away' }) {
    const pts = computePoints(s)
    const isSelecting = pendingStat !== null && !subMode
    const isSubSelecting = subMode?.side === side && subOut === null
    return (
      <button
        onClick={() => {
          if (isSelecting) applyStatToPlayer(s.player_id)
          else if (isSubSelecting) setSubOut(s.player_id)
        }}
        className={`w-full text-left rounded-xl transition-all duration-150 flex items-center gap-2 px-3 py-2.5 ${
          isSelecting
            ? 'bg-gradient-to-r from-amber-600/20 to-orange-600/10 border border-orange-500/50 cursor-pointer hover:border-orange-400 hover:scale-[1.02] active:scale-95'
            : isSubSelecting
            ? 'bg-gradient-to-r from-cyan-600/20 to-blue-600/10 border border-cyan-500/50 cursor-pointer hover:border-cyan-400 hover:scale-[1.02] active:scale-95'
            : subOut === s.player_id
            ? 'bg-red-600/20 border-2 border-red-500 ring-2 ring-red-500/30'
            : 'bg-[#12121c] border border-white/5 cursor-default opacity-70'
        }`}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
          side === 'home' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'
        }`}>{s.player?.number}</div>
        <span className="flex-1 font-semibold text-sm truncate">{s.player?.name}</span>
        <span className="font-black text-lg tabular-nums">{pts}</span>
        <div className="text-[10px] text-gray-500 text-right leading-tight w-16">
          <div>{s.oreb + s.dreb}r {s.assists}a</div>
          <div>{s.steals}s {s.blocks}b</div>
        </div>
      </button>
    )
  }

  function BenchSection({ benchStats }: { benchStats: FullStats[] }) {
    if (benchStats.length === 0) return null
    return (
      <div className="mt-2 pt-2 border-t border-white/5">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 text-center">Bench</p>
        {benchStats.map(s => (
          <div key={s.id} className="flex items-center gap-2 px-3 py-1.5 text-gray-600 text-xs">
            <span className="font-bold w-6 text-center">{s.player?.number}</span>
            <span className="flex-1 truncate">{s.player?.name}</span>
            <span className="font-bold">{computePoints(s)}pts</span>
          </div>
        ))}
      </div>
    )
  }

  function SubModal() {
    if (!subMode || !subOut) return null
    const outPlayer = stats.find(s => s.player_id === subOut)?.player
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={cancelSub}>
        <div className="bg-[#12121c] border border-white/10 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
          <h3 className="font-black text-lg text-white mb-1">Substitute Player</h3>
          <p className="text-gray-500 text-sm mb-4">
            Subbing out <span className="text-red-400 font-bold">#{outPlayer?.number} {outPlayer?.name}</span>
          </p>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Choose replacement:</p>
          {benchPlayers.length === 0 && stats.filter(s => s.team_id === subMode.teamId && !s.active).length === 0 ? (
            <p className="text-gray-600 text-center py-8">No bench players available</p>
          ) : (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {benchPlayers.map(p => (
                <button key={p.id} onClick={() => completeSub(p.id)}
                  className="w-full text-left px-4 py-3 rounded-xl bg-gradient-to-r from-green-600/20 to-emerald-600/10 border border-green-500/30 hover:border-green-400 transition-all flex items-center gap-3 hover:scale-[1.02] active:scale-95">
                  <div className="w-9 h-9 rounded-lg bg-green-500/20 flex items-center justify-center font-black text-green-400 text-sm">{p.number}</div>
                  <span className="font-semibold text-white">{p.name}</span>
                  <span className="ml-auto text-green-400 text-xs font-bold">SUB IN</span>
                </button>
              ))}
              {stats.filter(s => s.team_id === subMode.teamId && !s.active).map(s => (
                <button key={s.id} onClick={() => completeSub(s.player_id)}
                  className="w-full text-left px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600/20 to-blue-600/10 border border-cyan-500/30 hover:border-cyan-400 transition-all flex items-center gap-3 hover:scale-[1.02] active:scale-95">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center font-black text-cyan-400 text-sm">{s.player?.number}</div>
                  <span className="font-semibold text-white">{s.player?.name}</span>
                  <span className="ml-auto text-cyan-400 text-xs font-bold">{computePoints(s)}pts - SUB IN</span>
                </button>
              ))}
            </div>
          )}
          <button onClick={cancelSub} className="w-full mt-4 py-3 rounded-xl bg-white/5 text-gray-400 font-bold hover:bg-white/10 transition-all">Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Scoreboard */}
      <div className="bg-gradient-to-b from-[#0f1020] to-[#0a0a0f] border-b border-white/5 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex-1 text-right">
            <p className="text-blue-400 font-bold text-sm uppercase tracking-wider">{game.home_team?.name}</p>
            <p className="text-5xl font-black tabular-nums">{game.home_score}</p>
          </div>
          <div className="mx-6 text-center">
            <div className="flex items-center gap-1.5 justify-center mb-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 text-xs font-black tracking-wider">LIVE</span>
            </div>
            <span className="text-gray-600 text-xs">{game.game_type}</span>
          </div>
          <div className="flex-1 text-left">
            <p className="text-red-400 font-bold text-sm uppercase tracking-wider">{game.away_team?.name}</p>
            <p className="text-5xl font-black tabular-nums">{game.away_score}</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-[#0a0a0f] border-b border-white/5 px-4 py-2">
        <div className="max-w-6xl mx-auto flex gap-2 justify-center flex-wrap">
          <button onClick={undoLast} disabled={actionLog.length === 0}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${actionLog.length > 0 ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-600/30' : 'bg-white/5 text-gray-700 border border-white/5 cursor-not-allowed'}`}>
            Undo ({actionLog.length})
          </button>
          {pendingStat && (
            <button onClick={() => { setPendingStat(null); setPendingLocation(null) }}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-gray-600/20 text-gray-400 border border-gray-500/30 hover:bg-gray-600/30 transition-all">
              Cancel Stat
            </button>
          )}
          {subMode ? (
            <button onClick={cancelSub} className="px-4 py-2 rounded-xl text-sm font-bold bg-gray-600/20 text-gray-400 border border-gray-500/30 hover:bg-gray-600/30 transition-all">Cancel Sub</button>
          ) : (
            <>
              <button onClick={() => enterSubMode(game.home_team_id, 'home')}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600/30 transition-all">
                Sub {game.home_team?.name?.split(' ')[0]}
              </button>
              <button onClick={() => enterSubMode(game.away_team_id, 'away')}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600/30 transition-all">
                Sub {game.away_team?.name?.split(' ')[0]}
              </button>
            </>
          )}
          <button onClick={endGame} className="px-4 py-2 rounded-xl text-sm font-bold bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 transition-all">End Game</button>
          <Link to="/" className="px-4 py-2 rounded-xl text-sm font-bold bg-white/5 text-gray-500 border border-white/5 hover:bg-white/10 transition-all">Home</Link>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-2 sm:px-4 py-4">
        {/* Pending stat banner */}
        {pendingStat && !subMode && (
          <div className={`mb-4 bg-gradient-to-r ${pendingStat.color} rounded-2xl p-3 text-center`}>
            <p className="text-white font-black text-lg">{pendingStat.label}</p>
            <p className="text-white/80 text-xs mt-0.5">
              {showCourt
                ? (pendingLocation ? 'Location marked! Now tap a player' : 'Tap court to mark location, or tap a player to skip')
                : 'Tap a player to assign'}
            </p>
          </div>
        )}

        {subMode && !subOut && (
          <div className="mb-4 bg-gradient-to-r from-cyan-600 to-blue-700 rounded-2xl p-3 text-center">
            <p className="text-white font-black text-lg">Substitution</p>
            <p className="text-white/80 text-xs mt-0.5">Tap the player coming OUT</p>
          </div>
        )}

        {/* Court overlay for shot stats */}
        {showCourt && (
          <div className="mb-4 max-w-md mx-auto">
            <HalfCourt
              mode="input"
              onTap={(x, y) => setPendingLocation({ x, y })}
              pendingDot={pendingLocation}
            />
            {pendingLocation && (
              <button
                onClick={() => setPendingLocation(null)}
                className="w-full mt-2 py-2 rounded-xl bg-white/5 text-gray-400 text-sm font-medium hover:bg-white/10 transition-all"
              >
                Clear Location
              </button>
            )}
          </div>
        )}

        {/* 3-column layout */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:gap-4">
          <div>
            <h3 className="text-blue-400 font-black text-xs uppercase tracking-wider mb-3 text-center">{game.home_team?.name}</h3>
            <div className="space-y-2">{homeActive.map(s => <PlayerButton key={s.id} s={s} side="home" />)}</div>
            <BenchSection benchStats={homeBench} />
          </div>

          <div className="w-[120px] sm:w-[160px]">
            <h3 className="text-gray-500 font-black text-xs uppercase tracking-wider mb-3 text-center">Stats</h3>
            <div className="space-y-1.5">
              {statButtons.map(b => {
                const isShot = SHOT_LABELS.includes(b.label)
                return (
                  <button
                    key={b.label}
                    onClick={() => selectStat(b.label, b.stats, b.color)}
                    disabled={!!subMode}
                    className={`w-full bg-gradient-to-r ${b.color} text-white font-black text-xs sm:text-sm py-2.5 sm:py-3 rounded-xl transition-all shadow-lg min-h-[40px] flex items-center justify-center gap-1 ${
                      subMode ? 'opacity-30 cursor-not-allowed' : 'hover:scale-[1.03] active:scale-95'
                    } ${pendingStat?.label === b.label ? 'ring-2 ring-white ring-offset-1 ring-offset-[#0a0a0f] scale-[1.05]' : ''}`}
                  >
                    {isShot && <span className="text-[10px] opacity-60">&#9673;</span>}
                    <span className="hidden sm:inline">{b.label}</span>
                    <span className="sm:hidden">{b.label.replace(' Made', '').replace(' Miss', ' X').replace('OFF ', 'O').replace('DEF ', 'D')}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <h3 className="text-red-400 font-black text-xs uppercase tracking-wider mb-3 text-center">{game.away_team?.name}</h3>
            <div className="space-y-2">{awayActive.map(s => <PlayerButton key={s.id} s={s} side="away" />)}</div>
            <BenchSection benchStats={awayBench} />
          </div>
        </div>
      </div>

      <SubModal />
    </div>
  )
}
