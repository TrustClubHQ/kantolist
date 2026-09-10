import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getCurrentAccount } from '@/lib/auth'
import { getTrustPoints } from '@/lib/trustclub'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { Badge, Plate, PlateHeader, Price, SafetyNote } from '@/components/ui'
import { TrustPointsPanel, TrustClubLink } from '@/components/TrustPoints'
import { ContactSheet } from '@/components/ContactSheet'
import { ReportLink } from '@/components/ReportLink'
import { CategoryMark } from '@/components/CategoryMark'
import { codeFromParam, formatPrice, LISTING_TYPE_LABEL } from '@/lib/listing'
import { parseSchema } from '@/lib/attributes'
import { timeAgo } from '@/lib/format'
import { getSellerContact } from '@/lib/seller'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ code: string }> }

async function load(codeParam: string) {
  const code = codeFromParam(codeParam)
  if (!code) return null
  return prisma.listing.findUnique({
    where: { code },
    include: {
      // Contact details are deliberately absent: anything selected here is
      // serialised into the page's flight payload and readable by anyone.
      // src/lib/seller.ts hands back only the masked form.
      account: {
        select: {
          id: true, trustclubId: true, displayName: true, createdAt: true,
          _count: { select: { listings: true } },
        },
      },
      category: { select: { name: true, slug: true, attributeSchema: true, parent: { select: { name: true, slug: true } } } },
      municipality: { select: { name: true, province: true } },
      images: { orderBy: { sortOrder: 'asc' } },
      serviceAreas: { include: { municipality: { select: { name: true } } } },
    },
  })
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { code } = await params
  const listing = await load(code)
  if (!listing) return { title: 'Listing not found' }
  return {
    title: listing.title,
    description: listing.description.slice(0, 160) || undefined,
  }
}

export default async function ListingPage({ params }: Params) {
  const { code } = await params
  const listing = await load(code)
  if (!listing || listing.status === 'REMOVED') notFound()

  const account = await getCurrentAccount()
  const isOwner = account?.id === listing.account.id

  const trustPoints = account ? await getTrustPoints(account.trustclubId, listing.account.trustclubId) : null
  const seller = await getSellerContact(listing.account.id)

  // A view from the owner would inflate their own count, so it does not record.
  if (!isOwner) {
    await prisma.listing.update({ where: { id: listing.id }, data: { viewCount: { increment: 1 } } })
  }

  const schema = parseSchema(listing.category.attributeSchema)
  const values = (listing.attributes ?? {}) as Record<string, string | number | boolean>
  const rows = schema
    .map((def) => ({ def, value: values[def.key] }))
    .filter((r) => r.value !== undefined && r.value !== null && r.value !== '')

  const channels = (listing.contactChannels ?? []) as string[]
  const sellerName = listing.account.displayName ?? listing.account.trustclubId
  const closed = listing.status === 'CLOSED' || listing.status === 'EXPIRED'

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <div className="relative h-[262px] border-b-4 border-ink bg-dim">
        {listing.images[0] ? (
          <Image
            src={listing.images[0].url}
            alt={listing.title}
            fill
            sizes="(max-width: 900px) 100vw, 900px"
            className="object-cover"
            priority
          />
        ) : (
          <CategoryMark
            categorySlug={listing.category.slug}
            parentSlug={listing.category.parent?.slug ?? null}
            size={72}
          />
        )}
        {listing.images.length > 1 ? (
          <span className="label absolute bottom-3 right-3 bg-ink px-2.5 py-0.5 text-[14px] text-ground">
            1 / {listing.images.length}
          </span>
        ) : null}
      </div>

      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={listing.status === 'RESERVED' ? 'ink' : 'yellow'}>
              {listing.status === 'RESERVED' ? 'Reserved' : LISTING_TYPE_LABEL[listing.type]}
            </Badge>
            {closed ? <Badge tone="dim">No longer available</Badge> : null}
            {listing.category.parent ? (
              <Link href={`/browse?category=${listing.category.slug}`} className="label text-[15px] text-muted">
                {listing.category.parent.name} › {listing.category.name}
              </Link>
            ) : null}
          </div>

          <h1 className="font-display m-0 text-[31px] uppercase leading-none">{listing.title}</h1>

          <div className="flex flex-wrap items-baseline gap-2.5">
            <Price size="lg">{formatPrice(listing.price === null ? null : Number(listing.price), listing.priceUnit)}</Price>
            {listing.negotiable ? <span className="label text-[18px] text-muted-2">negotiable</span> : null}
          </div>

          <p className="label m-0 text-[17px]">
            {listing.barangay ? `${listing.barangay}, ` : ''}
            {listing.municipality.name}, {listing.municipality.province}
          </p>
          <p className="label m-0 text-[15px] font-semibold text-muted">
            Posted {timeAgo(listing.postedAt)} · {listing.viewCount} views · #{listing.code}
          </p>
        </div>

        <section className="mt-4">
          <Plate className="flex flex-col gap-3 p-3.5">
            <div className="flex items-center gap-3">
              <span className="font-display flex h-[46px] w-[46px] shrink-0 items-center justify-center border-[3px] border-ink bg-red text-[22px] text-ground">
                {sellerName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="label m-0 text-[20px] leading-tight">{sellerName}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <TrustClubLink trustclubId={listing.account.trustclubId} />
                  <span className="label text-[15px] font-semibold text-muted">
                    {listing.account._count.listings} listings
                  </span>
                </div>
              </div>
            </div>

            {account ? (
              <TrustPointsPanel points={trustPoints} isOwn={isOwner} />
            ) : (
              <div className="border-[3px] border-dim-edge bg-dim px-3 py-3">
                <p className="label m-0 text-[19px] text-muted-2">Log in to see your connection</p>
                <p className="m-0 mt-1 text-[13px] font-semibold leading-snug text-muted-2">
                  KantoList can show how strongly your own TrustClub network vouches for this member.
                </p>
              </div>
            )}
          </Plate>
        </section>

        {rows.length > 0 ? (
          <section className="mt-4">
            <Plate>
              <PlateHeader>Details</PlateHeader>
              <dl className="m-0 px-3.5">
                {rows.map(({ def, value }, i) => (
                  <div
                    key={def.key}
                    className={`flex items-baseline justify-between gap-4 py-2.5 ${
                      i < rows.length - 1 ? 'border-b-2 border-dim' : ''
                    }`}
                  >
                    <dt className="label text-[16px] font-semibold text-muted">{def.label}</dt>
                    <dd className="label m-0 text-right text-[17px]">
                      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                      {def.unit && typeof value === 'number' ? ` ${def.unit}` : ''}
                    </dd>
                  </div>
                ))}
              </dl>
            </Plate>
          </section>
        ) : null}

        {listing.description ? (
          <section className="mt-4">
            <Plate className="p-3.5">
              <h2 className="font-display m-0 text-[19px] uppercase">Description</h2>
              <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-body">
                {listing.description}
              </p>
            </Plate>
          </section>
        ) : null}

        {listing.serviceAreas.length > 0 ? (
          <section className="mt-4">
            <Plate className="p-3.5">
              <h2 className="font-display m-0 text-[19px] uppercase">Serves</h2>
              <p className="label m-0 mt-1.5 text-[16px] text-muted-2">
                {listing.serviceAreas.map((a) => a.municipality.name).join(' · ')}
              </p>
            </Plate>
          </section>
        ) : null}

        <section className="mt-4">
          <SafetyNote>
            Meet in a public place and inspect before paying any deposit. KantoList handles no
            payment and no delivery.
          </SafetyNote>
        </section>

        <div className="mt-4 flex justify-center">
          <ReportLink listingId={listing.id} signedIn={!!account} />
        </div>
      </main>

      {!closed ? (
        <ContactSheet
          listingId={listing.id}
          listingTitle={listing.title}
          sellerName={sellerName}
          sellerTrustclubId={listing.account.trustclubId}
          channels={channels}
          maskedPhone={seller.maskedPhone}
          signedIn={!!account}
          isOwner={isOwner}
        />
      ) : null}

      <SiteFooter />
    </div>
  )
}
