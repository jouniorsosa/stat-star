// Text styling that goes with each animated hero theme (the drawing lives in heroCanvas.js).
export type ThemeId = 'samurai' | 'hero' | 'space' | 'tech' | 'sports' | 'abstract'

export type Theme = {
  id: ThemeId
  label: string
  dot: string
  bg: string
  kicker: string
  kickerColor: string
  kickerBg: string
  titleFont: string
  titleSpacing: string
  titleColor: string
  titleStroke: string
  titleShadow: string
  subColor: string
  subBg: string
  btnBg: string
  btnFg: string
  ghostFg: string
  ghostBg: string
  light: boolean
}

export const THEMES: Theme[] = [
  { id: 'samurai', label: 'Samurai', dot: '#FF4B33', bg: '#0A0A0B', kicker: 'THE WAY OF THE FRAME', kickerColor: '#FF8A75', kickerBg: '#1E0E0B', titleFont: "'Shippori Mincho B1', serif", titleSpacing: '-0.02em', titleColor: '#F4F1EA', titleStroke: '0px transparent', titleShadow: 'none', subColor: '#D9D4CA', subBg: 'transparent', btnBg: '#FF4B33', btnFg: '#0A0A0B', ghostFg: '#F4F1EA', ghostBg: 'transparent', light: false },
  { id: 'hero', label: 'Hero', dot: '#E8302A', bg: '#F5C518', kicker: 'ISSUE #1 · ORIGIN STORY', kickerColor: '#FFFFFF', kickerBg: '#111111', titleFont: 'Bangers, Impact, sans-serif', titleSpacing: '0.02em', titleColor: '#FFFFFF', titleStroke: '3px #111111', titleShadow: '6px 6px 0 #111111', subColor: '#111111', subBg: '#FFFFFF', btnBg: '#111111', btnFg: '#FFFFFF', ghostFg: '#111111', ghostBg: '#FFFFFF', light: true },
  { id: 'space', label: 'Space', dot: '#7B8CFF', bg: '#05061A', kicker: 'MISSION CONTROL', kickerColor: '#9FB0FF', kickerBg: '#12153A', titleFont: 'Orbitron, sans-serif', titleSpacing: '0.02em', titleColor: '#EDEFFF', titleStroke: '0px transparent', titleShadow: '0 0 30px rgba(123,140,255,0.6)', subColor: '#C8CCF0', subBg: 'transparent', btnBg: '#7FE3FF', btnFg: '#05061A', ghostFg: '#EDEFFF', ghostBg: 'transparent', light: false },
  { id: 'tech', label: 'Tech', dot: '#39FFAA', bg: '#04110D', kicker: 'SYSTEM ONLINE', kickerColor: '#39FFAA', kickerBg: '#0A2A1E', titleFont: "'Space Mono', monospace", titleSpacing: '-0.04em', titleColor: '#E6FFF4', titleStroke: '0px transparent', titleShadow: '0 0 24px rgba(57,255,170,0.45)', subColor: '#A8D9C4', subBg: 'transparent', btnBg: '#39FFAA', btnFg: '#04110D', ghostFg: '#E6FFF4', ghostBg: 'transparent', light: false },
  { id: 'sports', label: 'Sports', dot: '#FF8A2A', bg: '#1B0F08', kicker: 'GAME DAY', kickerColor: '#FFB36B', kickerBg: '#3A1E0C', titleFont: "'Bebas Neue', Impact, sans-serif", titleSpacing: '0.02em', titleColor: '#FFF4E6', titleStroke: '0px transparent', titleShadow: '0 4px 0 #C4501A', subColor: '#EAD8C4', subBg: 'transparent', btnBg: '#FF8A2A', btnFg: '#1B0F08', ghostFg: '#FFF4E6', ghostBg: 'transparent', light: false },
  { id: 'abstract', label: 'Abstract', dot: '#FF4FA3', bg: '#0B0714', kicker: 'IN MOTION', kickerColor: '#FF8CC6', kickerBg: '#24102A', titleFont: "'Bricolage Grotesque', sans-serif", titleSpacing: '-0.04em', titleColor: '#FFFFFF', titleStroke: '0px transparent', titleShadow: '0 0 40px rgba(255,79,163,0.5)', subColor: '#D8CFE8', subBg: 'transparent', btnBg: '#FFFFFF', btnFg: '#0B0714', ghostFg: '#FFFFFF', ghostBg: 'transparent', light: false },
]

export const DEFAULT_THEME: ThemeId = 'samurai'
