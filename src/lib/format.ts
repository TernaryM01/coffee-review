import { ConvexError } from 'convex/values'

/** "★★★½" — Letterboxd-style text rating. */
export function stars(rating: number): string {
  const full = Math.floor(rating)
  return '★'.repeat(full) + (rating - full >= 0.5 ? '½' : '')
}

export function todayISO(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Parse YYYY-MM-DD as a local calendar date (not UTC midnight). */
function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function monthLabel(iso: string): { month: string; year: string } {
  const d = parseISODate(iso)
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    year: String(d.getFullYear()),
  }
}

export function dayOfMonth(iso: string): string {
  return String(parseISODate(iso).getDate()).padStart(2, '0')
}

export function timeAgo(ms: number): string {
  const s = Math.max(0, (Date.now() - ms) / 1000)
  if (s < 60) return 'just now'
  const m = s / 60
  if (m < 60) return `${Math.floor(m)}m`
  const h = m / 60
  if (h < 24) return `${Math.floor(h)}h`
  const d = h / 24
  if (d < 30) return `${Math.floor(d)}d`
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function altitude(min?: number, max?: number): string | null {
  const f = (n: number) => n.toLocaleString('en-US')
  if (min !== undefined && max !== undefined && min !== max) return `${f(min)}–${f(max)} masl`
  const one = min ?? max
  return one === undefined ? null : `${f(one)} masl`
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`
}

export function compact(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n)
}

export function errorMessage(error: unknown): string {
  if (error instanceof ConvexError && typeof error.data === 'string') return error.data
  // Errors thrown in the browser (e.g. upload checks) carry a readable message;
  // unexpected server errors are prefixed with "[CONVEX" and aren't shown.
  if (error instanceof Error && !error.message.startsWith('[CONVEX')) return error.message
  return 'Something went wrong. Please try again.'
}

/** Stable small hash for picking colors from a palette. */
export function hash(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
