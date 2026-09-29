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
  slugify, listingPath, parseVideoUrl,
  PRICE_UNITS_FOR_TYPE, MAX_ACTIVE_LISTINGS, MAX_ACTIVE_LISTINGS_UNTRUSTED, MAX_NEW_LISTINGS_PER_DAY,
} from '@/lib/listing'
import { generateCode } from '@/lib/code'

const SORTS: SortKey[] = ['trust', 'newest', 'price_asc', 'price_desc', 'nearest']
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

  // Anti-abuse: a member nobody vouches for gets a smaller allowance, and
  // everyone has a daily cap. Both are checked here rather than in the UI, so
  // a direct API call is bound by the same limits.
  const [activeCount, todayCount] = await Promise.all([
    prisma.listing.count({ where: { accountId: account.id, status: { in: ['ACTIVE', 'RESERVED'] } } }),
    prisma.listing.count({
      where: { accountId: account.id, createdAt: { gt: new Date(Date.now() - 86400_000) } },
    }),
  ])
  if (todayCount >= MAX_NEW_LISTINGS_PER_DAY) {
    return forbidden(t('api.tooManyToday'))
  }
  if (activeCount >= MAX_ACTIVE_LISTINGS) {
    return forbidden(t('api.tooManyActive'))
  }
  if (activeCount >= MAX_ACTIVE_LISTINGS_UNTRUSTED && !account.phoneVerifiedAt) {
    // The spec wants this gated on "nobody vouches for this member", but trust
    // is DIRECTED: there is no way to ask TrustClub how much incoming trust an
    // id has, only how much a specific viewer extends to it. Until an aggregate
    // endpoint exists (spec §12 Q1), a verified phone is the cheapest real
    // signal we control, so it is what unlocks the larger allowance.
    return forbidden(t('api.verifyToPostMore', { count: MAX_ACTIVE_LISTINGS_UNTRUSTED }))
  }

  // Snapshot the channels the poster actually has, so an old listing never
  // advertises a channel they removed from their profile later.
  const available: string[] = ['TRUSTCLUB']
  if (account.phone) available.push('PHONE', 'SMS')
  if (account.messengerHandle) available.push('MESSENGER')
  if (account.facebookUrl) available.push('FACEBOOK')
  if (account.viberNumber) available.push('VIBER')
  const requested = Array.isArray(body.contactChannels) ? body.contactChannels : available
  const channels = available.filter((c) => requested.includes(c) || c === 'TRUSTCLUB')

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
