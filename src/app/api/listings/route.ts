import { NextRequest, NextResponse } from 'next/server'
import type { ListingType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requestT } from '@/lib/i18n-server'
import { getAccountFromRequest } from '@/lib/auth'
import { withApiHandler, badRequest, unauthorized, forbidden } from '@/lib/api'
import { isAllowedMutatingRequest } from '@/lib/http'
import { searchListings, type SortKey } from '@/lib/search'
import { parseSchema, validateAttributes } from '@/lib/attributes'
import {
  slugify, listingPath, parseVideoUrl, PRICE_UNITS_FOR_TYPE, MAX_NEW_LISTINGS_PER_DAY,
} from '@/lib/listing'
import { generateCode } from '@/lib/code'

// 'nearest' is not here: it was accepted and then sorted by postedAt like
// 'newest', so it promised an ordering it never produced.
const SORTS: SortKey[] = ['trust', 'newest', 'price_asc', 'price_desc']
const TYPES: ListingType[] = ['SELL', 'RENT', 'SERVICE']
const MAX_TITLE = 70
const MAX_DESCRIPTION = 4000

function numberParam(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key)
  if (!raw) return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

export const GET = withApiHandler(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams
  const account = await getAccountFromRequest(request)

  const sortRaw = params.get('sort') as SortKey | null
  const typeRaw = params.get('type') as ListingType | null

  const result = await searchListings(
    {
      q: params.get('q') ?? undefined,
      categorySlug: params.get('category') ?? undefined,
      type: typeRaw && TYPES.includes(typeRaw) ? typeRaw : undefined,
      municipalityId: params.get('municipality') ?? undefined,
      includeNearby: params.get('nearby') === 'true',
      minPrice: numberParam(params, 'min'),
      maxPrice: numberParam(params, 'max'),
      sort: sortRaw && SORTS.includes(sortRaw) ? sortRaw : undefined,
      page: numberParam(params, 'page'),
      attributes: params,
    },
    account?.trustclubId ?? null,
  )

  return NextResponse.json({
    items: result.items.map(({ listing, trustPoints }) => ({
      code: listing.code,
      href: listingPath(listing.code, listing.slug),
      title: listing.title,
      type: listing.type,
      status: listing.status,
      price: listing.price === null ? null : Number(listing.price),
      priceUnit: listing.priceUnit,
      negotiable: listing.negotiable,
      image: listing.images[0]?.url ?? null,
      municipality: listing.municipality.name,
      // Both needed by the card's no-photo mark, which the live grid renders
      // client-side from exactly this payload.
      categorySlug: listing.category.slug,
      parentSlug: listing.category.parent?.slug ?? null,
      postedAt: listing.postedAt,
      seller: { trustclubId: listing.account.trustclubId, displayName: listing.account.displayName },
      // Self-trust is Infinity internally, which JSON.stringify writes as null —
      // indistinguishable from a failed lookup. Send the relationship as a flag
      // and keep trustPoints to real, finite values.
      isOwn: listing.account.trustclubId === account?.trustclubId,
      trustPoints: trustPoints !== null && Number.isFinite(trustPoints) ? trustPoints : null,
    })),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    trustRanked: result.trustRanked,
    signedIn: !!account,
  })
})

interface CreateBody {
  categoryId?: string
  type?: ListingType
  title?: string
  description?: string
  price?: number | null
  priceUnit?: string
  negotiable?: boolean
  attributes?: unknown
  municipalityId?: string
  barangay?: string
  meetupNote?: string
  contactChannels?: string[]
  serviceAreaIds?: string[]
  videoUrl?: string
}

export const POST = withApiHandler(async (request: NextRequest) => {
  if (!isAllowedMutatingRequest(request)) return forbidden()
  const t = requestT(request)
  const account = await getAccountFromRequest(request)
  if (!account) return unauthorized(t('api.signInToPost'))

  const body: CreateBody = await request.json().catch(() => ({}))

  const title = body.title?.trim()
  if (!title) return badRequest(t('api.titleRequired'))
  if (title.length > MAX_TITLE) return badRequest(t('api.titleTooLong', { max: MAX_TITLE }))

  if (!body.type || !TYPES.includes(body.type)) return badRequest(t('api.pickType'))
  const type = body.type

  if (!body.categoryId) return badRequest(t('api.pickCategory'))
  const category = await prisma.category.findUnique({
    where: { id: body.categoryId },
    select: { id: true, attributeSchema: true, children: { select: { id: true } }, isActive: true },
  })
  if (!category || !category.isActive) return badRequest(t('api.categoryUnavailable'))
  // A listing belongs to a leaf: a parent is a heading, not a place to file things.
  if (category.children.length > 0) return badRequest(t('api.pickSubCategory'))

  if (!body.municipalityId) return badRequest(t('api.pickLocation'))
  const municipality = await prisma.municipality.findUnique({ where: { id: body.municipalityId } })
  if (!municipality) return badRequest(t('api.locationUnavailable'))

  const allowedUnits = PRICE_UNITS_FOR_TYPE[type]
  const priceUnit = (body.priceUnit ?? allowedUnits[0]) as (typeof allowedUnits)[number]
  if (!allowedUnits.includes(priceUnit)) {
    return badRequest(t('api.badPriceUnit', { type: type.toLowerCase(), unit: priceUnit }))
  }

  const price = body.price === null || body.price === undefined ? null : Number(body.price)
  if (priceUnit === 'QUOTE') {
    // "Ask for a quote" means no number; storing one would contradict the label.
    if (price !== null) return badRequest(t('api.quoteHasNoPrice'))
  } else {
    if (price === null || !Number.isFinite(price) || price < 0) return badRequest(t('api.enterPrice'))
    if (price > 100_000_000) return badRequest(t('api.priceTooHigh'))
  }

  const validated = validateAttributes(parseSchema(category.attributeSchema), body.attributes)
  if (!validated.ok) return badRequest(validated.error)

  const video = parseVideoUrl(body.videoUrl)
  if ('error' in video) return badRequest(video.error)

  const description = (body.description ?? '').trim().slice(0, MAX_DESCRIPTION)

  // One cap, on the rate rather than the total. The ceilings on active
  // listings are gone — one of them was gated on a verified phone number,
  // which nothing here can produce, so members stopped at three and were told
  // to verify a number forever. How many things someone has for sale is their
  // business. How fast they can fill the board in one go is ours, because
  // trust ranking changes the order listings appear in, not whether they
  // exist, and a signed-out visitor sees newest regardless.
  //
  // Checked here rather than in the form, so a direct API call is bound by it
  // too.
  const todayCount = await prisma.listing.count({
    where: { accountId: account.id, createdAt: { gt: new Date(Date.now() - 86400_000) } },
  })
  if (todayCount >= MAX_NEW_LISTINGS_PER_DAY) {
    return forbidden(t('api.tooManyToday', { count: MAX_NEW_LISTINGS_PER_DAY }))
  }

  // A listing nobody can answer is worse than no listing, and a phone number
  // is the floor. A TrustClub profile is an identity rather than an inbox, a
  // Facebook page is a detour, and Messenger asked people for a username they
  // had to go and find in another app. Viber is a real channel and still
  // shown, but it cannot be the only one — a buyer without the app would have
  // nothing to tap.
  if (!account.phone) {
    return forbidden(t('api.contactRequired'))
  }

  // Snapshot the channels the poster actually has, so an old listing never
  // advertises a channel they removed from their profile later.
  const available: string[] = []
  if (account.phone) {
    // Only the ones they answer — see Account.phoneReach.
    if (account.phoneReach !== 'SMS_ONLY') available.push('PHONE')
    if (account.phoneReach !== 'CALL_ONLY') available.push('SMS')
  }
  if (account.viberNumber) available.push('VIBER')
  const requested = Array.isArray(body.contactChannels) ? body.contactChannels : available
  const channels = available.filter((c) => requested.includes(c))

  const listing = await prisma.listing.create({
    data: {
      code: generateCode(),
      accountId: account.id,
      categoryId: category.id,
      type,
      title,
      slug: slugify(title),
      description,
      price,
      priceUnit,
      negotiable: !!body.negotiable,
      attributes: validated.values as unknown as Prisma.InputJsonValue,
      municipalityId: municipality.id,
      barangay: body.barangay?.trim() || null,
      meetupNote: body.meetupNote?.trim() || null,
      contactChannels: channels as unknown as Prisma.InputJsonValue,
      videoUrl: video.url,
      status: 'ACTIVE',
      serviceAreas:
        type === 'SELL' || !body.serviceAreaIds?.length
          ? undefined
          : { create: body.serviceAreaIds.map((municipalityId) => ({ municipalityId })) },
    },
  })

  return NextResponse.json(
    { id: listing.id, code: listing.code, href: listingPath(listing.code, listing.slug) },
    { status: 201 },
  )
})
