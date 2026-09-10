import { compareByTrust, type RankedListing } from '@/lib/search'
import { formatTrustPoints, trustState } from '@/lib/trust-format'
import { maskPhone, normalizePhPhone, timeAgo } from '@/lib/format'

function ranked(trustPoints: number | null, postedAt: string, id = trustPoints + postedAt): RankedListing {
  return {
    trustPoints,
    listing: { id, postedAt: new Date(postedAt) } as RankedListing['listing'],
  }
}

describe('compareByTrust', () => {
  it('puts a stronger trust path first', () => {
    const a = ranked(480, '2026-09-01')
    const b = ranked(45, '2026-09-09')
    expect([b, a].sort(compareByTrust)).toEqual([a, b])
  })

  it('falls back to recency at equal trust', () => {
    const older = ranked(100, '2026-09-01')
    const newer = ranked(100, '2026-09-09')
    expect([older, newer].sort(compareByTrust)).toEqual([newer, older])
  })

  it('ranks any trust path above none', () => {
    const some = ranked(1, '2026-01-01')
    const none = ranked(0, '2026-09-09')
    expect([none, some].sort(compareByTrust)).toEqual([some, none])
  })

  it('sorts an unknown trust value below a known zero', () => {
    // A failed lookup is not evidence of trust, so it must not be promoted;
    // it also must not be hidden, so it sorts just under "no path".
    const none = ranked(0, '2026-09-01')
    const unknown = ranked(null, '2026-09-09')
    expect([unknown, none].sort(compareByTrust)).toEqual([none, unknown])
  })

  it('keeps the viewer’s own listing at the top', () => {
    const self = ranked(Number.POSITIVE_INFINITY, '2020-01-01')
    const other = ranked(9999, '2026-09-09')
    expect([other, self].sort(compareByTrust)).toEqual([self, other])
  })
})

describe('formatTrustPoints', () => {
  it('matches TruRate’s abbreviations', () => {
    expect(formatTrustPoints(320)).toBe('320')
    expect(formatTrustPoints(1000)).toBe('1k')
    expect(formatTrustPoints(1500)).toBe('1.5k')
    expect(formatTrustPoints(150_000)).toBe('150k')
    expect(formatTrustPoints(2_000_000)).toBe('2M')
    expect(formatTrustPoints(2_500_000)).toBe('2.5M')
  })

  it('distinguishes zero from unknown', () => {
    expect(formatTrustPoints(0)).toBe('0')
    expect(formatTrustPoints(null)).toBe('...')
    expect(formatTrustPoints(undefined)).toBe('...')
  })
})

describe('trustState', () => {
  it('separates the four cases the badge renders differently', () => {
    expect(trustState(320)).toBe('some')
    expect(trustState(0)).toBe('none')
    expect(trustState(null)).toBe('unknown')
    expect(trustState(Number.POSITIVE_INFINITY)).toBe('self')
  })
})

describe('normalizePhPhone', () => {
  it('accepts the three forms people actually type', () => {
    expect(normalizePhPhone('09175551234')).toBe('+639175551234')
    expect(normalizePhPhone('+63 917 555 1234')).toBe('+639175551234')
    expect(normalizePhPhone('639175551234')).toBe('+639175551234')
    expect(normalizePhPhone('9175551234')).toBe('+639175551234')
  })

  it('rejects landlines and malformed numbers', () => {
    expect(normalizePhPhone('0281234567')).toBeNull()
    expect(normalizePhPhone('12345')).toBeNull()
    expect(normalizePhPhone('')).toBeNull()
  })
})

describe('maskPhone', () => {
  it('keeps only the last four digits', () => {
    expect(maskPhone('+639175551234')).toBe('+63 9•• ••• 1234')
  })
})

describe('timeAgo', () => {
  it('is coarse, because listings age in days', () => {
    const now = Date.now()
    expect(timeAgo(new Date(now - 30_000))).toBe('just now')
    expect(timeAgo(new Date(now - 2 * 3600_000))).toBe('2 hours ago')
    expect(timeAgo(new Date(now - 26 * 3600_000))).toBe('yesterday')
    expect(timeAgo(new Date(now - 3 * 86400_000))).toBe('3 days ago')
    expect(timeAgo(new Date(now - 21 * 86400_000))).toBe('3 weeks ago')
  })
})
