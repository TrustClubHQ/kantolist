import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentAccount } from '@/lib/auth'
import { getTrustPointsBatch } from '@/lib/trustclub'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { ListingCard } from '@/components/ListingCard'
import { EmptyState } from '@/components/ui'
import { listingPath } from '@/lib/listing'
import { getT } from '@/lib/i18n-server'
import { translatedTitle } from '@/lib/page-title'

export const dynamic = 'force-dynamic'
export const generateMetadata = translatedTitle('saved.title')

/**
 * The listings someone is still deciding between.
 *
 * A closed or reserved listing stays on the list rather than vanishing: it
 * disappearing without explanation is worse than seeing it is gone, and
 * "already sold" is itself useful information about a seller.
 */
export default async function SavedPage() {
  const account = await getCurrentAccount()
  if (!account) redirect('/signin?redirect=/me/saved')
  const t = await getT()

  const saved = await prisma.savedListing.findMany({
    where: { accountId: account.id },
    orderBy: { createdAt: 'desc' },
    include: {
      listing: {
        include: {
          images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
          municipality: { select: { name: true } },
          category: { select: { slug: true, parent: { select: { slug: true } } } },
          account: { select: { trustclubId: true } },
        },
      },
    },
  })

  const visible = saved.filter((row) => row.listing.status !== 'REMOVED')
  const trust = await getTrustPointsBatch(
    account.trustclubId,
    visible.map((row) => row.listing.account.trustclubId),
  )

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-4">
        <h1 className="font-display m-0 mb-4 text-[30px] uppercase leading-none">{t('saved.title')}</h1>

        {visible.length === 0 ? (
          <EmptyState title={t('saved.empty')}>
            {t('saved.emptyHelp')} <Link href="/browse">{t('saved.browse')}</Link>.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {visible.map(({ listing }) => {
              const points = trust.get(listing.account.trustclubId) ?? null
              return (
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
                    trustPoints: Number.isFinite(points ?? NaN) ? points : null,
                    isOwn: listing.account.trustclubId === account.trustclubId,
                    signedIn: true,
                  }}
                />
              )
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
