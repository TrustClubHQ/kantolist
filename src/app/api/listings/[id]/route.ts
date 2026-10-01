import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requestT } from '@/lib/i18n-server'
import { getAccountFromRequest } from '@/lib/auth'
import { withApiHandler, badRequest, unauthorized, forbidden, notFound } from '@/lib/api'
import { isAllowedMutatingRequest } from '@/lib/http'
import { parseSchema, validateAttributes } from '@/lib/attributes'
import type { Account, ListingType, PriceUnit } from '@prisma/client'
import { slugify, parseVideoUrl, PRICE_UNITS_FOR_TYPE } from '@/lib/listing'
import { forgetPhoto } from '@/lib/photo-store'

const TYPES: ListingType[] = ['SELL', 'RENT', 'SERVICE']

type Ctx = { params: Promise<{ id: string }> }

type OwnedListing = Awaited<ReturnType<typeof findListing>>
type LoadResult =
  | { error: NextResponse }
  // The account comes back too: an edit has to be checked against what its
  // owner can actually be reached on, not only against the listing.
  | { error?: undefined; listing: NonNullable<OwnedListing>; account: Account }

function findListing(id: string) {
  return prisma.listing.findUnique({
    where: { id },
    include: { category: { select: { attributeSchema: true } } },
  })
}

/** Edits are owner-only; staff moderate through the report queue, not by editing. */
async function loadOwned(request: NextRequest, id: string): Promise<LoadResult> {
  const t = requestT(request)
  const account = await getAccountFromRequest(request)
  if (!account) return { error: unauthorized() }
  const listing = await findListing(id)
  if (!listing) return { error: notFound(t('api.listingNotFound')) }
  if (listing.accountId !== account.id) return { error: forbidden(t('api.notYourListing')) }
  return { listing, account }
}

export const PATCH = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  if (!isAllowedMutatingRequest(request)) return forbidden()
  const { id } = await ctx.params
  const t = requestT(request)
  const owned = await loadOwned(request, id)
  if (owned.error) return owned.error
  const { listing, account } = owned

  const body: {
    title?: string
    description?: string
    price?: number | null
    priceUnit?: string
    type?: string
    categoryId?: string
    negotiable?: boolean
    attributes?: unknown
    barangay?: string
    meetupNote?: string
    videoUrl?: string
    contactChannels?: unknown
  } = await request.json().catch(() => ({}))

  const data: Prisma.ListingUpdateInput = {}

  // Category and type can change — someone lists a bike under Motorcycle and
  // fixes it. The attribute schema changes with the category, so the values
  // are validated against the NEW one below, not the one they were entered
  // under. Without this the listing keeps attributes its category cannot
  // describe and the detail table renders nothing.
  let schemaSource = listing.category.attributeSchema
  if (body.categoryId !== undefined && body.categoryId !== listing.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: body.categoryId },
      select: { id: true, attributeSchema: true, isActive: true, parentId: true },
    })
    if (!category || !category.isActive) return badRequest(t('api.chooseCategory'))
    if (!category.parentId) return badRequest(t('api.chooseLeafCategory'))
    data.category = { connect: { id: category.id } }
    schemaSource = category.attributeSchema
  }

  if (body.type !== undefined) {
    if (!TYPES.includes(body.type as ListingType)) return badRequest(t('api.chooseType'))
    data.type = body.type as ListingType
  }

  if (body.priceUnit !== undefined) {
    const nextType = (body.type ?? listing.type) as ListingType
    if (!PRICE_UNITS_FOR_TYPE[nextType].includes(body.priceUnit as PriceUnit)) {
      return badRequest(t('api.unitNotForType'))
    }
    data.priceUnit = body.priceUnit as PriceUnit
  }

  if (body.contactChannels !== undefined) {
    if (!Array.isArray(body.contactChannels)) return badRequest(t('api.badChannels'))
    // Same floor as posting, and the same snapshot rule: an edit cannot put a
    // channel on a listing that the account has nothing behind. Without this,
    // the edit screen was a way around the posting requirement.
    if (!account.phone && !account.messengerHandle) {
      return badRequest(t('api.contactRequired'))
    }
    const available = new Set<string>()
    if (account.phone) { available.add('PHONE'); available.add('SMS') }
    if (account.messengerHandle) available.add('MESSENGER')
    if (account.viberNumber) available.add('VIBER')
    const channels = body.contactChannels
      .filter((c): c is string => typeof c === 'string')
      .filter((c) => available.has(c))
    data.contactChannels = channels as unknown as Prisma.InputJsonValue
  }

  if (body.title !== undefined) {
    const title = body.title.trim()
    if (!title) return badRequest(t('api.titleRequired'))
    if (title.length > 70) return badRequest(t('api.titleTooLong', { max: 70 }))
    data.title = title
    data.slug = slugify(title)
  }

  if (body.description !== undefined) data.description = body.description.trim().slice(0, 4000)
  if (body.negotiable !== undefined) data.negotiable = !!body.negotiable
  if (body.barangay !== undefined) data.barangay = body.barangay.trim() || null
  if (body.meetupNote !== undefined) data.meetupNote = body.meetupNote.trim() || null

  if (body.videoUrl !== undefined) {
    const video = parseVideoUrl(body.videoUrl)
    if ('error' in video) return badRequest(video.error)
    data.videoUrl = video.url
  }

  if (body.price !== undefined) {
    const unit = body.priceUnit ?? listing.priceUnit
    if (unit === 'QUOTE') {
      // Switching to "ask for a quote" clears the old figure rather than
      // refusing the edit — the form sends null in that case.
      data.price = null
    } else {
      const price = body.price === null ? null : Number(body.price)
      if (price === null || !Number.isFinite(price) || price < 0) return badRequest(t('api.enterPrice'))
      data.price = price
    }
  }

  if (body.attributes !== undefined) {
    const validated = validateAttributes(parseSchema(schemaSource), body.attributes)
    if (!validated.ok) return badRequest(validated.error)
    data.attributes = validated.values as unknown as Prisma.InputJsonValue
  }

  const updated = await prisma.listing.update({ where: { id: listing.id }, data })
  return NextResponse.json({ code: updated.code, slug: updated.slug })
})

/**
 * Delete, as the privacy page promises it: the listing and everything hanging
 * off it. The rows cascade; the stored photos do not, so they are forgotten
 * here or they stay in the blob store forever with nothing pointing at them.
 */
export const DELETE = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  if (!isAllowedMutatingRequest(request)) return forbidden()
  const { id } = await ctx.params
  const owned = await loadOwned(request, id)
  if (owned.error) return owned.error

  const images = await prisma.listingImage.findMany({
    where: { listingId: owned.listing.id },
    select: { url: true },
  })
  await prisma.listing.delete({ where: { id: owned.listing.id } })
  // After the row is gone: a failed delete in the blob store must not leave a
  // listing the owner has already been told is deleted.
  await Promise.all(images.map((image) => forgetPhoto(image.url)))
  return NextResponse.json({ ok: true })
})
