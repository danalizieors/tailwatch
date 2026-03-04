export function toTimestamp(value?: string | number | Date): number | null {
  if (value === undefined || value === null) return null

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (value instanceof Date) {
    const ts = value.getTime()
    return Number.isNaN(ts) ? null : ts
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null

    // Numeric timestamp strings (e.g. "1700000000000") should be parsed as epoch ms.
    if (/^\d+$/.test(trimmed)) {
      const numeric = Number(trimmed)
      return Number.isFinite(numeric) ? numeric : null
    }
  }

  const ts = new Date(value).getTime()
  return Number.isNaN(ts) ? null : ts
}

export function formatDateTime(value?: string | number | Date): string {
  const ts = toTimestamp(value)
  if (ts === null) return '—'

  const date = new Date(ts)
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(date)
}

export function formatAbsolute(value?: string | number | Date): string {
  const ts = toTimestamp(value)
  if (ts === null) return '—'

  const date = new Date(ts)

  const pad = (n: number) => n.toString().padStart(2, '0')

  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const hh = pad(date.getHours())
  const mm = pad(date.getMinutes())
  const ss = pad(date.getSeconds())

  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
}

export function formatRelative(value?: string | number | Date): string {
  const ts = toTimestamp(value)
  if (ts === null) return '—'

  const deltaMs = ts - Date.now()
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['day', 86_400_000],
    ['hour', 3_600_000],
    ['minute', 60_000],
    ['second', 1000],
  ]

  for (const [unit, ms] of ranges) {
    if (Math.abs(deltaMs) >= ms || unit === 'second') {
      return rtf.format(Math.round(deltaMs / ms), unit)
    }
  }
  return '—'
}

export function formatDuration(ms?: number) {
  if (!ms || ms < 0) return '—'
  if (ms < 1000) return `${ms}ms`
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remSeconds = seconds % 60
  if (minutes < 60) return `${minutes}m ${remSeconds}s`
  const hours = Math.floor(minutes / 60)
  const remMinutes = minutes % 60
  return `${hours}h ${remMinutes}m`
}
