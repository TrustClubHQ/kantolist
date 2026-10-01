import Link from 'next/link'
import type { ListingType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentAccount } from '@/lib/auth'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { ListingCard } from '@/components/ListingCard'
import { SearchBar } from '@/components/SearchBar'
import { FilterControls } from '@/components/FilterPanel'
import { EmptyState, Plate } from '@/components/ui'
import { searchListings, PAGE_SIZE, type SortKey } from '@/lib/search'
import { listingPath } from '@/lib/listing'
import { parseSchema } from '@/lib/attributes'
import { getT } from '@/lib/i18n-server'
import { categoryName } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

const SORTS: SortKey[] = ['trust', 'newest', 'price_asc', 'price_desc']

type Search = Record<string, string | string[] | undefined>

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

export default async function BrowsePage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const [account, t] = await Promise.all([getCurrentAccount(), getT()])

  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    const value = one(v)
    if (value !== undefined) params.set(k, value)
  }

  const categorySlug = one(sp.category)
  const sort = one(sp.sort) as SortKey | undefined
  const page = Number(one(sp.page) ?? 1) || 1

  const [category, municipalities, categories] = await Promise.all([
    categorySlug
      ? prisma.category.findUnique({
          where: { slug: categorySlug },
          select: { name: true, slug: true, attributeSchema: true, parent: { select: { name: true, slug: true } } },
        })
      : null,
    prisma.municipality.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, province: true } }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }],
      select: { slug: true, name: true, parentId: true, id: true },
    }),
  ])

  const result = await searchListings(
    {
      q: one(sp.q),
      categorySlug,
      type: one(sp.type) as ListingType | undefined,
      municipalityId: one(sp.municipality),
      includeNearby: one(sp.nearby) === 'true',
      minPrice: one(sp.min) ? Number(one(sp.min)) : undefined,
      maxPrice: one(sp.max) ? Number(one(sp.max)) : undefined,
      sort,
      page,
      attributes: params,
    },
    account?.trustclubId ?? null,
  )

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE))
  const heading = category
    ? categoryName(t, category.slug, category.name)
    : one(sp.q)
      ? `“${one(sp.q)}”`
      : t('browse.everything')

  function withParam(key: string, value?: string): string {
    const next = new URLSearchParams(params.toString())
    if (value === undefined) next.delete(key)
    else next.set(key, value)
    if (key !== 'page') next.delete('page')
    return `/browse?${next.toString()}`
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <div className="border-b-4 border-ink bg-red px-4 py-3">
        <div className="mx-auto max-w-6xl">
          <SearchBar defaultValue={one(sp.q) ?? ''} />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-4 sm:px-4 lg:flex-row lg:items-start lg:gap-6 lg:py-5">
        <aside className="lg:w-[288px] lg:shrink-0">
          <FilterControls
            categories={categories}
            municipalities={municipalities}
            attributes={category ? parseSchema(category.attributeSchema) : []}
            current={Object.fromEntries(params.entries())}
          />
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display m-0 text-[30px] uppercase leading-none">{heading}</h1>
              <p className="label m-0 mt-1.5 text-[16px] text-muted-2">
                {result.total === 1
                  ? t('browse.countOne')
                  : t('browse.countMany', { count: result.total })}
                {result.trustRanked ? t('browse.ranked') : ''}
              </p>
            </div>
            {/* Wrapping, not scrolling: the fourth chip used to sit off the
                right edge of a 390px screen with nothing to say it was there. */}
            <div className="flex flex-wrap gap-2">
              {SORTS.map((key) => {
                const active = (sort ?? (account ? 'trust' : 'newest')) === key
                const disabled = key === 'trust' && !account
                return disabled ? (
                  // A dead chip explained only by a hover title is explained to
                  // nobody on a phone. It is a link to the thing that unlocks it.
                  <Link
                    key={key}
                    href={`/signin?redirect=${encodeURIComponent(`/browse?${params.toString()}`)}`}
                    title={t('browse.sort.trustLocked')}
                    className="label flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap border-[2.5px] border-dim-edge bg-dim px-3 text-[16px] text-muted hover:border-ink hover:text-ink"
                  >
                    <LockMark />
                    {t(`browse.sort.${key}`)}
                  </Link>
                ) : (
                  <Link
                    key={key}
                    href={withParam('sort', key)}
                    className={`label flex min-h-[40px] shrink-0 items-center whitespace-nowrap border-[2.5px] border-ink px-3 text-[16px] ${
                      active ? 'bg-yellow text-ink' : 'bg-panel text-ink'
                    }`}
                  >
                    {t(`browse.sort.${key}`)}
                  </Link>
                )
              })}
            </div>
          </div>

          {!account && result.total > 0 ? (
            <Plate flat className="mb-4 border-[3px] px-3 py-2.5">
              <p className="m-0 text-[13px] font-semibold text-muted-2">
                {t('browse.signInPrompt.before')}
                <Link href={`/signin?redirect=${encodeURIComponent(`/browse?${params.toString()}`)}`}>
                  {t('browse.signInPrompt.link')}
                </Link>
                {t('browse.signInPrompt.after')}
              </p>
            </Plate>
          ) : null}

          {categories.length === 0 ? (
            // No categories means no reference data, so this is a blank or
            // wrong database rather than an empty result. Saying "nothing
            // matches those filters" here hid exactly that behind a page that
            // looked like it was working.
            <EmptyState title={t('browse.noData')}>{t('browse.noDataHelp')}</EmptyState>
          ) : result.items.length === 0 ? (
            <EmptyState title={t('browse.empty')}>{t('browse.emptyHelp')}</EmptyState>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
              {result.items.map(({ listing, trustPoints }) => (
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

          {totalPages > 1 ? (
            <nav className="mt-6 flex items-center justify-between gap-3">
              {page > 1 ? (
                <Link href={withParam('page', String(page - 1))} className="label flex min-h-[48px] items-center border-[3px] border-ink bg-panel px-4 text-[17px]">
                  {t('browse.previous')}
                </Link>
              ) : (
                <span />
              )}
              <span className="label text-[16px] text-muted-2">
                {t('browse.page', { page, total: totalPages })}
              </span>
              {page < totalPages ? (
                <Link href={withParam('page', String(page + 1))} className="label flex min-h-[48px] items-center border-[3px] border-ink bg-panel px-4 text-[17px]">
                  {t('browse.next')}
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </main>
      </div>

      <SiteFooter />
    </div>
  )
}

/** The one chip you cannot use yet. */
function LockMark() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="1" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  )
}
