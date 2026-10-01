import { usableChannels, type SellerContact } from '../src/lib/seller'

/**
 * A listing stores the channels chosen at posting time. usableChannels is the
 * one place that decides what is still offered, so the rules that matter live
 * or die here:
 *
 *   - a TrustClub profile is an identity, not an inbox
 *   - a Facebook page is a detour with no way to say "I want this"
 *
 * Both were offered before and are snapshotted on listings posted then, so
 * dropping them needed no migration — but it does need a test, or the next
 * person to add a channel map will quietly put them back.
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
  it('never offers TrustClub, even on a listing that stored it', () => {
    expect(usableChannels(['TRUSTCLUB'], seller({ hasPhone: true }))).toEqual([])
  })

  it('never offers Facebook, even when the seller still has a page', () => {
    expect(usableChannels(['FACEBOOK'], seller({ hasFacebook: true }))).toEqual([])
  })

  it('keeps the reachable ones from an old snapshot and drops the rest', () => {
    const chosen = ['PHONE', 'SMS', 'MESSENGER', 'VIBER', 'FACEBOOK', 'TRUSTCLUB']
    expect(usableChannels(chosen, seller({ hasPhone: true, hasViber: true }))).toEqual([
      'PHONE',
      'SMS',
      'VIBER',
    ])
  })

  it('drops a channel the seller has since cleared from their profile', () => {
    expect(usableChannels(['MESSENGER'], seller({ hasPhone: true }))).toEqual([])
  })

  it('leaves a listing with nothing when its seller can no longer be reached', () => {
    expect(usableChannels(['PHONE', 'TRUSTCLUB'], seller())).toEqual([])
  })
})
