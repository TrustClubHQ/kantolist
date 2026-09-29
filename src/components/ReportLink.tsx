'use client'

import Image from 'next/image'

import { useT } from '@/components/LanguageProvider'

/**
 * What to do about a bad listing.
 *
 * Reporting used to open a reason picker and file a row for staff. The signal
 * that actually decides what people see here is trust, and trust lives in
 * TrustClub — so deducting trust points from the poster is both the real
 * remedy and the one that propagates: a poster nobody vouches for sinks in
 * everyone's ranking, not just in a queue someone has to work through.
 *
 * No sign-in needed on our side; the action happens in TrustClub, which does
 * its own.
 */
export function ReportLink({ trustclubId }: { trustclubId: string }) {
  const t = useT()

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
