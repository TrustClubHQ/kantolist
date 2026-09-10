import Link from 'next/link'
import Image from 'next/image'
import type { ListingStatus, ListingType, PriceUnit } from '@prisma/client'
import { Badge, Price } from '@/components/ui'
import { TrustPoints } from '@/components/TrustPoints'
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
  isOwn?: boolean
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
          <Photo src={listing.image} alt="" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-3 py-2.5">
          <Price size="sm">{formatPrice(listing.price, listing.priceUnit)}</Price>
          <span className="label text-[17px]">{listing.title}</span>
          <div className="flex flex-wrap items-center gap-2">
            <TrustPoints points={listing.trustPoints} via={listing.via} isOwn={listing.isOwn} />
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
        <Photo src={listing.image} alt="" />
        <Badge tone={reserved ? 'ink' : 'yellow'} className="absolute left-2 top-2">
          {badgeText}
        </Badge>
      </div>
      <div className="flex flex-col gap-1.5 px-3 pb-3 pt-2.5">
        <Price size="sm">
          {formatPrice(listing.price, listing.priceUnit)}
          {listing.negotiable ? (
            <span className="font-cond ml-1 text-[14px] font-semibold text-muted-2">negotiable</span>
          ) : null}
        </Price>
        <span className="label line-clamp-2 min-h-[38px] text-[17px]">{listing.title}</span>
        <TrustPoints points={listing.trustPoints} via={listing.via} isOwn={listing.isOwn} />
        <span className="label text-[14px] font-semibold text-muted">
          {listing.municipality} · {timeAgo(listing.postedAt)}
        </span>
      </div>
    </Link>
  )
}

/** A listing with no photo shows a drawn placeholder, never a broken image. */
function Photo({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-dim">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B8AC92" strokeWidth="1.8" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="1" />
          <circle cx="9" cy="10" r="1.6" />
          <path d="M21 16l-5-5-8 8" />
        </svg>
      </div>
    )
  }
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
