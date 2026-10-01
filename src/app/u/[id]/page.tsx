import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getCurrentAccount } from '@/lib/auth'
import { getTrustPoints } from '@/lib/trustclub'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { ListingCard } from '@/components/ListingCard'
import { TrustPointsPair, TrustClubLink } from '@/components/TrustPoints'
import { EmptyState, Plate } from '@/components/ui'
import { listingPath } from '@/lib/listing'
import { timeAgo } from '@/lib/format'
import { getT } from '@/lib/i18n-server'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

/**
 * A seller's own listings.
 *
 * The listing page said "2 listings" and that was the end of it — a buyer who
 * had just decided they trusted someone had no way to see what else that
 * person was selling, which is the cheapest second sale there is.
 */
async function load(id: string) {
  return prisma.account.findUnique({
    where: { trustclubId: id.toLowerCase() },
    select: {
      id: true,
      trustclubId: true,
      displayName: true,
      createdAt: true,
      listings: {
        where: { status: { in: ['ACTIVE', 'RESERVED'] } },
        orderBy: [{ postedAt: 'desc' }],
        include: {
          images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
          municipality: { select: { name: true } },
          category: { select: { slug: true, parent: { select: { slug: true } } } },
        },
      },
    },
  })
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  const account = await load(id)
  const t = await getT()
  if (!account) return { title: t('seller.notFound') }
  return { title: t('seller.title', { name: account.displayName ?? `@${account.trustclubId}` }) }
}

export default async function SellerPage({ params }: Params) {
  const { id } = await params
  const [seller, viewer, t] = await Promise.all([load(id), getCurrentAccount(), getT()])
  if (!seller) notFound()

  const isOwn = viewer?.id === seller.id
  // Both directions, as on a listing: what your network says about them, and
  // what they see when they look you up.
  const [myTrustInThem, theirTrustInMe] = viewer
    ? await Promise.all([
        getTrustPoints(viewer.trustclubId, seller.trustclubId),
        getTrustPoints(seller.trustclubId, viewer.trustclubId),
      ])
    : [null, null]

  const name = seller.displayName ?? seller.trustclubId

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-4">
        <Plate className="flex flex-col gap-3 p-3.5">
          <div className="flex items-center gap-3">
            <span className="font-display flex h-[52px] w-[52px] shrink-0 items-center justify-center border-[3px] border-ink bg-red text-[24px] text-ground">
              {name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="font-display m-0 text-[26px] uppercase leading-none">{name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <TrustClubLink trustclubId={seller.trustclubId} />
                <span className="label text-[15px] font-semibold text-muted">
                  {t('seller.memberSince', { when: timeAgo(seller.createdAt, t) })}
                </span>
              </div>
            </div>
          </div>

          {viewer ? (
            <TrustPointsPair
              myTrustInThem={myTrustInThem}
              theirTrustInMe={theirTrustInMe}
              isOwn={isOwn}
              sellerName={name}
            />
          ) : null}
        </Plate>

        <h2 className="label m-0 mb-3 mt-5 text-[20px]">
          {seller.listings.length === 1
            ? t('seller.countOne')
            : t('seller.count', { count: seller.listings.length })}
        </h2>

        {seller.listings.length === 0 ? (
          <EmptyState title={t('seller.empty')}>{t('seller.emptyHelp')}</EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {seller.listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={{
                  href: listingPath(listing.code, listing.slug),
                  title: listing.title,
                  type: listing.type,
                  status: listing.status,
                  price: listing.price === null ? null : Number(listing.price),
                  priceUnit: listing.priceUnit,
                  negotiable: listing.negotiable,
                  image: listing.images[0]?.url ?? null,
                  municipality: listing.municipality.name,
                  categorySlug: listing.category.slug,
                  parentSlug: listing.category.parent?.slug ?? null,
                  postedAt: listing.postedAt,
                  // Trust is about the seller, and the seller is the same on
                  // every card here — the panel above already says it.
                  trustPoints: null,
                  isOwn,
                  signedIn: false,
                }}
              />
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
