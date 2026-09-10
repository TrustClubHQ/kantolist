import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentAccount } from '@/lib/auth'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { ListingCard } from '@/components/ListingCard'
import { SearchBar } from '@/components/SearchBar'
import { SafetyNote, Plate } from '@/components/ui'
import { searchListings } from '@/lib/search'
import { listingPath } from '@/lib/listing'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const account = await getCurrentAccount()

  const [categories, result] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
      select: { slug: true, name: true, icon: true },
    }),
    searchListings({ page: 1 }, account?.trustclubId ?? null),
  ])

  const home = account?.municipalityId
    ? await prisma.municipality.findUnique({ where: { id: account.municipalityId } })
    : null

  const featured = result.items.slice(0, 6)

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader location={home ? `${home.name}, ${home.province}` : undefined} />

      <section className="border-b-4 border-ink bg-ground px-4 py-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-display m-0 text-[40px] uppercase leading-[0.94] sm:text-[52px]">
            Buy, rent,
            <br />
            get it fixed —
            <br />
            <span className="text-red">right on your corner.</span>
          </h1>
          <p className="mt-3 max-w-md text-[15px] font-semibold leading-snug text-muted-2">
            {account
              ? 'Listings from people your TrustClub network already vouches for come first.'
              : 'Log in with TrustClub and listings from people your own network vouches for come first.'}
          </p>
          <div className="mt-5 max-w-2xl">
            <SearchBar />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-6">
        <h2 className="label m-0 mb-3 text-[20px]">Browse by category</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/browse?category=${c.slug}`}
              className="hard-sm flex min-h-[74px] items-center justify-center border-[3px] border-ink bg-panel px-3 py-3 text-center text-ink hover:bg-yellow hover:text-ink"
            >
              <span className="label text-[17px]">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-6">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="label m-0 text-[20px]">
            {result.trustRanked ? 'Trusted by your network' : 'Newest in your area'}
          </h2>
          <Link href="/browse" className="label text-[16px] text-red">
            See all
          </Link>
        </div>

        {featured.length === 0 ? (
          <Plate className="p-6">
            <p className="label m-0 text-[20px]">Nothing listed yet</p>
            <p className="mt-2 text-sm text-muted-2">
              Be the first — <Link href="/post">post a listing</Link>.
            </p>
          </Plate>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
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
                  postedAt: listing.postedAt,
                  trustPoints: Number.isFinite(trustPoints ?? NaN) ? trustPoints : null,
                  isOwn: listing.account.trustclubId === account?.trustclubId,
                }}
              />
            ))}
          </div>
        )}
      </section>

      {!account ? (
        <section className="mx-auto w-full max-w-6xl px-4 pb-6">
          <Plate className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="label m-0 text-[20px]">See who you can trust</p>
              <p className="m-0 mt-1 text-sm text-muted-2">
                Log in with TrustClub to sort listings by your own connections.
              </p>
            </div>
            <Link
              href="/signin"
              className="font-display hard-sm inline-flex shrink-0 items-center justify-center border-[3px] border-ink bg-red px-4 py-3 text-[19px] uppercase text-ground hover:text-ground"
            >
              Log in
            </Link>
          </Plate>
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-6xl px-4 pb-8">
        <SafetyNote>
          Meet in a public place and inspect before you pay. KantoList handles no payment and no
          delivery — never send a deposit to someone you have no trust path to.
        </SafetyNote>
      </section>

      <SiteFooter />
    </div>
  )
}
