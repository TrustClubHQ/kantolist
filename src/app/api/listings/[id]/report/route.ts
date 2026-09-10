import { NextRequest, NextResponse } from 'next/server'
import type { ReportReason } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAccountFromRequest } from '@/lib/auth'
import { withApiHandler, badRequest, notFound, forbidden, unauthorized } from '@/lib/api'
import { isAllowedMutatingRequest } from '@/lib/http'

type Ctx = { params: Promise<{ id: string }> }

const REASONS: ReportReason[] = ['SCAM', 'PROHIBITED', 'DUPLICATE', 'WRONG_CATEGORY', 'SOLD_ALREADY', 'OTHER']

export const POST = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  if (!isAllowedMutatingRequest(request)) return forbidden()
  const { id } = await ctx.params

  // Reporting requires an account: an anonymous report queue is a spam queue.
  const account = await getAccountFromRequest(request)
  if (!account) return unauthorized('Sign in to report a listing')

  const body: { reason?: ReportReason; note?: string } = await request.json().catch(() => ({}))
  if (!body.reason || !REASONS.includes(body.reason)) return badRequest('Pick a reason')

  const listing = await prisma.listing.findUnique({ where: { id }, select: { id: true } })
  if (!listing) return notFound('Listing not found')

  const existing = await prisma.report.findFirst({
    where: { listingId: listing.id, reporterAccountId: account.id, status: 'OPEN' },
    select: { id: true },
  })
  // Silently succeed on a repeat: telling someone their report already exists
  // invites them to file it under a different reason instead.
  if (existing) return NextResponse.json({ ok: true })

  await prisma.report.create({
    data: {
      listingId: listing.id,
      reporterAccountId: account.id,
      reason: body.reason,
      note: body.note?.trim().slice(0, 500) || null,
    },
  })
  return NextResponse.json({ ok: true })
})
