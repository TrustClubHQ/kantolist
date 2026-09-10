import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createToken, setAuthCookie, isDevLoginEnabled, upsertAccount } from '@/lib/auth'
import { isAllowedMutatingRequest } from '@/lib/http'
import { withApiHandler, badRequest, forbidden } from '@/lib/api'

/**
 * Sign in as a seeded account without TrustClub. Gated on BOTH a non-production
 * NODE_ENV and an explicit ALLOW_DEV_LOGIN, so it cannot be switched on by a
 * single stray environment variable in a deployed environment.
 */
export const POST = withApiHandler(async (request: NextRequest) => {
  if (!isDevLoginEnabled()) return forbidden('dev login is disabled')
  if (!isAllowedMutatingRequest(request)) return forbidden()

  const body: { trustclubId?: string } = await request.json().catch(() => ({}))
  const trustclubId = body.trustclubId?.trim()
  if (!trustclubId) return badRequest('trustclubId is required')

  const account = await upsertAccount(trustclubId)
  const res = NextResponse.json({ ok: true, trustclubId: account.trustclubId })
  setAuthCookie(res, createToken(account.id, account.trustclubId))
  return res
})

export const GET = withApiHandler(async () => {
  if (!isDevLoginEnabled()) return forbidden('dev login is disabled')
  const accounts = await prisma.account.findMany({
    select: { trustclubId: true, displayName: true, isStaff: true },
    orderBy: { createdAt: 'asc' },
    take: 20,
  })
  return NextResponse.json({ accounts })
})
