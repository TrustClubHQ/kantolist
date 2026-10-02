import type { ListingType, PriceUnit } from '@prisma/client'
import type { T } from './i18n'

/** A bump resets postedAt, at most this often. */
export const BUMP_COOLDOWN_DAYS = 7

/** Members with no incoming trust are capped here; everyone else gets the higher cap. */
export const MAX_ACTIVE_LISTINGS_UNTRUSTED = 3
export const MAX_ACTIVE_LISTINGS = 40
export const MAX_NEW_LISTINGS_PER_DAY = 10

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/**
 * A video the seller already posted somewhere else. KantoList does not host
 * video — a minute of phone footage is larger than every photo on the site put
 * together — so this is a link out, and only to the places sellers here
 * actually use. An unknown host is refused rather than stored and rendered as
 * a link to anywhere.
 */
/**
 * The video sites a listing may link out to, matched by domain family rather
 * than by an exact list of hostnames.
 *
 * It used to be an exact list, and it rejected `vt.tiktok.com` — which is the
 * link TikTok's own share sheet hands out across much of Asia. A seller pasted
 * a genuine TikTok link and was told "Paste a YouTube, Facebook or TikTok
 * link", so they pasted it again. `ph.facebook.com`, `fb.me` and Facebook's
 * `l.facebook.com` redirect wrapper failed the same way. Enumerating every
 * subdomain these three companies use is a losing game; matching the domain
 * is not.
 *
 * The leading dot in the suffix test is what keeps it honest: `evil-tiktok.com`
 * and `tiktok.com.example.net` are not subdomains of `tiktok.com` and do not
 * match.
 */
const VIDEO_HOST_FAMILIES: { domain: string; name: string }[] = [
  { domain: 'youtube.com', name: 'YouTube' },
  { domain: 'youtu.be', name: 'YouTube' },
  { domain: 'facebook.com', name: 'Facebook' },
  { domain: 'fb.watch', name: 'Facebook' },
  { domain: 'fb.me', name: 'Facebook' },
  { domain: 'tiktok.com', name: 'TikTok' },
]

/** The site's name for a hostname, or null if we do not link out to it. */
export function videoHostFor(hostname: string): string | null {
  // A trailing dot is a legal, fully-qualified form of the same host.
  const host = hostname.toLowerCase().replace(/\.$/, '')
  for (const { domain, name } of VIDEO_HOST_FAMILIES) {
    if (host === domain || host.endsWith(`.${domain}`)) return name
  }
  return null
}

/** The platform's name, for a button that says where it is about to go. */
export function videoHostName(url: string): string | null {
  try {
    return videoHostFor(new URL(url).hostname)
  } catch {
    return null
  }
}

/**
 * `null` for an empty box, a string for a link worth storing, and an `error`
 * for anything else — a typo should be said out loud at the form, not dropped
 * silently on the way to the database.
 */
export function parseVideoUrl(raw: string | null | undefined): { url: string | null } | { error: string } {
  const value = (raw ?? '').trim()
  if (!value) return { url: null }
  // A pasted link often arrives bare; assume the secure scheme rather than
  // refusing something the seller can see works in their browser.
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`
  let parsed: URL
  try {
    parsed = new URL(withScheme)
  } catch {
    return { error: 'That does not look like a link' }
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { error: 'That does not look like a link' }
  }
  if (!videoHostFor(parsed.hostname)) {
    return { error: 'Paste a YouTube, Facebook or TikTok link' }
  }
  parsed.protocol = 'https:'
  parsed.hash = ''
  return { url: parsed.toString() }
}

/** Which price units make sense for each listing type — enforced on write. */
export const PRICE_UNITS_FOR_TYPE: Record<ListingType, PriceUnit[]> = {
  SELL: ['TOTAL'],
  RENT: ['PER_HOUR', 'PER_DAY', 'PER_WEEK', 'PER_MONTH'],
  SERVICE: ['PER_HOUR', 'PER_JOB', 'QUOTE'],
}

/**
 * The unit suffix, in the reader's language.
 *
 * Non-breaking after the slash: a narrow card must not break "₱450 / day" into
 * "₱450 /" and "day", which reads as a flat ₱450.
 */
export function priceUnitLabel(unit: PriceUnit, t: T): string {
  if (unit === 'TOTAL') return ''
  return t(`price.${unit}`).replace(/^\/ /, '/\u00A0')
}

export function listingTypeLabel(type: ListingType, t: T): string {
  return t(`type.${type}`)
}

/**
 * Peso formatting. A null price is "Ask" — never ₱0, which would read as free.
 */
export function formatPrice(price: number | null | undefined, unit: PriceUnit | null, t: T): string {
  if (unit === 'QUOTE') return t('price.quote')
  if (price === null || price === undefined) return t('price.ask')
  const amount = '₱' + Number(price).toLocaleString('en-PH', { maximumFractionDigits: 0 })
  const suffix = unit ? priceUnitLabel(unit, t) : ''
  return suffix ? `${amount}\u00A0${suffix}` : amount
}

export function listingPath(code: string, slug: string): string {
  return `/l/${code}-${slug}`
}

/** `/l/7KQ4M2-honda-click-125i` -> `7KQ4M2`. */
export function codeFromParam(param: string): string {
  return (param.split('-')[0] ?? '').toUpperCase()
}
