import { usableChannels, type SellerContact } from '../src/lib/seller'

/**
 * usableChannels is the one place that decides what a listing page offers, so
 * the rules that matter live or die here:
 *
 *   - a TrustClub profile is an identity, not an inbox
 *   - a Facebook page is a detour with no way to say "I want this"
 *   - Messenger is gone: it needed a username people had to go and find in
 *     another app, and a stored display name opened on nobody
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
    phoneReach: 'BOTH',
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

  it('never offers Messenger, even for a seller who stored a handle', () => {
    // The column is still there and still holds the handles people entered
    // before the channel was retired; nothing reads it.
    expect(usableChannels(seller({ hasViber: true }))).not.toContain('MESSENGER')
  })

  it('picks up a channel added after the listing was posted', () => {
    // The listing's snapshot is not consulted at all, which is the point: a
    // seller who adds a number becomes reachable on every listing they have,
    // without editing any of them.
    expect(usableChannels(seller({ hasPhone: true, hasViber: true }))).toEqual(['PHONE', 'SMS', 'VIBER'])
  })

  it('drops a channel the seller has since cleared from their profile', () => {
    expect(usableChannels(seller({ hasViber: true }))).toEqual(['VIBER'])
    expect(usableChannels(seller())).toEqual([])
  })

  it('offers only what the seller answers', () => {
    expect(usableChannels(seller({ hasPhone: true, phoneReach: 'CALL_ONLY' }))).toEqual(['PHONE'])
    expect(usableChannels(seller({ hasPhone: true, phoneReach: 'SMS_ONLY' }))).toEqual(['SMS'])
  })

  it('leaves Viber alone whichever phone channel is chosen', () => {
    const smsOnly = seller({ hasPhone: true, phoneReach: 'SMS_ONLY', hasViber: true })
    expect(usableChannels(smsOnly)).toEqual(['SMS', 'VIBER'])
  })

  it('ignores the preference for a seller with no number', () => {
    expect(usableChannels(seller({ phoneReach: 'CALL_ONLY' }))).toEqual([])
  })

  it('orders them call, text, Viber', () => {
    const all = seller({ hasPhone: true, hasViber: true })
    expect(usableChannels(all)).toEqual(['PHONE', 'SMS', 'VIBER'])
  })
})
