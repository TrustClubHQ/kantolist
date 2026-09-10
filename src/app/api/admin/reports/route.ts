import { NextRequest, NextResponse } from 'next/server'
import type { ReportStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAccountFromRequest } from '@/lib/auth'
import { withApiHandler, forbidden, unauthorized } from '@/lib/api'
import { listingPath } from '@/lib/listing'

export const GET = withApiHandler(async (request: NextRequest) => {
  const account = await getAccountFromRequest(request)
  if (!account) return unauthorized()
  if (!account.isStaff) return forbidden('Staff only')

  const statusRaw = request.nextUrl.searchParams.get('status') as ReportStatus | null
  const status: ReportStatus = statusRaw === 'ACTIONED' || statusRaw === 'DISMISSED' ? statusRaw : 'OPEN'

  const reports = await prisma.report.findMany({
    where: { status },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      listing: {
        select: {
          id: true, code: true, slug: true, title: true, status: true,
          account: { select: { trustclubId: true, displayName: true } },
        },
      },
      reporter: { select: { trustclubId: true } },
    },
  })

  return NextResponse.json({
    reports: reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      note: r.note,
      status: r.status,
      createdAt: r.createdAt,
      reporter: r.reporter?.trustclubId ?? null,
      listing: {
        id: r.listing.id,
        title: r.listing.title,
        status: r.listing.status,
        href: listingPath(r.listing.code, r.listing.slug),
        seller: r.listing.account.displayName ?? r.listing.account.trustclubId,
      },
    })),
  })
})
