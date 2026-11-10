const TZ = 'America/Mexico_City'

export function parseDate(d: string) {
  // Fechas tipo YYYY-MM-DD se interpretan en hora local, sin desfase.
  const [y, m, day] = d.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, day)
}

export function today() {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}

export function daysUntil(d: string | null) {
  if (!d) return null
  return Math.round((parseDate(d).getTime() - today().getTime()) / 86400000)
}

export function fmtDate(d: string | null, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!d) return ''
  return parseDate(d).toLocaleDateString('es-MX', opts).replace('.', '')
}

export function fmtShort(d: string | null) {
  return fmtDate(d, { day: 'numeric', month: 'short' })
}

export function fmtRange(a: string | null, b: string | null) {
  if (!a) return 'Por definir'
  if (!b || a === b) return fmtDate(a)
  const da = parseDate(a), db = parseDate(b)
  if (da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth()) {
    return `${da.getDate()} al ${fmtDate(b)}`
  }
  return `${fmtShort(a)} al ${fmtDate(b)}`
}

export function relative(days: number | null) {
  if (days === null) return ''
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Mañana'
  if (days === -1) return 'Ayer'
  if (days < 0) return `Hace ${-days} días`
  if (days < 60) return `En ${days} días`
  const months = Math.round(days / 30)
  return `En ${months} meses`
}

export function urgency(days: number | null): 'late' | 'soon' | 'ok' | 'none' {
  if (days === null) return 'none'
  if (days < 0) return 'late'
  if (days <= 7) return 'soon'
  return 'ok'
}

export function isoDate(d: Date) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function firstName(full: string) {
  return full.trim().split(/\s+/)[0] || ''
}

export function initials(full: string) {
  return full.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
}

export function slugKey(label: string) {
  const s = label
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return /^[a-z]/.test(s) ? s : `v_${s || 'campo'}`
}

export function greeting() {
  const h = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: TZ }))
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}
