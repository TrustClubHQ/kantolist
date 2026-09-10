import type { ListingType, PriceUnit } from '@prisma/client'

/** Days an ACTIVE listing stays visible before it expires. */
export const LISTING_TTL_DAYS: Record<ListingType, number> = {
  SELL: 30,
  RENT: 60,
  SERVICE: 60,
}

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

export function expiryFor(type: ListingType, from = new Date()): Date {
  const d = new Date(from)
  d.setDate(d.getDate() + LISTING_TTL_DAYS[type])
  return d
}

/** Which price units make sense for each listing type — enforced on write. */
export const PRICE_UNITS_FOR_TYPE: Record<ListingType, PriceUnit[]> = {
  SELL: ['TOTAL'],
  RENT: ['PER_HOUR', 'PER_DAY', 'PER_WEEK', 'PER_MONTH'],
  SERVICE: ['PER_HOUR', 'PER_JOB', 'QUOTE'],
}

export const PRICE_UNIT_LABEL: Record<PriceUnit, string> = {
  TOTAL: '',
  PER_HOUR: '/ hour',
  PER_DAY: '/ day',
  PER_WEEK: '/ week',
  PER_MONTH: '/ month',
  PER_JOB: '/ job',
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
  return suffix ? `${amount} ${suffix}` : amount
}

export function listingPath(code: string, slug: string): string {
  return `/l/${code}-${slug}`
}

/** `/l/7KQ4M2-honda-click-125i` -> `7KQ4M2`. */
export function codeFromParam(param: string): string {
  return (param.split('-')[0] ?? '').toUpperCase()
}
