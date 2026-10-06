import type { PhoneReach } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { maskPhone } from '@/lib/format'

/**
 * What a listing page may know about a seller's contact details.
 *
 * The raw phone number deliberately never leaves this module. Selecting it in a
 * page query is not enough to keep it private: React Server Components
 * serialise the rendered tree into the HTML as a flight payload, so a value
 * that is merely "not displayed" is still sitting in the page source for any
 * scraper to read. Masking at the query boundary is what actually protects it.
 *
 * The full number is served only by POST /api/listings/[id]/contact, to a
 * signed-in member, and that request is recorded.
 */
export interface SellerContact {
  hasPhone: boolean
  maskedPhone: string | null
  /** Which of call and text the seller actually answers. */
  phoneReach: PhoneReach
  hasFacebook: boolean
  hasViber: boolean
}

/**
 * The channels a buyer can actually reach this seller on.
 *
 * Read from the seller's profile, not from the listing. A listing still
 * snapshots the channels it was posted with, and that snapshot used to decide
 * this — which was wrong in both directions once the per-listing toggle went
 * away and channels became a fact about the person rather than about the bench
 * they are selling:
 *
 *   - a channel removed from the profile kept being offered, and the API then
 *     answered "the seller has not set up that channel" — a dead end presented
 *     as an option;
 *   - a channel ADDED to the profile afterwards never appeared, because it was
 *     not in the snapshot. A seller whose old listings predate their phone
 *     number had to edit and re-save every one of them to become reachable,
 *     with nothing on screen saying so. That is the trap that matters now that
 *     posting requires a number: listings posted before the rule would
 *     otherwise stay unanswerable for good.
 *
 * MESSENGER, TrustClub and Facebook are absent on purpose. A TrustClub profile
 * is an identity, not an inbox, and a Facebook page is a detour that leaves a
 * buyer no way to say "I want this". Messenger went the same way: it needs a
 * username or profile id the seller has to go and find in another app, and the
 * ones who could not find it either typed their display name — which m.me
 * accepts and then opens on nobody — or gave up on posting. A phone number is
 * something everyone here knows by heart. Listings posted while those channels
 * were on the menu carry them in their snapshot; ignoring the snapshot is what
 * retires them, which is why removing them needed no migration.
 */
export function usableChannels(contact: SellerContact): string[] {
  const channels: string[] = []
  // A number does not mean both: a seller behind a counter may take only
  // texts, a driver only calls. Offering the one they never answer reads as
  // being ignored, so they choose (see Account.phoneReach).
  if (contact.hasPhone) {
    if (contact.phoneReach !== 'SMS_ONLY') channels.push('PHONE')
    if (contact.phoneReach !== 'CALL_ONLY') channels.push('SMS')
  }
  if (contact.hasViber) channels.push('VIBER')
  return channels
}

export async function getSellerContact(accountId: string): Promise<SellerContact> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { phone: true, phoneReach: true, facebookUrl: true, viberNumber: true },
  })
  if (!account) {
    return { hasPhone: false, maskedPhone: null, phoneReach: 'BOTH', hasFacebook: false, hasViber: false }
  }
  return {
    hasPhone: !!account.phone,
    maskedPhone: account.phone ? maskPhone(account.phone) : null,
    phoneReach: account.phoneReach,
    hasFacebook: !!account.facebookUrl,
    hasViber: !!account.viberNumber,
  }
}
