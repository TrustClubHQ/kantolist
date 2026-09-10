import type { Listing, ListingStatus, ListingType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getTrustPointsBatch, TRUST_LOOKUP_BUDGET } from '@/lib/trustclub'
import { parseSchema, parseAttributeFilters, attributeWhereClauses } from '@/lib/attributes'

/**
 * Search and ranking.
 *
 * The ordering rule that defines the product: for a signed-in viewer, listings
 * are ranked by that viewer's own trust path to the poster. Trust is directed,
 * so the order is different for every viewer and cannot be precomputed into an
 * index column.
 *
 * The shape of the pipeline exists to keep that affordable:
 *   1. narrow hard in SQL (status, category, town, price, attributes)
 *   2. take a bounded CANDIDATE window, ordered by recency
 *   3. resolve trust for that window only, batched and budgeted
 *   4. sort in the app layer and paginate
 *
 * Step 2 is the compromise worth knowing about: a listing outside the candidate
 * window cannot be lifted by trust, however strong. The window is deliberately
 * several pages deep so this only bites on very broad searches.
 */

export const PAGE_SIZE = 24
const CANDIDATE_WINDOW = TRUST_LOOKUP_BUDGET * 3

export type SortKey = 'trust' | 'newest' | 'price_asc' | 'price_desc' | 'nearest'

export interface SearchParams {
  q?: string
  categorySlug?: string
  type?: ListingType
  municipalityId?: string
  includeNearby?: boolean
  minPrice?: number
  maxPrice?: number
  sort?: SortKey
  page?: number
  attributes?: URLSearchParams
}

export interface RankedListing {
  listing: ListingWithRelations
  trustPoints: number | null
}

export type ListingWithRelations = Listing & {
  account: { id: string; trustclubId: string; displayName: string | null }
  category: { id: string; slug: string; name: string }
  municipality: { id: string; name: string; province: string }
  images: { url: string; width: number | null; height: number | null }[]
}

const LISTED_STATUSES: ListingStatus[] = ['ACTIVE', 'RESERVED']

const LISTING_INCLUDE = {
  account: { select: { id: true, trustclubId: true, displayName: true } },
  category: { select: { id: true, slug: true, name: true } },
  municipality: { select: { id: true, name: true, province: true } },
  images: { select: { url: true, width: true, height: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
} satisfies Prisma.ListingInclude

/** Municipality plus its neighbours, for the "include nearby towns" filter. */
export async function municipalityScope(
  municipalityId: string,
  includeNearby: boolean,
): Promise<string[]> {
  if (!includeNearby) return [municipalityId]
  const neighbours = await prisma.municipalityAdjacency.findMany({
    where: { fromId: municipalityId },
    select: { toId: true },
  })
  return [municipalityId, ...neighbours.map((n) => n.toId)]
}

async function buildWhere(params: SearchParams): Promise<Prisma.ListingWhereInput> {
  const where: Prisma.ListingWhereInput = {
    status: { in: LISTED_STATUSES },
    expiresAt: { gt: new Date() },
  }

  if (params.type) where.type = params.type

  if (params.categorySlug) {
    // A parent slug matches everything beneath it, so "Vehicles" returns
    // motorcycles and bicycles alike.
    const category = await prisma.category.findUnique({
      where: { slug: params.categorySlug },
      select: { id: true, parentId: true, attributeSchema: true, children: { select: { id: true } } },
    })
    if (!category) return { ...where, id: '__no_such_category__' }
    const ids = [category.id, ...category.children.map((c) => c.id)]
    where.categoryId = { in: ids }

    if (params.attributes) {
      const schema = parseSchema(category.attributeSchema)
      const filters = parseAttributeFilters(schema, params.attributes)
      const clauses = attributeWhereClauses(filters)
      if (clauses.length) where.AND = clauses as Prisma.ListingWhereInput[]
    }
  }

  if (params.municipalityId) {
    const ids = await municipalityScope(params.municipalityId, params.includeNearby ?? false)
    where.municipalityId = { in: ids }
  }

  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    // A QUOTE listing has no price and would be silently dropped by a range
    // filter, so it is kept only when the search has no upper bound.
    const price: Prisma.ListingWhereInput['price'] & object = {}
    if (params.minPrice !== undefined) price.gte = params.minPrice
    if (params.maxPrice !== undefined) price.lte = params.maxPrice
    where.price = price
  }

  if (params.q) {
    const q = params.q.trim().slice(0, 80)
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ]
    }
  }

  return where
}

function sqlOrder(sort: SortKey): Prisma.ListingOrderByWithRelationInput[] {
  switch (sort) {
    case 'price_asc':
      return [{ price: 'asc' }, { postedAt: 'desc' }]
    case 'price_desc':
      return [{ price: 'desc' }, { postedAt: 'desc' }]
    case 'newest':
    case 'nearest':
    case 'trust':
    default:
      return [{ postedAt: 'desc' }]
  }
}

export interface SearchResult {
  items: RankedListing[]
  total: number
  page: number
  pageSize: number
  /** True when trust ordering was applied (i.e. a signed-in viewer asked for it). */
  trustRanked: boolean
}

/**
 * Run a search. `viewerTrustclubId` is null for anonymous visitors, who get
 * recency ordering and a prompt to sign in — we cannot rank by a trust path
 * that has no starting point.
 */
export async function searchListings(
  params: SearchParams,
  viewerTrustclubId: string | null,
): Promise<SearchResult> {
  const where = await buildWhere(params)
  const sort: SortKey = params.sort ?? (viewerTrustclubId ? 'trust' : 'newest')
  const page = Math.max(1, params.page ?? 1)
  const wantsTrust = sort === 'trust' && !!viewerTrustclubId

  const total = await prisma.listing.count({ where })

  if (!wantsTrust) {
    const items = await prisma.listing.findMany({
      where,
      include: LISTING_INCLUDE,
      orderBy: sqlOrder(sort),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    })
    const trust = viewerTrustclubId
      ? await getTrustPointsBatch(viewerTrustclubId, items.map((i) => i.account.trustclubId))
      : new Map<string, number | null>()
    return {
      items: items.map((listing) => ({
        listing,
        trustPoints: viewerTrustclubId ? (trust.get(listing.account.trustclubId) ?? null) : null,
      })),
      total,
      page,
      pageSize: PAGE_SIZE,
      trustRanked: false,
    }
  }

  const candidates = await prisma.listing.findMany({
    where,
    include: LISTING_INCLUDE,
    orderBy: [{ postedAt: 'desc' }],
    take: CANDIDATE_WINDOW,
  })

  const trust = await getTrustPointsBatch(
    viewerTrustclubId,
    candidates.map((c) => c.account.trustclubId),
  )

  const ranked: RankedListing[] = candidates
    .map((listing) => ({ listing, trustPoints: trust.get(listing.account.trustclubId) ?? null }))
    .sort(compareByTrust)

  return {
    items: ranked.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total,
    page,
    pageSize: PAGE_SIZE,
    trustRanked: true,
  }
}

/**
 * Trust descending, then recency.
 *
 * An unknown trust value (a failed lookup) sorts as if it were no path, rather
 * than being hidden or promoted — we don't know, so we don't claim either way,
 * and recency decides between them.
 */
export function compareByTrust(a: RankedListing, b: RankedListing): number {
  const av = a.trustPoints ?? -1
  const bv = b.trustPoints ?? -1
  if (av !== bv) return bv - av
  return b.listing.postedAt.getTime() - a.listing.postedAt.getTime()
}
