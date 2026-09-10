import Image from 'next/image'
import { formatTrustPoints, trustState, TRUST_STATE_TEXT } from '@/lib/trust-format'

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
  const state = isOwn ? 'self' : trustState(points)
  const icon = direction === 'incoming' ? '/indirect_trust_incoming.png' : '/indirect_trust_outgoing.png'
  const px = size === 'md' ? 14 : 12

  if (state === 'none' || state === 'unknown') {
    return (
      <span className="label inline-flex items-center gap-1.5 border-2 border-dim-edge bg-dim px-2 py-0.5 text-[13px] text-muted">
        {TRUST_STATE_TEXT[state]}
      </span>
    )
  }

  if (state === 'self') {
    return (
      <span className="label inline-flex items-center gap-1.5 border-2 border-ink bg-yellow px-2 py-0.5 text-[13px] text-ink">
        {TRUST_STATE_TEXT.self}
      </span>
    )
  }

  return (
    <span className="label inline-flex items-center gap-1.5 border-2 border-ink bg-green px-2 py-0.5 text-[13px] text-ground">
      <Image src={icon} alt="" width={px} height={px} className="shrink-0 opacity-80 invert" aria-hidden />
      <span className="flex items-baseline gap-0.5">
        <span className="text-[15px]">{formatTrustPoints(points)}</span>
        <span className="text-[11px] opacity-80">TP</span>
      </span>
      {via ? <span className="opacity-80">· via @{via}</span> : null}
    </span>
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
  const state = isOwn ? 'self' : trustState(points)

  if (state === 'unknown') {
    return (
      <div className="border-[3px] border-dim-edge bg-dim px-3 py-3">
        <p className="label m-0 text-[19px] text-muted">Trust unknown</p>
        <p className="m-0 mt-1 text-[13px] font-semibold leading-snug text-muted-2">
          We could not reach TrustClub to check your connection to this member. Try again shortly.
        </p>
      </div>
    )
  }

  if (state === 'none') {
    return (
      <div className="border-[3px] border-dim-edge bg-dim px-3 py-3">
        <p className="label m-0 text-[19px] text-muted-2">No trust path yet</p>
        <p className="m-0 mt-1 text-[13px] font-semibold leading-snug text-muted-2">
          Nobody you trust on TrustClub has vouched for this member. That does not make them a bad
          seller — it means you have no way to check. Be extra careful about deposits.
        </p>
      </div>
    )
  }

  if (state === 'self') {
    return (
      <div className="border-[3px] border-ink bg-yellow px-3 py-3">
        <p className="label m-0 text-[19px] text-ink">This is your listing</p>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5 border-[3px] border-ink bg-green px-3 py-3">
      <Image
        src="/indirect_trust_incoming.png"
        alt=""
        width={19}
        height={19}
        className="mt-0.5 shrink-0 invert"
        aria-hidden
      />
      <div className="flex flex-col gap-1">
        <p className="font-display m-0 text-[21px] uppercase text-ground">
          {formatTrustPoints(points)} trust points to you
        </p>
        <p className="m-0 text-[13px] font-semibold leading-snug text-green-soft">
          {via ? (
            <>
              Through <strong className="text-yellow">@{via}</strong>, whom you trust directly.
            </>
          ) : (
            <>How strongly the people you trust on TrustClub vouch for this member.</>
          )}
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
      className={`inline-flex items-center gap-1.5 text-muted hover:text-red ${className}`}
    >
      <Image src="/TCLogo-IconOnly-StealthBlack-minpadding.png" alt="TrustClub" width={13} height={13} />
      <span className="label text-[15px]">@{trustclubId}</span>
    </a>
  )
}
