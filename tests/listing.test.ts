import {
  slugify, expiryFor, formatPrice, listingPath, codeFromParam,
  PRICE_UNITS_FOR_TYPE, LISTING_TTL_DAYS,
} from '@/lib/listing'
import { generateCode } from '@/lib/code'

describe('slugify', () => {
  it('makes a url-safe slug from a real title', () => {
    expect(slugify('Honda Click 125i — daily rental')).toBe('honda-click-125i-daily-rental')
    expect(slugify('Mountain bike 26", 21-speed')).toBe('mountain-bike-26-21-speed')
  })

  it('never leaves leading or trailing separators', () => {
    expect(slugify('  ¡Hola!  ')).toBe('hola')
    expect(slugify('!!!')).toBe('')
  })

  it('bounds the length so a URL stays readable', () => {
    expect(slugify('a'.repeat(200)).length).toBeLessThanOrEqual(60)
  })
})

describe('generateCode', () => {
  it('avoids characters that are misread over the phone', () => {
    const codes = Array.from({ length: 200 }, () => generateCode())
    for (const code of codes) {
      expect(code).toHaveLength(6)
      expect(code).not.toMatch(/[01IO]/)
      expect(code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]+$/)
    }
  })
})

describe('expiryFor', () => {
  it('gives rentals and services a longer life than sales', () => {
    const from = new Date('2026-09-10T00:00:00Z')
    const days = (d: Date) => Math.round((d.getTime() - from.getTime()) / 86400_000)
    expect(days(expiryFor('SELL', from))).toBe(LISTING_TTL_DAYS.SELL)
    expect(days(expiryFor('RENT', from))).toBe(LISTING_TTL_DAYS.RENT)
    expect(days(expiryFor('SERVICE', from))).toBe(LISTING_TTL_DAYS.SERVICE)
  })
})

describe('formatPrice', () => {
  it('formats pesos with the unit', () => {
    expect(formatPrice(450, 'PER_DAY')).toBe('₱450 / day')
    expect(formatPrice(52000, 'TOTAL')).toBe('₱52,000')
  })

  it('never shows ₱0 for an absent price, which would read as free', () => {
    expect(formatPrice(null, 'TOTAL')).toBe('Ask')
    expect(formatPrice(undefined, null)).toBe('Ask')
    expect(formatPrice(null, 'QUOTE')).toBe('Ask for a quote')
  })

  it('shows a real zero when a zero was actually entered', () => {
    expect(formatPrice(0, 'TOTAL')).toBe('₱0')
  })
})

describe('PRICE_UNITS_FOR_TYPE', () => {
  it('does not let a sale be priced per day, or a rental as a one-off total', () => {
    expect(PRICE_UNITS_FOR_TYPE.SELL).toEqual(['TOTAL'])
    expect(PRICE_UNITS_FOR_TYPE.RENT).not.toContain('TOTAL')
    expect(PRICE_UNITS_FOR_TYPE.SERVICE).toContain('QUOTE')
  })
})

describe('listing paths', () => {
  it('round-trips the code out of the url segment', () => {
    const path = listingPath('7KQ4M2', 'honda-click-125i')
    expect(path).toBe('/l/7KQ4M2-honda-click-125i')
    expect(codeFromParam('7KQ4M2-honda-click-125i')).toBe('7KQ4M2')
  })

  it('upper-cases a code someone typed in lower case', () => {
    expect(codeFromParam('7kq4m2-honda')).toBe('7KQ4M2')
  })

  it('handles a slug-less url', () => {
    expect(codeFromParam('7KQ4M2')).toBe('7KQ4M2')
  })
})
