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

/**
 * A Facebook username, from whatever someone pasted into the Messenger box.
 *
 * The box accepted anything and `m.me/<that>` was built from it verbatim, so a
 * pasted profile link became `m.me/https://www.facebook.com/juan.delacruz` and
 * a typed display name became `m.me/Juan Dela Cruz`. m.me answers 302 for all
 * of them — it never validates — so nothing looked wrong until a buyer tapped
 * the row and Messenger had no such person to open.
 *
 * Accepts what people actually paste: a bare username, @username, an m.me or
 * messenger.com/t link, or a facebook.com profile URL. Returns null for
 * anything that is not a username, including `profile.php?id=…` links, which
 * carry a numeric id rather than the username m.me needs.
 *
 * Facebook usernames are letters, digits and full stops, five or more.
 */
export function normalizeMessengerHandle(input: string): string | null {
  let value = input.trim()
  if (!value) return null

  // Pull the handle out of any of the link shapes people paste.
  const asUrl = /^(https?:\/\/)?(www\.|web\.|m\.)?(m\.me|messenger\.com|facebook\.com|fb\.com|fb\.me)\//i
  if (asUrl.test(value)) {
    value = value.replace(/^(https?:\/\/)?/i, 'https://')
    let path: string
    try {
      path = new URL(value).pathname
    } catch {
      return null
    }
    // messenger.com/t/<handle> puts the handle one segment deeper.
    const parts = path.split('/').filter(Boolean)
    if (parts[0]?.toLowerCase() === 't') parts.shift()
    value = parts[0] ?? ''
  }

  value = value.replace(/^@/, '').replace(/\/+$/, '')
  // A query string survives the bare-handle path ("juan.delacruz?mibextid=…").
  value = value.split(/[?#]/)[0]
  if (!/^[a-zA-Z0-9.]{5,60}$/.test(value)) return null
  // `facebook.com/profile.php?id=…` survives the pattern as "profile.php" —
  // dots and letters, long enough — and would have become `m.me/profile.php`.
  // That link means the person has no username, which is the one case m.me
  // cannot be given.
  if (/\.php$/i.test(value)) return null
  return value
}
