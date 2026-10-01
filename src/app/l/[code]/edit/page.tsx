import { notFound, redirect } from 'next/navigation'
import { translatedTitle } from '@/lib/page-title'
import { prisma } from '@/lib/prisma'
import { getCurrentAccount } from '@/lib/auth'
import { SiteHeader } from '@/components/SiteHeader'
import { PostForm } from '@/components/PostForm'
import { ListingOwnerActions } from '@/components/ListingOwnerActions'
import { parseSchema } from '@/lib/attributes'
import { codeFromParam, listingPath } from '@/lib/listing'
import { photosEnabled } from '@/lib/photo-store'

export const dynamic = 'force-dynamic'
export const generateMetadata = translatedTitle('title.edit')

/**
 * Editing reuses the posting form rather than duplicating it: one screen to
 * keep correct, and a field added to posting is editable the same day.
 */
export default async function EditListingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: codeParam } = await params
  const code = codeFromParam(codeParam)
  if (!code) notFound()

  const account = await getCurrentAccount()
  if (!account) redirect(`/signin?redirect=${encodeURIComponent(`/l/${codeParam}/edit`)}`)

  const listing = await prisma.listing.findUnique({
    where: { code },
    include: {
      category: { select: { id: true } },
      images: { orderBy: { sortOrder: 'asc' }, select: { id: true, url: true } },
    },
  })
  if (!listing || listing.status === 'REMOVED') notFound()
  // Not "forbidden": whose listing this is, is not a stranger's business.
  if (listing.accountId !== account.id) notFound()

  const [categories, municipalities] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }],
      select: { id: true, slug: true, name: true, parentId: true, attributeSchema: true },
    }),
    prisma.municipality.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, province: true } }),
  ])

  const parents = categories.filter((c) => !c.parentId)
  const tree = parents.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    children: categories
      .filter((c) => c.parentId === p.id)
      .map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        attributes: parseSchema(c.attributeSchema),
      })),
  }))

  // The form holds every field as a string, so a number or boolean coming out
  // of the attributes JSON has to be rendered back into one here.
  const raw = (listing.attributes ?? {}) as Record<string, string | number | boolean>
  const attributes: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (value !== null && value !== undefined) attributes[key] = String(value)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <PostForm
        categories={tree}
        municipalities={municipalities}
        defaultMunicipalityId={listing.municipalityId}
        contact={{
          phone: account.phone,
          phoneVerified: !!account.phoneVerifiedAt,
          messenger: account.messengerHandle,
          facebook: account.facebookUrl,
          viber: account.viberNumber,
        }}
        existing={{
          id: listing.id,
          type: listing.type,
          categoryId: listing.category.id,
          title: listing.title,
          description: listing.description,
          price: listing.price === null ? '' : String(listing.price),
          priceUnit: listing.priceUnit ?? 'TOTAL',
          negotiable: listing.negotiable,
          barangay: listing.barangay ?? '',
          attributes,
          videoUrl: listing.videoUrl,
        }}
        cancelHref={listingPath(listing.code, listing.slug)}
        photosEnabled={photosEnabled()}
        photos={listing.images}
      />
      <ListingOwnerActions
        listingId={listing.id}
        status={listing.status}
        listingsHref="/me/listings"
      />
    </div>
  )
}
