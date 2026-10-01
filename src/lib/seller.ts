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
  hasMessenger: boolean
  hasFacebook: boolean
  hasViber: boolean
}

/**
 * The channels a listing offers that the seller can actually be reached on.
 *
 * A listing stores the channels chosen when it was posted. If the seller later
 * clears their number or Messenger handle, that choice goes stale — the sheet
 * kept offering the channel and the API answered "the seller has not set up
 * that channel", which is a dead end presented as an option. Anything without
 * a destination is dropped before it is ever shown.
 */
export function usableChannels(chosen: string[], contact: SellerContact): string[] {
  const reachable: Record<string, boolean> = {
    PHONE: contact.hasPhone,
    SMS: contact.hasPhone,
    MESSENGER: contact.hasMessenger,
    VIBER: contact.hasViber,
    // FACEBOOK and TRUSTCLUB are deliberately absent, so neither resolves and
    // both drop out here. A TrustClub profile is an identity, not an inbox,
    // and a Facebook page is a detour that leaves no way to say "I want this".
    // Listings posted while those were on the menu still carry them in their
    // snapshot; this is where they stop being offered, which is why dropping
    // them needed no migration.
  }
  return chosen.filter((c) => reachable[c])
}

export async function getSellerContact(accountId: string): Promise<SellerContact> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { phone: true, messengerHandle: true, facebookUrl: true, viberNumber: true },
  })
  if (!account) {
    return { hasPhone: false, maskedPhone: null, hasMessenger: false, hasFacebook: false, hasViber: false }
  }
  return {
    hasPhone: !!account.phone,
    maskedPhone: account.phone ? maskPhone(account.phone) : null,
    hasMessenger: !!account.messengerHandle,
    hasFacebook: !!account.facebookUrl,
    hasViber: !!account.viberNumber,
  }
}
