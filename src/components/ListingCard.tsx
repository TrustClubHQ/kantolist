import Link from 'next/link'
import Image from 'next/image'
import type { ListingStatus, ListingType, PriceUnit } from '@prisma/client'
import { Badge, Price } from '@/components/ui'
import { TrustPoints } from '@/components/TrustPoints'
import { CategoryMark } from '@/components/CategoryMark'
import { formatPrice, LISTING_TYPE_LABEL } from '@/lib/listing'
import { timeAgo } from '@/lib/format'

export interface ListingCardData {
  href: string
  title: string
  type: ListingType
  status: ListingStatus
  price: number | null
  priceUnit: PriceUnit | null
  negotiable?: boolean
  image: string | null
  municipality: string
  postedAt: Date | string
  trustPoints: number | null
  via?: string | null
  categorySlug: string
  parentSlug?: string | null
  isOwn?: boolean
  /** No viewer means no trust path to measure, so the badge is omitted. */
  signedIn?: boolean
}

/**
 * The listing plate. Photo, price, title, trust, place, age — in that order,
 * because that is the order a buyer scanning a list actually reads them.
 */
export function ListingCard({ listing, layout = 'grid' }: { listing: ListingCardData; layout?: 'grid' | 'row' }) {
  const reserved = listing.status === 'RESERVED'
  const badgeText = reserved ? 'Reserved' : LISTING_TYPE_LABEL[listing.type]

  if (layout === 'row') {
    return (
      <Link href={listing.href} className="hard flex border-[3px] border-ink bg-panel text-ink hover:text-ink">
        <div className="relative w-[116px] shrink-0 overflow-hidden border-r-[3px] border-ink">
          <Photo src={listing.image} alt="" categorySlug={listing.categorySlug} parentSlug={listing.parentSlug} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-3 py-2.5">
          <Price size="sm">{formatPrice(listing.price, listing.priceUnit)}</Price>
          <span className="label text-[17px]">{listing.title}</span>
          <div className="flex flex-wrap items-center gap-2">
            {listing.signedIn ? (
          <TrustPoints points={listing.trustPoints} via={listing.via} isOwn={listing.isOwn} />
        ) : null}
            <span className="label text-[14px] font-semibold text-muted">
              {listing.municipality} · {timeAgo(listing.postedAt)}
            </span>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link href={listing.href} className="hard flex flex-col overflow-hidden border-[3px] border-ink bg-panel text-ink hover:text-ink">
      <div className="relative h-[150px] overflow-hidden border-b-[3px] border-ink">
        <Photo src={listing.image} alt="" categorySlug={listing.categorySlug} parentSlug={listing.parentSlug} />
        <Badge tone={reserved ? 'ink' : 'yellow'} className="absolute left-2 top-2">
          {badgeText}
        </Badge>
      </div>
      <div className="flex flex-col gap-1.5 px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3 sm:pt-2.5">
        {/* Two items, not one string: the amount and its unit are bound by
            non-breaking spaces, so "negotiable" needs its own wrap opportunity
            or the whole line is one unbreakable token and clips on a phone. */}
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <Price size="sm">{formatPrice(listing.price, listing.priceUnit)}</Price>
          {listing.negotiable ? (
            // "neg." on a phone — the long form pushed itself onto its own
            // line on most cards, and it is how a PH classified writes it.
            <span className="font-cond text-[13px] font-semibold text-muted-2 sm:text-[14px]">
              <span className="sm:hidden">neg.</span>
              <span className="hidden sm:inline">negotiable</span>
            </span>
          ) : null}
        </div>
        {/* 16px on a phone: the grid column is ~170px, and 17px clipped most
            titles mid-word inside two lines. */}
        <span className="label line-clamp-2 min-h-[36px] text-[16px] sm:min-h-[38px] sm:text-[17px]">
          {listing.title}
        </span>
        {listing.signedIn ? (
          <TrustPoints points={listing.trustPoints} via={listing.via} isOwn={listing.isOwn} />
        ) : null}
        <span className="label text-[14px] font-semibold text-muted">
          {listing.municipality} · {timeAgo(listing.postedAt)}
        </span>
      </div>
    </Link>
  )
}

/**
 * A listing with no photo gets its category's mark, not a broken-image icon —
 * most sellers post without a photo, so this is a normal state, not a failure.
 */
function Photo({
  src,
  alt,
  categorySlug,
  parentSlug,
}: {
  src: string | null
  alt: string
  categorySlug: string
  parentSlug?: string | null
}) {
  if (!src) return <CategoryMark categorySlug={categorySlug} parentSlug={parentSlug} size={44} />
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 640px) 50vw, 300px"
      className="object-cover"
      unoptimized={src.startsWith('/uploads')}
    />
  )
}
