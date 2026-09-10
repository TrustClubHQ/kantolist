import { NextRequest, NextResponse } from 'next/server'
import type { ContactChannel } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAccountFromRequest } from '@/lib/auth'
import { withApiHandler, badRequest, notFound, forbidden } from '@/lib/api'
import { isAllowedMutatingRequest } from '@/lib/http'

type Ctx = { params: Promise<{ id: string }> }

const CHANNELS: ContactChannel[] = ['PHONE', 'SMS', 'MESSENGER', 'FACEBOOK', 'VIBER', 'TRUSTCLUB']

/**
 * Records that someone tapped a contact channel, and returns the link to open.
 *
 * Only the fact is stored — never message content, since the conversation
 * happens off-platform by design. The poster sees a count; staff can spot a
 * listing that collects taps and complaints.
 *
 * A phone number is only returned in full to a signed-in member; anonymous
 * viewers get the masked form from the page and a prompt to sign in, which
 * keeps a scraper from harvesting numbers by walking every listing.
 */
export const POST = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  if (!isAllowedMutatingRequest(request)) return forbidden()
  const { id } = await ctx.params

  const body: { channel?: ContactChannel } = await request.json().catch(() => ({}))
  const channel = body.channel
  if (!channel || !CHANNELS.includes(channel)) return badRequest('Unknown contact channel')

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: { account: { select: { trustclubId: true, phone: true, messengerHandle: true, facebookUrl: true, viberNumber: true } } },
  })
  if (!listing) return notFound('Listing not found')
  if (listing.status === 'REMOVED') return notFound('Listing not found')

  const viewer = await getAccountFromRequest(request)
  const needsAuth = channel === 'PHONE' || channel === 'SMS'
  if (needsAuth && !viewer) {
    return NextResponse.json({ error: 'Sign in to see the phone number', signInRequired: true }, { status: 401 })
  }

  await prisma.contactEvent.create({
    data: { listingId: listing.id, channel, viewerAccountId: viewer?.id ?? null },
  })

  const seller = listing.account
  const target = (() => {
    switch (channel) {
      case 'PHONE':
        return seller.phone ? `tel:${seller.phone}` : null
      case 'SMS':
        return seller.phone
          ? `sms:${seller.phone}?body=${encodeURIComponent(`Hi, I saw your "${listing.title}" on KantoList (#${listing.code}).`)}`
          : null
      case 'MESSENGER':
        return seller.messengerHandle ? `https://m.me/${seller.messengerHandle}` : null
      case 'FACEBOOK':
        return seller.facebookUrl
      case 'VIBER':
        return seller.viberNumber ? `viber://chat?number=${encodeURIComponent(seller.viberNumber)}` : null
      case 'TRUSTCLUB':
        return `https://trustclub.app/profile/${encodeURIComponent(seller.trustclubId)}`
    }
  })()

  if (!target) return badRequest('The seller has not set up that channel')
  return NextResponse.json({ target })
})
