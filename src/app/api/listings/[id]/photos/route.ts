import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccountFromRequest } from '@/lib/auth'
import { withApiHandler, badRequest, unauthorized, forbidden, notFound } from '@/lib/api'
import { isAllowedMutatingRequest } from '@/lib/http'
import { storePhoto, forgetPhoto, photosEnabled } from '@/lib/photo-store'

type Ctx = { params: Promise<{ id: string }> }

/** A listing page stays readable; this is about how many a seller can attach. */
const MAX_PHOTOS = 8

async function loadOwned(request: NextRequest, id: string) {
  const account = await getAccountFromRequest(request)
  if (!account) return { error: unauthorized() }
  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { id: true, code: true, accountId: true, _count: { select: { images: true } } },
  })
  if (!listing) return { error: notFound('Listing not found') }
  if (listing.accountId !== account.id) return { error: forbidden('This is not your listing') }
  return { listing }
}

export const POST = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  if (!isAllowedMutatingRequest(request)) return forbidden()
  if (!photosEnabled()) return badRequest('Photo storage is not set up on this deployment')

  const { id } = await ctx.params
  const owned = await loadOwned(request, id)
  if (owned.error) return owned.error
  const { listing } = owned

  const form = await request.formData().catch(() => null)
  const file = form?.get('photo')
  if (!(file instanceof File)) return badRequest('No photo was sent')

  if (listing._count.images >= MAX_PHOTOS) {
    return badRequest(`A listing can have up to ${MAX_PHOTOS} photos`)
  }

  const stored = await storePhoto(file, listing.code)
  if (!stored.ok) return badRequest(stored.error)

  const image = await prisma.listingImage.create({
    data: {
      listingId: listing.id,
      url: stored.url,
      bytes: stored.bytes,
      sortOrder: listing._count.images,
    },
    select: { id: true, url: true, sortOrder: true },
  })
  return NextResponse.json(image, { status: 201 })
})

export const DELETE = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  if (!isAllowedMutatingRequest(request)) return forbidden()
  const { id } = await ctx.params
  const owned = await loadOwned(request, id)
  if (owned.error) return owned.error

  const imageId = request.nextUrl.searchParams.get('imageId')
  if (!imageId) return badRequest('Which photo?')

  // Scoped to the listing, so an id from someone else's listing finds nothing.
  const image = await prisma.listingImage.findFirst({
    where: { id: imageId, listingId: owned.listing.id },
  })
  if (!image) return notFound('Photo not found')

  await prisma.listingImage.delete({ where: { id: image.id } })
  await forgetPhoto(image.url)
  return NextResponse.json({ ok: true })
})
