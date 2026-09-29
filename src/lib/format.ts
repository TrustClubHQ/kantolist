import type { T } from './i18n'

/**
 * "2 days ago" — coarse on purpose; listings age in days, not seconds.
 *
 * The translator is a parameter rather than a hook so this stays usable from
 * server components, client components and tests alike.
 */
export function timeAgo(date: Date | string, t: T): string {
  const then = typeof date === 'string' ? new Date(date) : date
  const seconds = Math.max(0, Math.floor((Date.now() - then.getTime()) / 1000))
  const days = Math.floor(seconds / 86400)

  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    return minutes <= 1 ? t('time.justNow') : t('time.minutes', { count: minutes })
  }
  if (days < 1) {
    const hours = Math.floor(seconds / 3600)
    return hours === 1 ? t('time.hour') : t('time.hours', { count: hours })
  }
  if (days === 1) return t('time.yesterday')
  if (days < 7) return t('time.days', { count: days })
  if (days < 14) return t('time.week')
  if (days < 60) return t('time.weeks', { count: Math.floor(days / 7) })
  return t('time.months', { count: Math.floor(days / 30) })
}

/**
 * Trust badge text. `null` means the lookup failed or was never made — say so,
 * rather than printing a 0 that would libel the poster as untrusted.
 */
export function trustLabel(points: number | null | undefined, t: T, via?: string | null): string {
  if (points === undefined || points === null) return t('trust.unknown')
  if (!Number.isFinite(points)) return t('trust.self')
  if (points <= 0) return t('trust.none')
  return via ? `${points} TP ${t('trust.via', { via })}` : `${points} TP`
}

/** A PH mobile, masked for anonymous viewers: +63 9•• ••• 1234 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '•••'
  const tail = digits.slice(-4)
  return `+63 9•• ••• ${tail}`
}

/** Accepts 09XXXXXXXXX / +639XXXXXXXXX / 639XXXXXXXXX, returns +639XXXXXXXXX. */
export function normalizePhPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  let local: string
  if (digits.startsWith('63') && digits.length === 12) local = digits.slice(2)
  else if (digits.startsWith('0') && digits.length === 11) local = digits.slice(1)
  else if (digits.length === 10) local = digits
  else return null
  if (!local.startsWith('9')) return null
  return `+63${local}`
}
