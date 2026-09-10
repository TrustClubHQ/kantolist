import Link from 'next/link'
import type { ListingType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentAccount } from '@/lib/auth'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { ListingCard } from '@/components/ListingCard'
import { SearchBar } from '@/components/SearchBar'
import { FilterPanel } from '@/components/FilterPanel'
import { EmptyState, Plate } from '@/components/ui'
import { searchListings, PAGE_SIZE, type SortKey } from '@/lib/search'
import { listingPath } from '@/lib/listing'
import { parseSchema } from '@/lib/attributes'

export const dynamic = 'force-dynamic'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'trust', label: 'Trust' },
  { key: 'newest', label: 'Newest' },
  { key: 'price_asc', label: 'Cheapest' },
  { key: 'price_desc', label: 'Priciest' },
]

type Search = Record<string, string | string[] | undefined>

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

export default async function BrowsePage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const account = await getCurrentAccount()

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
  const heading = category ? category.name : one(sp.q) ? `“${one(sp.q)}”` : 'Everything'

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

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 lg:flex-row lg:items-start">
        <aside className="lg:w-[288px] lg:shrink-0">
          <FilterPanel
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
                {result.total} {result.total === 1 ? 'listing' : 'listings'}
                {result.trustRanked ? ' · ranked by your TrustClub network' : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SORTS.map((s) => {
                const active = (sort ?? (account ? 'trust' : 'newest')) === s.key
                const disabled = s.key === 'trust' && !account
                return disabled ? (
                  <span
                    key={s.key}
                    title="Log in to rank by your own trust network"
                    className="label border-[2.5px] border-dim-edge bg-dim px-3 py-1.5 text-[16px] text-muted"
                  >
                    {s.label}
                  </span>
                ) : (
                  <Link
                    key={s.key}
                    href={withParam('sort', s.key)}
                    className={`label border-[2.5px] border-ink px-3 py-1.5 text-[16px] ${
                      active ? 'bg-yellow text-ink' : 'bg-panel text-ink'
                    }`}
                  >
                    {s.label}
                  </Link>
                )
              })}
            </div>
          </div>

          {!account && result.total > 0 ? (
            <Plate flat className="mb-4 border-[3px] px-3 py-2.5">
              <p className="m-0 text-[13px] font-semibold text-muted-2">
                Showing newest first. <Link href="/signin">Log in with TrustClub</Link> to put the
                people your own network vouches for at the top.
              </p>
            </Plate>
          ) : null}

          {result.items.length === 0 ? (
            <EmptyState title="Nothing matches those filters">
              Try widening the price range, or turning on nearby towns.
            </EmptyState>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
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
                    postedAt: listing.postedAt,
                    trustPoints,
                  }}
                />
              ))}
            </div>
          )}

          {totalPages > 1 ? (
            <nav className="mt-6 flex items-center justify-between gap-3">
              {page > 1 ? (
                <Link href={withParam('page', String(page - 1))} className="label border-[3px] border-ink bg-panel px-4 py-2.5 text-[17px]">
                  Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="label text-[16px] text-muted-2">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link href={withParam('page', String(page + 1))} className="label border-[3px] border-ink bg-panel px-4 py-2.5 text-[17px]">
                  Next
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
