import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAccountFromRequest } from '@/lib/auth'
import { withApiHandler, badRequest, unauthorized, forbidden, notFound } from '@/lib/api'
import { isAllowedMutatingRequest } from '@/lib/http'
import { parseSchema, validateAttributes } from '@/lib/attributes'
import { slugify } from '@/lib/listing'

type Ctx = { params: Promise<{ id: string }> }

type OwnedListing = Awaited<ReturnType<typeof findListing>>
type LoadResult = { error: NextResponse } | { error?: undefined; listing: NonNullable<OwnedListing> }

function findListing(id: string) {
  return prisma.listing.findUnique({
    where: { id },
    include: { category: { select: { attributeSchema: true } } },
  })
}

/** Edits are owner-only; staff moderate through the report queue, not by editing. */
async function loadOwned(request: NextRequest, id: string): Promise<LoadResult> {
  const account = await getAccountFromRequest(request)
  if (!account) return { error: unauthorized() }
  const listing = await findListing(id)
  if (!listing) return { error: notFound('Listing not found') }
  if (listing.accountId !== account.id) return { error: forbidden('This is not your listing') }
  return { listing }
}

export const PATCH = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  if (!isAllowedMutatingRequest(request)) return forbidden()
  const { id } = await ctx.params
  const owned = await loadOwned(request, id)
  if (owned.error) return owned.error
  const { listing } = owned

  const body: {
    title?: string
    description?: string
    price?: number | null
    negotiable?: boolean
    attributes?: unknown
    barangay?: string
    meetupNote?: string
  } = await request.json().catch(() => ({}))

  const data: Prisma.ListingUpdateInput = {}

  if (body.title !== undefined) {
    const title = body.title.trim()
    if (!title) return badRequest('A title is required')
    if (title.length > 70) return badRequest('Keep the title to 70 characters or fewer')
    data.title = title
    data.slug = slugify(title)
  }

  if (body.description !== undefined) data.description = body.description.trim().slice(0, 4000)
  if (body.negotiable !== undefined) data.negotiable = !!body.negotiable
  if (body.barangay !== undefined) data.barangay = body.barangay.trim() || null
  if (body.meetupNote !== undefined) data.meetupNote = body.meetupNote.trim() || null

  if (body.price !== undefined) {
    if (listing.priceUnit === 'QUOTE') return badRequest('A quote listing cannot carry a price')
    const price = body.price === null ? null : Number(body.price)
    if (price === null || !Number.isFinite(price) || price < 0) return badRequest('Enter a price')
    data.price = price
  }

  if (body.attributes !== undefined) {
    const validated = validateAttributes(parseSchema(listing.category.attributeSchema), body.attributes)
    if (!validated.ok) return badRequest(validated.error)
    data.attributes = validated.values as unknown as Prisma.InputJsonValue
  }

  const updated = await prisma.listing.update({ where: { id: listing.id }, data })
  return NextResponse.json({ code: updated.code, slug: updated.slug })
})

export const DELETE = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  if (!isAllowedMutatingRequest(request)) return forbidden()
  const { id } = await ctx.params
  const owned = await loadOwned(request, id)
  if (owned.error) return owned.error
  await prisma.listing.delete({ where: { id: owned.listing.id } })
  return NextResponse.json({ ok: true })
})
