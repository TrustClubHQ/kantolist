import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentAccount } from '@/lib/auth'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { ListingCard } from '@/components/ListingCard'
import { SearchBar } from '@/components/SearchBar'
import { Plate } from '@/components/ui'
import { searchListings } from '@/lib/search'
import { getT } from '@/lib/i18n-server'
import { categoryName } from '@/lib/i18n'
import { listingPath } from '@/lib/listing'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [account, t] = await Promise.all([getCurrentAccount(), getT()])

  const [categories, result, counts] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, slug: true, name: true, icon: true, parentId: true },
    }),
    searchListings({ page: 1 }, account?.trustclubId ?? null),
    // One grouped count rather than a query per tile. A category with nothing
    // in it looks exactly like a full one otherwise, which is how a new
    // marketplace reads as empty even when it is not.
    prisma.listing.groupBy({
      by: ['categoryId'],
      where: { status: { in: ['ACTIVE', 'RESERVED'] } },
      _count: { _all: true },
    }),
  ])

  const countByCategory = new Map(counts.map((row) => [row.categoryId, row._count._all]))
  const parents = categories.filter((c) => !c.parentId)
  const countFor = (parentId: string) =>
    categories
      .filter((c) => c.id === parentId || c.parentId === parentId)
      .reduce((sum, c) => sum + (countByCategory.get(c.id) ?? 0), 0)

  const home = account?.municipalityId
    ? await prisma.municipality.findUnique({ where: { id: account.municipalityId } })
    : null

  const featured = result.items.slice(0, 6)

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader location={home ? `${home.name}, ${home.province}` : undefined} />

      <section className="border-b-4 border-ink bg-ground px-3 py-5 sm:px-4 sm:py-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-display m-0 text-[34px] uppercase leading-[0.94] sm:text-[52px]">
            {t('home.hero.line1')}
            <br />
            {t('home.hero.line2')}
            <br />
            <span className="text-red">{t('home.hero.line3')}</span>
          </h1>
          <p className="mt-3 max-w-md text-[15px] font-semibold leading-snug text-muted-2">
            {account ? t('home.hero.signedIn') : t('home.hero.signedOut')}
          </p>
          <div className="mt-5 max-w-2xl">
            <SearchBar />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-4 sm:py-6">
        <h2 className="label m-0 mb-3 text-[20px]">{t('home.categories')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {parents.map((c) => {
            const count = countFor(c.id)
            return (
              <Link
                key={c.slug}
                href={`/browse?category=${c.slug}`}
                className="hard-sm flex min-h-[74px] flex-col items-center justify-center gap-1 border-[3px] border-ink bg-panel px-3 py-3 text-center text-ink hover:bg-yellow hover:text-ink"
              >
                <span className="label text-[17px]">{categoryName(t, c.slug, c.name)}</span>
                <span className="label text-[13px] font-semibold text-muted">
                  {count === 0
                    ? t('home.categoryEmpty')
                    : count === 1
                      ? t('home.categoryCountOne')
                      : t('home.categoryCount', { count })}
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-3 pb-5 sm:px-4 sm:pb-6">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="label m-0 text-[20px]">
            {result.trustRanked ? t('home.trusted') : t('home.newest')}
          </h2>
          <Link href="/browse" className="label -my-2 flex min-h-[44px] items-center text-[16px] text-red">
            {t('home.seeAll')}
          </Link>
        </div>

        {parents.length === 0 ? (
          <Plate className="p-6">
            <p className="label m-0 text-[20px]">{t('home.noData')}</p>
            <p className="mt-2 text-sm text-muted-2">{t('home.noDataHelp')}</p>
          </Plate>
        ) : featured.length === 0 ? (
          <Plate className="p-6">
            <p className="label m-0 text-[20px]">{t('home.empty')}</p>
            <p className="mt-2 text-sm text-muted-2">
              {t('home.emptyHelp.before')}
              <Link href="/post">{t('home.emptyHelp.link')}</Link>
              {t('home.emptyHelp.after')}
            </p>
          </Plate>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {featured.map(({ listing, trustPoints }) => (
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
                  postedAt: listing.postedAt,
                  trustPoints: Number.isFinite(trustPoints ?? NaN) ? trustPoints : null,
                  isOwn: listing.account.trustclubId === account?.trustclubId,
                  signedIn: !!account,
                }}
              />
            ))}
          </div>
        )}
      </section>

      {!account ? (
        <section className="mx-auto w-full max-w-6xl px-3 pb-5 sm:px-4 sm:pb-6">
          <Plate className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="label m-0 text-[20px]">{t('home.cta.title')}</p>
              <p className="m-0 mt-1 text-sm text-muted-2">{t('home.cta.body')}</p>
            </div>
            <Link
              href="/signin?redirect=%2F"
              className="font-display hard-sm inline-flex shrink-0 items-center justify-center border-[3px] border-ink bg-red px-4 py-3 text-[19px] uppercase text-ground hover:text-ground"
            >
              {t('signin.link')}
            </Link>
          </Plate>
        </section>
      ) : null}

      <SiteFooter />
    </div>
  )
}
