export interface Team {
  id: string
  name: string
  created_at: string
}

export interface Player {
  id: string
  team_id: string
  name: string
  number: number
  created_at: string
}

export interface Season {
  id: string
  name: string
  start_date: string
  end_date: string
  active: boolean
  created_at: string
}

export interface Game {
  id: string
  home_team_id: string
  away_team_id: string
  game_date: string
  game_type: '4v4' | '5v5'
  status: 'upcoming' | 'in_progress' | 'final'
  home_score: number
  away_score: number
  notes: string | null
  season_id: string | null
  created_at: string
  home_team?: Team
  away_team?: Team
}

export interface ScheduleEntry {
  id: string
  season_id: string
  home_team_id: string
  away_team_id: string
  game_date: string
  game_time: string | null
  location: string | null
  game_id: string | null
  notes: string | null
  created_at: string
  home_team?: Team
  away_team?: Team
  game?: Game
}

export interface PlayerGameStats {
  id: string
  game_id: string
  player_id: string
  team_id: string
  minutes: number
  fgm: number
  fga: number
  three_pm: number
  three_pa: number
  ftm: number
  fta: number
  oreb: number
  dreb: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  fouls: number
  plus_minus: number
  created_at: string
  player?: Player
}

export interface ShotLocation {
  id: string
  game_id: string
  player_id: string
  x: number
  y: number
  shot_type: '2pt' | '3pt'
  made: boolean
  created_at: string
}

export interface PlayerNote {
  id: string
  player_id: string
  note: string
  created_at: string
}

export type StatKey =
  | 'fgm' | 'fga' | 'three_pm' | 'three_pa' | 'ftm' | 'fta'
  | 'oreb' | 'dreb' | 'assists' | 'steals' | 'blocks' | 'turnovers' | 'fouls'
  | 'minutes' | 'plus_minus'

export interface StatAction {
  playerId: string
  stat: StatKey
  value: number
  timestamp: number
  shotLocationId?: string
}

export function computePoints(s: Pick<PlayerGameStats, 'fgm' | 'three_pm' | 'ftm'>): number {
  return (s.fgm - s.three_pm) * 2 + s.three_pm * 3 + s.ftm
}

export function computeRebounds(s: Pick<PlayerGameStats, 'oreb' | 'dreb'>): number {
  return s.oreb + s.dreb
}

export function pct(made: number, attempted: number): string {
  if (attempted === 0) return '.000'
  return (made / attempted).toFixed(3).replace(/^0/, '')
}
