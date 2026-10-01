import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getCurrentAccount } from '@/lib/auth'
import { getTrustPoints } from '@/lib/trustclub'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { Badge, Plate, PlateHeader, Price } from '@/components/ui'
import { TrustPointsPair, TrustClubLink } from '@/components/TrustPoints'
import { ContactSheet } from '@/components/ContactSheet'
import { ReportLink } from '@/components/ReportLink'
import { ShareButton } from '@/components/ShareButton'
import { SaveButton } from '@/components/SaveButton'
import { CategoryMark } from '@/components/CategoryMark'
import { PhotoGallery } from '@/components/PhotoGallery'
import { codeFromParam, formatPrice, listingPath, videoHostName, listingTypeLabel } from '@/lib/listing'
import { parseSchema } from '@/lib/attributes'
import { timeAgo } from '@/lib/format'
import { getSellerContact, usableChannels } from '@/lib/seller'
import { getT } from '@/lib/i18n-server'
import { categoryName } from '@/lib/i18n'

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

  const [account, t] = await Promise.all([getCurrentAccount(), getT()])
  const isOwner = account?.id === listing.account.id

  // Two directed lookups, not one: trust from you toward them is a different
  // fact from trust from them toward you, and a deal depends on both. Named
  // by direction, because these were previously swapped on the way to the UI.
  const [myTrustInThem, theirTrustInMe] = account
    ? await Promise.all([
        getTrustPoints(account.trustclubId, listing.account.trustclubId),
        getTrustPoints(listing.account.trustclubId, account.trustclubId),
      ])
    : [null, null]
  const seller = await getSellerContact(listing.account.id)
  const saved = account
    ? (await prisma.savedListing.findUnique({
        where: { accountId_listingId: { accountId: account.id, listingId: listing.id } },
        select: { listingId: true },
      })) !== null
    : false

  // A view from the owner would inflate their own count, so it does not record.
  if (!isOwner) {
    await prisma.listing.update({ where: { id: listing.id }, data: { viewCount: { increment: 1 } } })
  }

  const schema = parseSchema(listing.category.attributeSchema)
  const values = (listing.attributes ?? {}) as Record<string, string | number | boolean>
  const rows = schema
    .map((def) => ({ def, value: values[def.key] }))
    .filter((r) => r.value !== undefined && r.value !== null && r.value !== '')

  // Only channels the seller can actually be reached on — a stale choice from
  // posting time is dropped here rather than offered and then refused.
  const channels = usableChannels((listing.contactChannels ?? []) as string[], seller)
  const sellerName = listing.account.displayName ?? listing.account.trustclubId
  // Named, so the button says where it is about to take someone. A stored link
  // whose host is no longer one we allow is simply not offered.
  const videoHost = listing.videoUrl ? videoHostName(listing.videoUrl) : null
  const closed = listing.status === 'CLOSED' || listing.status === 'EXPIRED'

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* One column on a phone, which is the whole point of the design. From
          lg up the photo moves beside the text instead of pushing the price
          and the seller a screen down and leaving the right half of a desktop
          window empty. */}
      <div className="mx-auto flex w-full max-w-6xl flex-col lg:flex-row lg:items-start lg:gap-6 lg:px-4 lg:py-5">
        <div className="lg:sticky lg:top-4 lg:w-[520px] lg:shrink-0 lg:border-4 lg:border-ink">
          {listing.images.length > 0 ? (
            <PhotoGallery images={listing.images} title={listing.title} />
          ) : (
            /* A category glyph on grey does not earn a photo's height. */
            <div className="relative flex h-[124px] items-center justify-center border-b-4 border-ink bg-dim lg:h-[260px] lg:border-b-0">
              <CategoryMark
                categorySlug={listing.category.slug}
                parentSlug={listing.category.parent?.slug ?? null}
                size={72}
              />
            </div>
          )}
        </div>

      <main className="mx-auto w-full max-w-3xl min-w-0 flex-1 px-3 pb-28 pt-4 sm:px-4 lg:px-0 lg:pt-0">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={listing.status === 'RESERVED' ? 'ink' : 'yellow'}>
              {listing.status === 'RESERVED' ? t('card.reserved') : listingTypeLabel(listing.type, t)}
            </Badge>
            {closed ? <Badge tone="dim">{t('listing.notAvailable')}</Badge> : null}
            {listing.category.parent ? (
              <Link
                href={`/browse?category=${listing.category.slug}`}
                className="label flex min-h-[44px] items-center text-[15px] text-muted"
              >
                {categoryName(t, listing.category.parent.slug, listing.category.parent.name)} ›{' '}
                {categoryName(t, listing.category.slug, listing.category.name)}
              </Link>
            ) : null}
          </div>

          <h1 className="font-display m-0 text-[27px] uppercase leading-none sm:text-[31px]">{listing.title}</h1>

          <div className="flex flex-wrap items-baseline gap-2.5">
            <Price size="lg">
              {formatPrice(listing.price === null ? null : Number(listing.price), listing.priceUnit, t)}
            </Price>
            {listing.negotiable ? (
              <span className="label text-[18px] text-muted-2">{t('card.negotiable')}</span>
            ) : null}
          </div>

          <p className="label m-0 text-[17px]">
            {listing.barangay ? `${listing.barangay}, ` : ''}
            {listing.municipality.name}, {listing.municipality.province}
          </p>
          <p className="label m-0 text-[15px] font-semibold text-muted">
            {t('listing.postedAt', { when: timeAgo(listing.postedAt, t), code: listing.code })}
          </p>
        </div>

        {listing.videoUrl && videoHost ? (
          <a
            href={listing.videoUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="font-display hard mt-4 flex min-h-[54px] items-center justify-center gap-2 border-[3px] border-ink bg-panel text-[19px] uppercase text-ink hover:text-ink"
          >
            <PlayMark />
            {t('listing.watchOn', { host: videoHost })}
          </a>
        ) : null}

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
                  {listing.account._count.listings > 1 ? (
                    <Link
                      href={`/u/${listing.account.trustclubId}`}
                      className="label text-[15px] font-semibold text-muted underline hover:text-red"
                    >
                      {t('listing.seeSeller', { count: listing.account._count.listings })}
                    </Link>
                  ) : (
                    <span className="label text-[15px] font-semibold text-muted">
                      {t('listing.listingCount', { count: listing.account._count.listings })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {account ? (
              <TrustPointsPair
                myTrustInThem={myTrustInThem}
                theirTrustInMe={theirTrustInMe}
                isOwn={isOwner}
                sellerName={sellerName}
              />
            ) : (
              <Link
                href={`/signin?redirect=${encodeURIComponent(listingPath(listing.code, listing.slug))}`}
                className="label hard-sm flex min-h-[48px] items-center justify-center border-[3px] border-ink bg-yellow px-3 text-center text-[16px] leading-tight text-ink"
              >
                {t('signin.trustPrompt')}
              </Link>
            )}
          </Plate>
        </section>

        {rows.length > 0 ? (
          <section className="mt-4">
            <Plate>
              <PlateHeader>{t('listing.details')}</PlateHeader>
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
                      {typeof value === 'boolean'
                        ? value
                          ? t('listing.yes')
                          : t('listing.no')
                        : String(value)}
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
              <h2 className="font-display m-0 text-[19px] uppercase">{t('listing.description')}</h2>
              <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-body">
                {listing.description}
              </p>
            </Plate>
          </section>
        ) : null}

        {listing.serviceAreas.length > 0 ? (
          <section className="mt-4">
            <Plate className="p-3.5">
              <h2 className="font-display m-0 text-[19px] uppercase">{t('listing.serves')}</h2>
              <p className="label m-0 mt-1.5 text-[16px] text-muted-2">
                {listing.serviceAreas.map((a) => a.municipality.name).join(' · ')}
              </p>
            </Plate>
          </section>
        ) : null}

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {isOwner ? null : (
            <SaveButton
              listingId={listing.id}
              initiallySaved={saved}
              signedIn={!!account}
              signInHref={`/signin?redirect=${encodeURIComponent(listingPath(listing.code, listing.slug))}`}
            />
          )}
          <ShareButton title={listing.title} />
        </div>

        <div className="mt-3 flex justify-center">
          <ReportLink
            listingId={listing.id}
            listingTitle={listing.title}
            trustclubId={listing.account.trustclubId}
            signedIn={!!account}
            signInHref={`/signin?redirect=${encodeURIComponent(listingPath(listing.code, listing.slug))}`}
          />
        </div>
      </main>
      </div>

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
          signInHref={`/signin?redirect=${encodeURIComponent(listingPath(listing.code, listing.slug))}`}
          editHref={`${listingPath(listing.code, listing.slug)}/edit`}
        />
      ) : null}

      <SiteFooter />
    </div>
  )
}

function PlayMark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor">
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  )
}
