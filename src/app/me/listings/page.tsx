import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentAccount } from '@/lib/auth'
import { SiteHeader } from '@/components/SiteHeader'
import { MyListings } from '@/components/MyListings'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'My listings' }

export default async function MyListingsPage() {
  const account = await getCurrentAccount()
  if (!account) redirect('/signin?redirect=/me/listings')

  const listings = await prisma.listing.findMany({
    where: { accountId: account.id },
    orderBy: [{ postedAt: 'desc' }],
    include: {
      images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
      _count: { select: { contacts: true } },
    },
  })

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <MyListings
        listings={listings.map((l) => ({
          id: l.id,
          href: `/l/${l.code}-${l.slug}`,
          title: l.title,
          status: l.status,
          type: l.type,
          price: l.price === null ? null : Number(l.price),
          priceUnit: l.priceUnit,
          image: l.images[0]?.url ?? null,
          postedAt: l.postedAt.toISOString(),
          expiresAt: l.expiresAt.toISOString(),
          viewCount: l.viewCount,
          contactCount: l._count.contacts,
        }))}
      />
    </div>
  )
}
