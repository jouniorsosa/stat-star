export type Gallery = {
  id: number
  name: string
  caption: string
  music_url: string | null
  music_name: string | null
  count?: number
  cover?: string | null
}
export type Photo = { id: number; url: string; caption: string; position?: number }
export type Frame = { id: number; slug: string; room: string; gallery_id: number | null; current_gallery_id: number | null }
export type Schedule = { id: number; frame_id: number; gallery_id: number; starts_on: string; ends_on: string | null }
export type Overview = { today: string; frames: Frame[]; galleries: Gallery[]; schedules: Schedule[] }
export type PlayData = { frame: { room: string }; gallery: Gallery | null; photos: Photo[] }

export const API = '/api/frames'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function api<T>(op: string, opts: { body?: unknown; query?: Record<string, string | number> } = {}): Promise<T> {
  const q = new URLSearchParams({ op })
  for (const [k, v] of Object.entries(opts.query || {})) q.set(k, String(v))
  const res = await fetch(`${API}?${q}`, {
    method: opts.body === undefined ? 'GET' : 'POST',
    headers: opts.body === undefined ? undefined : { 'content-type': 'application/json' },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    credentials: 'same-origin',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error || `Request failed (${res.status})`)
  return data as T
}

export function frameUrl(slug: string) {
  return `${window.location.origin}/frames/f/${slug}`
}

export const FAMILY_NAME = 'The Sosa Family Archive'

// Photos are served resized by Vercel's image service (allowed in vercel.json),
// so phones download a phone-sized copy instead of the full original.
// The local dev server has no image service, so it uses the originals.
const RESIZE = typeof window !== 'undefined' && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname)
export type ImgWidth = 640 | 1080 | 1920
export function img(src: string, w: ImgWidth) {
  return RESIZE ? `/_vercel/image?url=${encodeURIComponent(src)}&w=${w}&q=75` : src
}
/** Width that looks sharp full screen on this device. */
export function screenWidth(): ImgWidth {
  return window.innerWidth * (window.devicePixelRatio || 1) > 1200 ? 1920 : 1080
}
