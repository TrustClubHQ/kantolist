import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requestT } from '@/lib/i18n-server'
import { getAccountFromRequest } from '@/lib/auth'
import { withApiHandler, notFound, forbidden, unauthorized } from '@/lib/api'
import { isAllowedMutatingRequest } from '@/lib/http'

type Ctx = { params: Promise<{ id: string }> }

/**
 * Save and unsave.
 *
 * The table has been in the schema since the first migration with nothing
 * writing to it. A buyer browsing on a phone between other things needs
 * somewhere to put the three listings they are deciding between, or the
 * decision happens somewhere else.
 */
export const POST = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  if (!isAllowedMutatingRequest(request)) return forbidden()
  const { id } = await ctx.params
  const t = requestT(request)
  const account = await getAccountFromRequest(request)
  if (!account) return unauthorized(t('api.signInToSave'))

  const listing = await prisma.listing.findUnique({ where: { id }, select: { id: true } })
  if (!listing) return notFound(t('api.listingNotFound'))

  // Saving twice is the same as saving once — a double tap on a slow
  // connection must not be an error.
  await prisma.savedListing.upsert({
    where: { accountId_listingId: { accountId: account.id, listingId: listing.id } },
    update: {},
    create: { accountId: account.id, listingId: listing.id },
  })
  return NextResponse.json({ saved: true })
})

export const DELETE = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  if (!isAllowedMutatingRequest(request)) return forbidden()
  const { id } = await ctx.params
  const account = await getAccountFromRequest(request)
  if (!account) return unauthorized()

  await prisma.savedListing.deleteMany({ where: { accountId: account.id, listingId: id } })
  return NextResponse.json({ saved: false })
})
