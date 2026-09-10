/**
 * Trust point presentation, kept identical to TruRate so the number means the
 * same thing to a member who uses both products.
 *
 * Ported from TruRate's `formatTrustPoints`: 1.2k / 3.4M abbreviations, and
 * '...' while a value is still unknown.
 */
export function formatTrustPoints(value: number | undefined | null): string {
  if (value === undefined || value === null) return '...'
  if (!Number.isFinite(value)) return '∞'
  if (value === 0) return '0'

  if (value >= 1_000_000) {
    const millions = value / 1_000_000
    return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`
  }
  if (value >= 1000) {
    const thousands = value / 1000
    if (thousands < 100 && thousands % 1 !== 0) return `${thousands.toFixed(1)}k`
    return thousands % 1 === 0 ? `${thousands}k` : `${Math.round(thousands)}k`
  }
  return value.toString()
}

/**
 * What a trust value MEANS, which the number alone can't say:
 *  - `null`  the lookup failed or was never made — an unknown, not a zero
 *  - `0`     the graph has no path between these two people
 *  - `âˆž`  the viewer is looking at their own listing
 */
export type TrustState = 'unknown' | 'none' | 'self' | 'some'

export function trustState(points: number | null | undefined): TrustState {
  if (points === undefined || points === null) return 'unknown'
  if (!Number.isFinite(points)) return 'self'
  if (points <= 0) return 'none'
  return 'some'
}

export const TRUST_STATE_TEXT: Record<TrustState, string> = {
  unknown: 'Trust unknown',
  none: 'No trust path',
  self: 'Your listing',
  some: '',
}
