// Sosa Frames API: one function, operation chosen by ?op=.
// Public:  play, session, login, logout
// Admin:   everything else (needs the signed session cookie)
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { del } from '@vercel/blob'
import { createHmac, timingSafeEqual } from 'node:crypto'

type Sql = NeonQueryFunction<false, false>
let _sql: Sql | null = null
let _schema: Promise<unknown> | null = null

function db(): Sql {
  if (!_sql) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    _sql = neon(url)
  }
  return _sql
}

// Tables are created on first use, so there is no separate migration step.
function ensureSchema() {
  if (!_schema) {
    const sql = db()
    _schema = (async () => {
      await sql`create table if not exists galleries (
        id serial primary key,
        name text not null,
        caption text not null default '',
        music_url text,
        music_name text,
        created_at timestamptz not null default now())`
      await sql`create table if not exists photos (
        id serial primary key,
        gallery_id int not null references galleries(id) on delete cascade,
        url text not null,
        pathname text,
        caption text not null default '',
        position int not null default 0,
        created_at timestamptz not null default now())`
      await sql`create table if not exists frames (
        id serial primary key,
        slug text not null unique,
        room text not null,
        gallery_id int references galleries(id) on delete set null,
        created_at timestamptz not null default now())`
      await sql`create table if not exists schedules (
        id serial primary key,
        frame_id int not null references frames(id) on delete cascade,
        gallery_id int not null references galleries(id) on delete cascade,
        starts_on date not null,
        ends_on date)`
    })().catch((e) => { _schema = null; throw e })
  }
  return _schema
}

/* ---------- session: an HMAC-signed cookie, no user table ---------- */
const COOKIE = 'frames_session'
const WEEK = 7 * 24 * 3600

function secret() {
  const s = process.env.FRAMES_SESSION_SECRET
  if (!s || s.length < 32) throw new Error('FRAMES_SESSION_SECRET is not set')
  return s
}
function sign(value: string) {
  return createHmac('sha256', secret()).update(value).digest('base64url')
}
function makeSession() {
  const exp = Math.floor(Date.now() / 1000) + WEEK
  return `${exp}.${sign(String(exp))}`
}
function isAdmin(req: Request) {
  const raw = (req.headers.get('cookie') || '').split(/;\s*/).find((c) => c.startsWith(COOKIE + '='))
  if (!raw) return false
  const [exp, sig] = raw.slice(COOKIE.length + 1).split('.')
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false
  const want = Buffer.from(sign(exp))
  const got = Buffer.from(sig)
  return want.length === got.length && timingSafeEqual(want, got)
}
function passwordOk(given: unknown) {
  const real = process.env.FRAMES_ADMIN_PASSWORD
  if (!real || typeof given !== 'string') return false
  const a = createHmac('sha256', 'pw').update(given).digest()
  const b = createHmac('sha256', 'pw').update(real).digest()
  return timingSafeEqual(a, b)
}
function cookieHeader(value: string, maxAge: number, req: Request) {
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : ''
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
}

/* ---------- helpers ---------- */
function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } })
}
class HttpError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}
function str(v: unknown, field: string, max = 200) {
  if (typeof v !== 'string' || !v.trim()) throw new HttpError(400, `${field} is required`)
  return v.trim().slice(0, max)
}
function optStr(v: unknown, max = 500) {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}
function int(v: unknown, field: string) {
  const n = Number(v)
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `${field} is invalid`)
  return n
}
function day(v: unknown, field: string) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new HttpError(400, `${field} must be a date`)
  return v
}
function slugify(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 40)
}
function isBlobUrl(u: string) {
  try { return new URL(u).hostname.endsWith('.public.blob.vercel-storage.com') } catch { return false }
}
function today(tz?: string | null) {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'America/New_York' }).format(new Date()) }
  catch { return new Date().toISOString().slice(0, 10) }
}

/* ---------- what a frame shows right now ---------- */
async function currentGalleryId(frameId: number, fallback: number | null, onDay: string) {
  const sql = db()
  const rows = (await sql`select gallery_id from schedules
    where frame_id = ${frameId} and starts_on <= ${onDay} and (ends_on is null or ends_on >= ${onDay})
    order by starts_on desc, id desc limit 1`) as { gallery_id: number }[]
  return rows[0]?.gallery_id ?? fallback
}

async function play(slug: string, tz: string | null) {
  const sql = db()
  const frames = (await sql`select id, room, gallery_id from frames where slug = ${slug}`) as { id: number; room: string; gallery_id: number | null }[]
  const frame = frames[0]
  if (!frame) throw new HttpError(404, 'No frame with that code')
  const gid = await currentGalleryId(frame.id, frame.gallery_id, today(tz))
  if (!gid) return { frame: { room: frame.room }, gallery: null, photos: [] }
  const g = (await sql`select id, name, caption, music_url, music_name from galleries where id = ${gid}`)[0] ?? null
  const photos = await sql`select id, url, caption from photos where gallery_id = ${gid} order by position, id`
  return { frame: { room: frame.room }, gallery: g, photos }
}

async function overview() {
  const sql = db()
  const on = today()
  const galleries = await sql`
    select g.id, g.name, g.caption, g.music_url, g.music_name,
      (select count(*)::int from photos p where p.gallery_id = g.id) as count,
      (select url from photos p where p.gallery_id = g.id order by position, id limit 1) as cover
    from galleries g order by g.created_at desc, g.id desc`
  const frames = (await sql`select id, slug, room, gallery_id from frames order by created_at, id`) as { id: number; slug: string; room: string; gallery_id: number | null }[]
  const schedules = await sql`select id, frame_id, gallery_id, to_char(starts_on, 'YYYY-MM-DD') as starts_on, to_char(ends_on, 'YYYY-MM-DD') as ends_on
    from schedules where ends_on is null or ends_on >= ${on} order by starts_on, id`
  const out = []
  for (const f of frames) {
    out.push({ ...f, current_gallery_id: await currentGalleryId(f.id, f.gallery_id, on) })
  }
  return { today: on, frames: out, galleries, schedules }
}

/* ---------- router ---------- */
async function handle(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const op = url.searchParams.get('op') || ''
  const body: Record<string, unknown> = req.method === 'POST' ? await req.json().catch(() => ({})) : {}

  if (op === 'session') return json({ admin: isAdmin(req) })
  if (op === 'login' && req.method === 'POST') {
    if (!process.env.FRAMES_ADMIN_PASSWORD) return json({ error: 'The admin password has not been set up yet.' }, 503)
    if (!passwordOk(body.password)) return json({ error: 'That password is not right.' }, 401)
    return json({ admin: true }, 200, { 'set-cookie': cookieHeader(makeSession(), WEEK, req) })
  }
  if (op === 'logout') return json({ admin: false }, 200, { 'set-cookie': cookieHeader('', 0, req) })
  if (op !== 'play' && op !== 'upload' && !isAdmin(req)) return json({ error: 'Sign in first' }, 401)

  await ensureSchema()
  const sql = db()

  if (op === 'play') return json(await play(str(url.searchParams.get('slug'), 'slug', 60), url.searchParams.get('tz')))

  // Upload tokens: Vercel Blob calls back here too, but only token requests need the session.
  if (op === 'upload') {
    const uploadBody = body as unknown as HandleUploadBody
    if (uploadBody.type === 'blob.generate-client-token' && !isAdmin(req)) return json({ error: 'Sign in first' }, 401)
    const result = await handleUpload({
      body: uploadBody,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/ogg'],
        maximumSizeInBytes: 40 * 1024 * 1024,
        addRandomSuffix: true,
      }),
    })
    return json(result)
  }

  switch (op) {
    case 'overview':
      return json(await overview())

    case 'gallery': {
      const id = int(url.searchParams.get('id'), 'id')
      const g = (await sql`select id, name, caption, music_url, music_name from galleries where id = ${id}`)[0]
      if (!g) throw new HttpError(404, 'Gallery not found')
      const photos = await sql`select id, url, caption, position from photos where gallery_id = ${id} order by position, id`
      const used = await sql`select room from frames where gallery_id = ${id} order by room`
      return json({ gallery: g, photos, usedBy: used })
    }

    case 'gallery-save': {
      const name = str(body.name, 'Name', 80)
      const caption = optStr(body.caption, 300)
      if (body.id) {
        const id = int(body.id, 'id')
        await sql`update galleries set name = ${name}, caption = ${caption} where id = ${id}`
        return json({ id })
      }
      const rows = (await sql`insert into galleries (name, caption) values (${name}, ${caption}) returning id`) as { id: number }[]
      return json({ id: rows[0].id })
    }

    case 'gallery-delete': {
      const id = int(body.id, 'id')
      const files = (await sql`select url from photos where gallery_id = ${id}
        union all select music_url as url from galleries where id = ${id} and music_url is not null`) as { url: string }[]
      await sql`delete from galleries where id = ${id}`
      const urls = files.map((f) => f.url).filter(isBlobUrl)
      if (urls.length) await del(urls).catch(() => {})
      return json({ ok: true })
    }

    case 'gallery-music': {
      const id = int(body.id, 'id')
      const old = (await sql`select music_url from galleries where id = ${id}`)[0] as { music_url: string | null } | undefined
      const musicUrl = body.url ? str(body.url, 'url', 1000) : null
      if (musicUrl && !isBlobUrl(musicUrl)) throw new HttpError(400, 'Music must be uploaded here')
      await sql`update galleries set music_url = ${musicUrl}, music_name = ${musicUrl ? optStr(body.name, 120) : null} where id = ${id}`
      if (old?.music_url && old.music_url !== musicUrl && isBlobUrl(old.music_url)) await del(old.music_url).catch(() => {})
      return json({ ok: true })
    }

    case 'photo-add': {
      const galleryId = int(body.gallery_id, 'gallery_id')
      const photoUrl = str(body.url, 'url', 1000)
      if (!isBlobUrl(photoUrl)) throw new HttpError(400, 'Photos must be uploaded here')
      const rows = (await sql`insert into photos (gallery_id, url, pathname, position)
        values (${galleryId}, ${photoUrl}, ${optStr(body.pathname, 500)},
          coalesce((select max(position) + 1 from photos where gallery_id = ${galleryId}), 0))
        returning id`) as { id: number }[]
      return json({ id: rows[0].id })
    }

    case 'photo-caption': {
      await sql`update photos set caption = ${optStr(body.caption, 300)} where id = ${int(body.id, 'id')}`
      return json({ ok: true })
    }

    case 'photo-delete': {
      const id = int(body.id, 'id')
      const rows = (await sql`delete from photos where id = ${id} returning url`) as { url: string }[]
      if (rows[0] && isBlobUrl(rows[0].url)) await del(rows[0].url).catch(() => {})
      return json({ ok: true })
    }

    case 'photo-order': {
      const galleryId = int(body.gallery_id, 'gallery_id')
      const ids = Array.isArray(body.ids) ? body.ids.map((x) => int(x, 'ids')) : []
      for (let i = 0; i < ids.length; i++) {
        await sql`update photos set position = ${i} where id = ${ids[i]} and gallery_id = ${galleryId}`
      }
      return json({ ok: true })
    }

    case 'frame-save': {
      const room = str(body.room, 'Room', 60)
      if (body.id) {
        await sql`update frames set room = ${room} where id = ${int(body.id, 'id')}`
        return json({ ok: true })
      }
      // The slug is what the printed QR code points at, so it is set once and never changes.
      const base = slugify(optStr(body.slug, 60) || room) || 'frame'
      let slug = base
      for (let n = 2; ; n++) {
        const taken = await sql`select 1 from frames where slug = ${slug}`
        if (!taken.length) break
        slug = `${base}-${n}`
      }
      const galleryId = body.gallery_id ? int(body.gallery_id, 'gallery_id') : null
      const rows = (await sql`insert into frames (slug, room, gallery_id) values (${slug}, ${room}, ${galleryId}) returning id, slug`) as { id: number; slug: string }[]
      return json(rows[0])
    }

    case 'frame-set': {
      const galleryId = body.gallery_id ? int(body.gallery_id, 'gallery_id') : null
      await sql`update frames set gallery_id = ${galleryId} where id = ${int(body.id, 'id')}`
      return json({ ok: true })
    }

    case 'frame-delete': {
      await sql`delete from frames where id = ${int(body.id, 'id')}`
      return json({ ok: true })
    }

    case 'schedule-add': {
      const frameId = int(body.frame_id, 'frame_id')
      const galleryId = int(body.gallery_id, 'gallery_id')
      const starts = day(body.starts_on, 'Start date')
      const ends = body.ends_on ? day(body.ends_on, 'End date') : null
      if (ends && ends < starts) throw new HttpError(400, 'The end date is before the start date')
      await sql`insert into schedules (frame_id, gallery_id, starts_on, ends_on) values (${frameId}, ${galleryId}, ${starts}, ${ends})`
      return json({ ok: true })
    }

    case 'schedule-delete': {
      await sql`delete from schedules where id = ${int(body.id, 'id')}`
      return json({ ok: true })
    }
  }
  return json({ error: 'Unknown operation' }, 404)
}

async function route(req: Request) {
  try {
    return await handle(req)
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status)
    console.error('frames api error', e)
    return json({ error: 'Something went wrong on the server.' }, 500)
  }
}

export function GET(req: Request) { return route(req) }
export function POST(req: Request) { return route(req) }
