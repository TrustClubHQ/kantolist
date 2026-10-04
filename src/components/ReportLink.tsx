import Image from 'next/image'

import { getT } from '@/lib/i18n-server'

/**
 * What to do about a bad listing.
 *
 * One remedy, not two. There was a "Report to staff" button beside this that
 * opened a sheet and filed a row in the reports table — a table with no
 * reader. `isStaff` defaults to false and nothing in the product ever sets it,
 * so /admin/reports turns every account away and the queue grows unread.
 * Inviting a report nobody will see spends a member's goodwill on a dead end
 * and leaves them believing something is being done about it.
 *
 * Deducting trust points in TrustClub is the remedy that works, and it is the
 * stronger one anyway: it propagates. A poster nobody vouches for sinks in
 * everyone's ranking rather than waiting on someone to work a queue.
 *
 * The sheet and POST /api/listings/[id]/report are in git, one revert away,
 * for the day a staff account exists.
 */
export async function ReportLink({ trustclubId }: { trustclubId: string }) {
  const t = await getT()

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="m-0 max-w-sm text-[13px] font-semibold leading-snug text-muted-2">
        {t('listing.reportHelp')}
      </p>
      <a
        href={`https://trustclub.app/profile/${encodeURIComponent(trustclubId)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="label flex min-h-[44px] items-center gap-1.5 border-2 border-dim-edge px-3 text-[16px] text-muted hover:border-ink hover:text-red"
      >
        <Image src="/TCLogo-IconOnly-StealthBlack-minpadding.png" alt="" width={14} height={14} aria-hidden />
        {t('listing.reportAction', { id: trustclubId })}
      </a>
    </div>
  )
}
