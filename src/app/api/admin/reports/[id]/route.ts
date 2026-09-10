import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccountFromRequest } from '@/lib/auth'
import { withApiHandler, badRequest, forbidden, notFound, unauthorized } from '@/lib/api'
import { isAllowedMutatingRequest } from '@/lib/http'

type Ctx = { params: Promise<{ id: string }> }

/**
 * Resolve a report. "Remove" is the only way a listing reaches REMOVED — an
 * owner cannot set it, and it always carries the reason shown to the poster.
 */
export const POST = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  if (!isAllowedMutatingRequest(request)) return forbidden()
  const account = await getAccountFromRequest(request)
  if (!account) return unauthorized()
  if (!account.isStaff) return forbidden('Staff only')

  const { id } = await ctx.params
  const body: { action?: 'remove' | 'dismiss'; reason?: string } = await request.json().catch(() => ({}))
  if (body.action !== 'remove' && body.action !== 'dismiss') return badRequest('Pick an action')

  const report = await prisma.report.findUnique({ where: { id }, select: { id: true, listingId: true } })
  if (!report) return notFound('Report not found')

  await prisma.$transaction(async (tx) => {
    await tx.report.update({
      where: { id: report.id },
      data: {
        status: body.action === 'remove' ? 'ACTIONED' : 'DISMISSED',
        resolvedBy: account.trustclubId,
        resolvedAt: new Date(),
      },
    })
    if (body.action === 'remove') {
      await tx.listing.update({
        where: { id: report.listingId },
        data: { status: 'REMOVED', removedReason: body.reason?.trim().slice(0, 200) || 'Reported' },
      })
      // Any other open report on the same listing is answered by the removal.
      await tx.report.updateMany({
        where: { listingId: report.listingId, status: 'OPEN' },
        data: { status: 'ACTIONED', resolvedBy: account.trustclubId, resolvedAt: new Date() },
      })
    }
  })

  return NextResponse.json({ ok: true })
})
