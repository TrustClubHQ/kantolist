import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requestT } from '@/lib/i18n-server'
import { getAccountFromRequest } from '@/lib/auth'
import { withApiHandler, badRequest, unauthorized, forbidden, notFound } from '@/lib/api'
import { isAllowedMutatingRequest } from '@/lib/http'
import { storePhoto, forgetPhoto, photosEnabled } from '@/lib/photo-store'

type Ctx = { params: Promise<{ id: string }> }

/** A listing page stays readable; this is about how many a seller can attach. */
const MAX_PHOTOS = 8

/**
 * Pixel dimensions, used only to size the listing page's photo stage. The
 * browser measures them; this clamps them, because a layout hint from a client
 * should not be able to claim a 90,000px-tall photo.
 */
function dimension(value: FormDataEntryValue | null | undefined): number | null {
  if (typeof value !== 'string') return null
  const n = Number(value)
  return Number.isInteger(n) && n > 0 && n <= 20000 ? n : null
}

async function loadOwned(request: NextRequest, id: string) {
  const t = requestT(request)
  const account = await getAccountFromRequest(request)
  if (!account) return { error: unauthorized() }
  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { id: true, code: true, accountId: true, _count: { select: { images: true } } },
  })
  if (!listing) return { error: notFound(t('api.listingNotFound')) }
  if (listing.accountId !== account.id) return { error: forbidden(t('api.notYourListing')) }
  return { listing }
}

export const POST = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  if (!isAllowedMutatingRequest(request)) return forbidden()
  const t = requestT(request)
  if (!photosEnabled()) return badRequest(t('api.photosDisabled'))

  const { id } = await ctx.params
  const owned = await loadOwned(request, id)
  if (owned.error) return owned.error
  const { listing } = owned

  const form = await request.formData().catch(() => null)
  const file = form?.get('photo')
  if (!(file instanceof File)) return badRequest(t('api.noPhotoSent'))

  if (listing._count.images >= MAX_PHOTOS) {
    return badRequest(t('api.tooManyPhotos', { max: MAX_PHOTOS }))
  }

  const stored = await storePhoto(file, listing.code)
  if (!stored.ok) return badRequest(stored.error)

  const image = await prisma.listingImage.create({
    data: {
      listingId: listing.id,
      url: stored.url,
      bytes: stored.bytes,
      width: dimension(form?.get('width')),
      height: dimension(form?.get('height')),
      sortOrder: listing._count.images,
    },
    select: { id: true, url: true, sortOrder: true },
  })
  return NextResponse.json(image, { status: 201 })
})

/**
 * Which photo is the cover.
 *
 * The first upload used to be the hero forever, and the only way to change it
 * was to delete everything and start again — on a connection where each photo
 * costs real money to send. Moving one to the front renumbers the rest rather
 * than leaving a gap, so the order stays meaningful.
 */
export const PATCH = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  if (!isAllowedMutatingRequest(request)) return forbidden()
  const { id } = await ctx.params
  const t = requestT(request)
  const owned = await loadOwned(request, id)
  if (owned.error) return owned.error

  const body: { imageId?: string } = await request.json().catch(() => ({}))
  if (!body.imageId) return badRequest(t('api.whichPhoto'))

  const images = await prisma.listingImage.findMany({
    where: { listingId: owned.listing.id },
    orderBy: { sortOrder: 'asc' },
    select: { id: true },
  })
  const chosen = images.find((image) => image.id === body.imageId)
  if (!chosen) return notFound(t('api.photoNotFound'))

  const order = [chosen.id, ...images.filter((image) => image.id !== chosen.id).map((i) => i.id)]
  await prisma.$transaction(
    order.map((imageId, index) =>
      prisma.listingImage.update({ where: { id: imageId }, data: { sortOrder: index } }),
    ),
  )
  return NextResponse.json({ order })
})

export const DELETE = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  if (!isAllowedMutatingRequest(request)) return forbidden()
  const { id } = await ctx.params
  const t = requestT(request)
  const owned = await loadOwned(request, id)
  if (owned.error) return owned.error

  const imageId = request.nextUrl.searchParams.get('imageId')
  if (!imageId) return badRequest(t('api.whichPhoto'))

  // Scoped to the listing, so an id from someone else's listing finds nothing.
  const image = await prisma.listingImage.findFirst({
    where: { id: imageId, listingId: owned.listing.id },
  })
  if (!image) return notFound(t('api.photoNotFound'))

  await prisma.listingImage.delete({ where: { id: image.id } })
  await forgetPhoto(image.url)
  return NextResponse.json({ ok: true })
})
