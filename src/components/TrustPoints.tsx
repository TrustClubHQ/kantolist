'use client'

import Image from 'next/image'
import { formatTrustPoints, trustState, trustStateText } from '@/lib/trust-format'
import { useT } from '@/components/LanguageProvider'

/**
 * The trust badge — the single most important label in the product, since it
 * carries the whole premise.
 *
 * The symbols are TruRate's: `indirect_trust_incoming.png` is trust flowing
 * TOWARD you (what the poster's network gives you) and `indirect_trust_outgoing.png`
 * is trust you extend outward. Reusing them means a member who uses both
 * products reads the same icon the same way.
 *
 * Three states are genuinely different and never collapsed:
 *   some     — a number, with the first hop when we know it
 *   none     — the graph has no path; shown plainly, ranked lower, never faked as 0
 *   unknown  — the lookup failed; we say so rather than invent a number
 */
export function TrustPoints({
  points,
  via,
  isOwn = false,
  direction = 'incoming',
  size = 'sm',
}: {
  points: number | null | undefined
  via?: string | null
  /** Set when the viewer owns the listing. Preferred over an Infinity value,
      which cannot survive JSON serialisation. */
  isOwn?: boolean
  direction?: 'incoming' | 'outgoing'
  size?: 'sm' | 'md'
}) {
  const t = useT()
  const state = isOwn ? 'self' : trustState(points)
  const icon = direction === 'incoming' ? '/indirect_trust_incoming.png' : '/indirect_trust_outgoing.png'
  const px = size === 'md' ? 14 : 12

  if (state === 'none' || state === 'unknown') {
    return (
      <span className="label inline-flex w-fit self-start items-center gap-1.5 border-2 border-dim-edge bg-dim px-2 py-0.5 text-[13px] text-muted">
        {trustStateText(state, t)}
      </span>
    )
  }

  if (state === 'self') {
    return (
      <span className="label inline-flex w-fit self-start items-center gap-1.5 border-2 border-ink bg-yellow px-2 py-0.5 text-[13px] text-ink">
        {trustStateText('self', t)}
      </span>
    )
  }

  return (
    <span className="label inline-flex w-fit self-start items-center gap-1.5 border-2 border-ink bg-green px-2 py-0.5 text-[13px] text-ground">
      <Image src={icon} alt="" width={px} height={px} className="shrink-0 opacity-80 invert" aria-hidden />
      <span className="flex items-baseline gap-0.5">
        <span className="text-[15px]">{formatTrustPoints(points)}</span>
        <span className="text-[11px] opacity-80">TP</span>
      </span>
      {via ? <span className="opacity-80">{t('trust.via', { via })}</span> : null}
    </span>
  )
}

/**
 * Both directions, the way TruRate shows a lender: what this member is worth
 * to you, and what you are worth to them. Trust is directed, so these are two
 * different numbers about two different questions — "can I rely on them" and
 * "will they take me seriously" — and showing only the first hides half of
 * why a deal does or does not happen.
 */
export function TrustPointsPair({
  myTrustInThem,
  theirTrustInMe,
  via,
  isOwn = false,
  sellerName,
}: {
  /** getTrustPoints(viewer → poster): how strongly YOUR network vouches for
   *  them. This is the number that decides whether to deal with them, so it
   *  is the headline. */
  myTrustInThem: number | null | undefined
  /** getTrustPoints(poster → viewer): what they see when they look YOU up. */
  theirTrustInMe: number | null | undefined
  via?: string | null
  isOwn?: boolean
  sellerName: string
}) {
  const t = useT()
  if (isOwn) return <TrustPointsPanel points={null} isOwn />

  // Named for their direction rather than "theirs" and "mine", which is how
  // these two ended up swapped: the green panel was labelled "to you" while
  // holding the viewer's trust in the poster, and the row beneath it claimed
  // to be the viewer's outgoing trust while holding the incoming figure.
  return (
    <div className="flex flex-col gap-2">
      <TrustPointsPanel points={myTrustInThem} via={via} />
      <TrustRow
        direction="incoming"
        points={theirTrustInMe}
        label={t('trust.theirs')}
        detail={t('trust.theirs.help', { name: sellerName })}
      />
    </div>
  )
}

/** One compact directed row: an icon, a number, and what it answers. */
function TrustRow({
  direction,
  points,
  label,
  detail,
}: {
  direction: 'incoming' | 'outgoing'
  points: number | null | undefined
  label: string
  detail: string
}) {
  const t = useT()
  const state = trustState(points)
  const icon = direction === 'incoming' ? '/indirect_trust_incoming.png' : '/indirect_trust_outgoing.png'

  return (
    <div className="flex items-center gap-2.5 border-[3px] border-dim-edge bg-panel px-3 py-2.5">
      <Image src={icon} alt="" width={16} height={16} className="shrink-0 opacity-70" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="label text-[15px] text-muted">{label}</span>
        <span className="text-[12px] font-semibold leading-snug text-muted-2">{detail}</span>
      </div>
      <span className="label shrink-0 text-[18px] text-ink">
        {state === 'some' ? (
          <>
            {formatTrustPoints(points)}
            <span className="ml-1 text-[12px] text-muted">TP</span>
          </>
        ) : (
          // Never 0 for a lookup that failed — "n/a" says we do not know.
          <span className="text-[15px] text-muted">
            {state === 'unknown' ? t('trust.na') : t('trust.zero')}
          </span>
        )}
      </span>
    </div>
  )
}

/**
 * The expanded form on a listing page, where there is room to say what the
 * number means instead of leaving "TP" as jargon.
 */
export function TrustPointsPanel({
  points,
  via,
  isOwn = false,
}: {
  points: number | null | undefined
  via?: string | null
  isOwn?: boolean
}) {
  const t = useT()
  const state = isOwn ? 'self' : trustState(points)

  if (state === 'unknown') {
    return (
      <div className="border-[3px] border-dim-edge bg-dim px-3 py-3">
        <p className="label m-0 text-[19px] text-muted">{t('trust.unknown')}</p>
        <p className="m-0 mt-1 text-[13px] font-semibold leading-snug text-muted-2">
          {t('trust.unknown.help')}
        </p>
      </div>
    )
  }

  if (state === 'none') {
    return (
      <div className="border-[3px] border-dim-edge bg-dim px-3 py-3">
        <p className="label m-0 text-[19px] text-muted-2">{t('trust.none.title')}</p>
        <p className="m-0 mt-1 text-[13px] font-semibold leading-snug text-muted-2">
          {t('trust.none.help')}
        </p>
      </div>
    )
  }

  if (state === 'self') {
    return (
      <div className="border-[3px] border-ink bg-yellow px-3 py-3">
        <p className="label m-0 text-[19px] text-ink">{t('trust.self.title')}</p>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5 border-[3px] border-ink bg-green px-3 py-3">
      {/* Outgoing: this is trust flowing from the viewer toward the poster. */}
      <Image
        src="/indirect_trust_outgoing.png"
        alt=""
        width={19}
        height={19}
        className="mt-0.5 shrink-0 invert"
        aria-hidden
      />
      <div className="flex flex-col gap-1">
        <p className="font-display m-0 text-[21px] uppercase text-ground">
          {t('trust.you', { points: formatTrustPoints(points) })}
        </p>
        <p className="m-0 text-[13px] font-semibold leading-snug text-green-soft">
          {via ? t('trust.you.via', { via }) : t('trust.you.help')}
        </p>
      </div>
    </div>
  )
}

/** The @handle link out to the member's TrustClub profile. */
export function TrustClubLink({ trustclubId, className = '' }: { trustclubId: string; className?: string }) {
  return (
    <a
      href={`https://trustclub.app/profile/${encodeURIComponent(trustclubId)}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-[40px] items-center gap-1.5 text-muted hover:text-red ${className}`}
    >
      <Image src="/TCLogo-IconOnly-StealthBlack-minpadding.png" alt="TrustClub" width={13} height={13} />
      <span className="label text-[15px]">@{trustclubId}</span>
    </a>
  )
}
