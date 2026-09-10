import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccountFromRequest } from '@/lib/auth'
import { withApiHandler, unauthorized } from '@/lib/api'
import { listingPath } from '@/lib/listing'

/** The poster's own listings, with the contact-tap count they care about. */
export const GET = withApiHandler(async (request: NextRequest) => {
  const account = await getAccountFromRequest(request)
  if (!account) return unauthorized()

  const listings = await prisma.listing.findMany({
    where: { accountId: account.id },
    orderBy: [{ status: 'asc' }, { postedAt: 'desc' }],
    include: {
      images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
      _count: { select: { contacts: true } },
    },
  })

  return NextResponse.json({
    listings: listings.map((l) => ({
      id: l.id,
      code: l.code,
      href: listingPath(l.code, l.slug),
      title: l.title,
      type: l.type,
      status: l.status,
      price: l.price === null ? null : Number(l.price),
      priceUnit: l.priceUnit,
      image: l.images[0]?.url ?? null,
      postedAt: l.postedAt,
      expiresAt: l.expiresAt,
      bumpedAt: l.bumpedAt,
      viewCount: l.viewCount,
      contactCount: l._count.contacts,
    })),
  })
})
