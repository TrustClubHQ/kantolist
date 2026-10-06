import { NextRequest, NextResponse } from 'next/server'
import type { ContactChannel } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requestT } from '@/lib/i18n-server'
import { getAccountFromRequest } from '@/lib/auth'
import { withApiHandler, badRequest, notFound, forbidden, unauthorized } from '@/lib/api'
import { isAllowedMutatingRequest } from '@/lib/http'

type Ctx = { params: Promise<{ id: string }> }

// FACEBOOK and TRUSTCLUB are not reachable channels (see usableChannels), so
// they are not resolvable here either — a hand-made request for one is refused
// rather than quietly handed a profile link.
const CHANNELS: ContactChannel[] = ['PHONE', 'SMS', 'MESSENGER', 'VIBER']

/**
 * Channels whose link contains the seller's phone number.
 *
 * VIBER belongs here and used to be missing, so an anonymous visitor could tap
 * Viber and be handed `viber://chat?number=+639…` — the very harvesting this
 * route's phone rule exists to stop, through a door next to it. Messenger is
 * not on the list: an m.me handle is a public profile name, not a number.
 */
const NEEDS_SIGN_IN: ContactChannel[] = ['PHONE', 'SMS', 'VIBER']

interface Seller {
  phone: string | null
  messengerHandle: string | null
  viberNumber: string | null
}

function targetFor(channel: ContactChannel, seller: Seller, title: string, code: string): string | null {
  switch (channel) {
    case 'PHONE':
      return seller.phone ? `tel:${seller.phone}` : null
    case 'SMS':
      return seller.phone
        ? `sms:${seller.phone}?body=${encodeURIComponent(`Hi, I saw your "${title}" on KantoList (#${code}).`)}`
        : null
    case 'MESSENGER':
      // The handle is normalised on the way in (see PATCH /api/me), so this is
      // a bare username and needs no escaping beyond the encode.
      return seller.messengerHandle ? `https://m.me/${encodeURIComponent(seller.messengerHandle)}` : null
    case 'VIBER':
      return seller.viberNumber ? `viber://chat?number=${encodeURIComponent(seller.viberNumber)}` : null
    default:
      return null
  }
}

async function loadListing(id: string) {
  return prisma.listing.findUnique({
    where: { id },
    include: {
      account: { select: { trustclubId: true, phone: true, messengerHandle: true, viberNumber: true } },
    },
  })
}

/**
 * The links for every channel this viewer may use, resolved in one call.
 *
 * Resolved when the contact sheet opens rather than when a row is tapped, so
 * the rows can be real anchors. They could not be before: the sheet asked the
 * server on tap and then assigned window.location once the answer came back,
 * which is a navigation outside the user gesture that opened it. Browsers will
 * not hand those to another app. Firefox on Android offered to open Messenger
 * and then returned to the page; iOS declined the universal link, followed
 * m.me as an ordinary URL and landed the member on Messenger's App Store page.
 * A plain <a href> tapped by a finger has none of that trouble.
 *
 * Reading is not contacting, so nothing is recorded here — POST does that when
 * a row is actually tapped.
 */
export const GET = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params
  const t = requestT(request)

  const listing = await loadListing(id)
  if (!listing || listing.status === 'REMOVED') return notFound(t('api.listingNotFound'))

  const viewer = await getAccountFromRequest(request)
  const targets: Partial<Record<ContactChannel, string>> = {}
  for (const channel of CHANNELS) {
    if (NEEDS_SIGN_IN.includes(channel) && !viewer) continue
    const target = targetFor(channel, listing.account, listing.title, listing.code)
    if (target) targets[channel] = target
  }

  return NextResponse.json({ targets, signedIn: !!viewer })
})

/**
 * Records that someone tapped a contact channel.
 *
 * Only the fact is stored — never message content, since the conversation
 * happens off-platform by design. The poster sees a count; staff can spot a
 * listing that collects taps and complaints.
 *
 * Sent with sendBeacon as the member leaves for the other app, so it must not
 * be something they wait on: it answers `ok` and nothing reads the body.
 */
export const POST = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  if (!isAllowedMutatingRequest(request)) return forbidden()
  const { id } = await ctx.params
  const t = requestT(request)

  const body: { channel?: ContactChannel } = await request.json().catch(() => ({}))
  const channel = body.channel
  if (!channel || !CHANNELS.includes(channel)) return badRequest(t('api.unknownChannel'))

  const viewer = await getAccountFromRequest(request)
  if (NEEDS_SIGN_IN.includes(channel) && !viewer) return unauthorized(t('api.signInForNumber'))

  const listing = await loadListing(id)
  if (!listing || listing.status === 'REMOVED') return notFound(t('api.listingNotFound'))

  await prisma.contactEvent.create({
    data: { listingId: listing.id, channel, viewerAccountId: viewer?.id ?? null },
  })
  return NextResponse.json({ ok: true })
})
