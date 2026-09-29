import { NextRequest, NextResponse } from 'next/server'
import type { ListingStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requestT } from '@/lib/i18n-server'
import { getAccountFromRequest } from '@/lib/auth'
import { withApiHandler, badRequest, unauthorized, forbidden, notFound } from '@/lib/api'
import { isAllowedMutatingRequest } from '@/lib/http'
import { BUMP_COOLDOWN_DAYS } from '@/lib/listing'

type Ctx = { params: Promise<{ id: string }> }

/** What an owner may set, and from where. REMOVED is staff-only and absent here. */
const OWNER_TRANSITIONS: Record<string, ListingStatus[]> = {
  ACTIVE: ['RESERVED', 'CLOSED'],
  RESERVED: ['ACTIVE', 'CLOSED'],
  CLOSED: ['ACTIVE'],
  EXPIRED: ['ACTIVE'],
}

export const POST = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  if (!isAllowedMutatingRequest(request)) return forbidden()
  const { id } = await ctx.params
  const t = requestT(request)
  const account = await getAccountFromRequest(request)
  if (!account) return unauthorized()

  const listing = await prisma.listing.findUnique({ where: { id } })
  if (!listing) return notFound(t('api.listingNotFound'))
  if (listing.accountId !== account.id) return forbidden(t('api.notYourListing'))

  const body: { status?: ListingStatus; bump?: boolean } = await request.json().catch(() => ({}))

  if (body.bump) {
    const last = listing.bumpedAt ?? listing.postedAt
    const nextAllowed = last.getTime() + BUMP_COOLDOWN_DAYS * 86400_000
    if (Date.now() < nextAllowed) {
      return badRequest(
        t('api.bumpTooSoon', { days: Math.ceil((nextAllowed - Date.now()) / 86400_000) }),
      )
    }
    const bumped = await prisma.listing.update({
      where: { id: listing.id },
      data: { postedAt: new Date(), bumpedAt: new Date() },
    })
    return NextResponse.json({ status: bumped.status, postedAt: bumped.postedAt })
  }

  const next = body.status
  if (!next) return badRequest(t('api.noChange'))
  const allowed = OWNER_TRANSITIONS[listing.status] ?? []
  if (!allowed.includes(next)) {
    return badRequest(
      t('api.badTransition', { from: listing.status.toLowerCase(), to: next.toLowerCase() }),
    )
  }

  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data: {
      status: next,
      closedAt: next === 'CLOSED' ? new Date() : null,
      // Re-opening a closed or expired listing restarts its clock; otherwise it
      // would come back already expired.
      ...(next === 'ACTIVE' && listing.status !== 'RESERVED'
        ? { postedAt: new Date() }
        : {}),
    },
  })
  return NextResponse.json({ status: updated.status })
})
