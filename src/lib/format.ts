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
 * A Messenger target, from whatever someone pasted into the Messenger box.
 *
 * The box accepted anything and `m.me/<that>` was built from it verbatim, so a
 * pasted profile link became `m.me/https://www.facebook.com/juan.delacruz` and
 * a typed display name became `m.me/Juan Dela Cruz`. m.me answers 302 for all
 * of them — it never validates — so nothing looked wrong until a buyer tapped
 * the row and Messenger had no such person to open.
 *
 * Takes a username, @username, an m.me / messenger.com/t link, or any
 * facebook.com profile URL — including the numeric shapes
 * (`profile.php?id=…`, `/people/Name/<id>`), because m.me forwards to
 * `messenger.com/t/<target>`, which resolves a profile id as readily as a
 * username. Most people here have no vanity username at all, so refusing the
 * numeric link meant refusing them.
 *
 * Returns null only for what cannot be resolved: a display name, an email, a
 * group-invite link.
 */
export function normalizeMessengerHandle(input: string): string | null {
  let value = input.trim()
  if (!value) return null

  // Pull the target out of any of the link shapes people paste.
  const asUrl = /^(https?:\/\/)?(www\.|web\.|m\.|mbasic\.)?(m\.me|messenger\.com|facebook\.com|fb\.com|fb\.me|fb\.watch)\//i
  if (asUrl.test(value)) {
    value = value.replace(/^(https?:\/\/)?/i, 'https://')
    let url: URL
    try {
      url = new URL(value)
    } catch {
      return null
    }
    const parts = url.pathname.split('/').filter(Boolean)
    // facebook.com/messages/t/<target> and messenger.com/t/<target> both put
    // it one or two segments deeper.
    if (parts[0]?.toLowerCase() === 'messages') parts.shift()
    if (parts[0]?.toLowerCase() === 't') parts.shift()
    const first = parts[0]?.toLowerCase() ?? ''
    // m.me/j/<code> invites a group chat, not a person.
    if (first === 'j') return null
    if (first === 'profile.php') {
      // No username: the id in the query string is the only handle they have.
      value = url.searchParams.get('id') ?? ''
    } else if (first === 'people') {
      // facebook.com/people/Juan-Dela-Cruz/61550000000000 — the id is last.
      value = parts[parts.length - 1] ?? ''
    } else {
      value = parts[0] ?? ''
    }
  }

  value = value.replace(/^@/, '').replace(/\/+$/, '')
  // A query string survives the bare-target path ("juan.delacruz?mibextid=…").
  value = value.split(/[?#]/)[0]

  // A profile id, pasted bare or dug out of a link above.
  if (/^\d{5,25}$/.test(value)) return value
  // Facebook usernames are letters, digits and full stops, five or more.
  if (!/^[a-zA-Z0-9.]{5,60}$/.test(value)) return null
  // A bare "profile.php" with no id to go with it resolves to nobody.
  if (/\.php$/i.test(value)) return null
  return value
}
