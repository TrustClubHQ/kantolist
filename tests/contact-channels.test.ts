import { usableChannels, type SellerContact } from '../src/lib/seller'

/**
 * usableChannels is the one place that decides what a listing page offers, so
 * the rules that matter live or die here:
 *
 *   - a TrustClub profile is an identity, not an inbox
 *   - a Facebook page is a detour with no way to say "I want this"
 *   - what it reads is the seller's profile today, never the listing's
 *     posting-time snapshot
 *
 * The last one is what keeps a listing posted before its seller had a phone
 * number from staying unanswerable for good.
 */
function seller(over: Partial<SellerContact> = {}): SellerContact {
  return {
    hasPhone: false,
    maskedPhone: null,
    hasMessenger: false,
    hasFacebook: false,
    hasViber: false,
    ...over,
  }
}

describe('usableChannels', () => {
  it('never offers TrustClub', () => {
    expect(usableChannels(seller({ hasPhone: true }))).not.toContain('TRUSTCLUB')
  })

  it('never offers Facebook, even when the seller still has a page', () => {
    expect(usableChannels(seller({ hasFacebook: true }))).toEqual([])
  })

  it('offers a number as both call and text', () => {
    expect(usableChannels(seller({ hasPhone: true }))).toEqual(['PHONE', 'SMS'])
  })

  it('picks up a channel added after the listing was posted', () => {
    // The listing's snapshot is not consulted at all, which is the point: a
    // seller who adds a number becomes reachable on every listing they have,
    // without editing any of them.
    expect(usableChannels(seller({ hasMessenger: true }))).toEqual(['MESSENGER'])
  })

  it('drops a channel the seller has since cleared from their profile', () => {
    expect(usableChannels(seller({ hasViber: true }))).toEqual(['VIBER'])
    expect(usableChannels(seller())).toEqual([])
  })

  it('orders them call, text, Messenger, Viber', () => {
    const all = seller({ hasPhone: true, hasMessenger: true, hasViber: true })
    expect(usableChannels(all)).toEqual(['PHONE', 'SMS', 'MESSENGER', 'VIBER'])
  })
})
