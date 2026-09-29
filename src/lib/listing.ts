import type { ListingType, PriceUnit } from '@prisma/client'

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
export const VIDEO_HOSTS: Record<string, string> = {
  'youtube.com': 'YouTube',
  'www.youtube.com': 'YouTube',
  'm.youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'facebook.com': 'Facebook',
  'www.facebook.com': 'Facebook',
  'm.facebook.com': 'Facebook',
  'web.facebook.com': 'Facebook',
  'fb.watch': 'Facebook',
  'tiktok.com': 'TikTok',
  'www.tiktok.com': 'TikTok',
  'vm.tiktok.com': 'TikTok',
}

/** The platform's name, for a button that says where it is about to go. */
export function videoHostName(url: string): string | null {
  try {
    return VIDEO_HOSTS[new URL(url).hostname.toLowerCase()] ?? null
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
  if (!VIDEO_HOSTS[parsed.hostname.toLowerCase()]) {
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

export const PRICE_UNIT_LABEL: Record<PriceUnit, string> = {
  TOTAL: '',
  // Non-breaking after the slash: a narrow card must not break "₱450 / day"
  // into "₱450 /" and "day", which reads as a flat ₱450.
  PER_HOUR: '/\u00A0hour',
  PER_DAY: '/\u00A0day',
  PER_WEEK: '/\u00A0week',
  PER_MONTH: '/\u00A0month',
  PER_JOB: '/\u00A0job',
  QUOTE: 'ask for a quote',
}

export const LISTING_TYPE_LABEL: Record<ListingType, string> = {
  SELL: 'For sale',
  RENT: 'For rent',
  SERVICE: 'Service',
}

/**
 * Peso formatting. A null price is "Ask" — never ₱0, which would read as free.
 */
export function formatPrice(price: number | null | undefined, unit: PriceUnit | null): string {
  if (unit === 'QUOTE') return 'Ask for a quote'
  if (price === null || price === undefined) return 'Ask'
  const amount = '₱' + Number(price).toLocaleString('en-PH', { maximumFractionDigits: 0 })
  const suffix = unit ? PRICE_UNIT_LABEL[unit] : ''
  return suffix ? `${amount}\u00A0${suffix}` : amount
}

export function listingPath(code: string, slug: string): string {
  return `/l/${code}-${slug}`
}

/** `/l/7KQ4M2-honda-click-125i` -> `7KQ4M2`. */
export function codeFromParam(param: string): string {
  return (param.split('-')[0] ?? '').toUpperCase()
}
