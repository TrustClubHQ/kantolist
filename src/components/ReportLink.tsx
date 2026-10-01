'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

import { useT } from '@/components/LanguageProvider'

const REASONS = ['SCAM', 'PROHIBITED', 'DUPLICATE', 'WRONG_CATEGORY', 'SOLD_ALREADY', 'OTHER'] as const

/**
 * What to do about a bad listing — two different remedies, both offered.
 *
 * Deducting trust points in TrustClub is the one that propagates: a poster
 * nobody vouches for sinks in everyone's ranking, not just in a queue someone
 * has to work through. But staff still need to be able to take a listing down,
 * and the only way they hear about one is a report — so the queue that already
 * exists gets its way back in. The safety page promises both; now both are true.
 */
export function ReportLink({
  listingId,
  listingTitle,
  trustclubId,
  signedIn,
  signInHref,
}: {
  listingId: string
  listingTitle: string
  trustclubId: string
  signedIn: boolean
  signInHref: string
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<(typeof REASONS)[number] | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    if (!reason) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/listings/${listingId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, note }),
      })
      const data: { error?: string } = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? t('report.failed'))
        return
      }
      setDone(true)
    } catch {
      setError(t('report.offline'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="m-0 max-w-sm text-[13px] font-semibold leading-snug text-muted-2">
        {t('listing.reportHelp')}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <a
          href={`https://trustclub.app/profile/${encodeURIComponent(trustclubId)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="label flex min-h-[44px] items-center gap-1.5 border-2 border-dim-edge px-3 text-[16px] text-muted hover:border-ink hover:text-red"
        >
          <Image src="/TCLogo-IconOnly-StealthBlack-minpadding.png" alt="" width={14} height={14} aria-hidden />
          {t('listing.reportAction', { id: trustclubId })}
        </a>
        {signedIn ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="label flex min-h-[44px] items-center border-2 border-dim-edge px-3 text-[16px] text-muted hover:border-ink hover:text-red"
          >
            {t('report.link')}
          </button>
        ) : (
          <Link
            href={signInHref}
            className="label flex min-h-[44px] items-center border-2 border-dim-edge px-3 text-[16px] text-muted hover:border-ink hover:text-red"
          >
            {t('report.link')}
          </Link>
        )}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-[rgba(23,19,14,0.6)] sm:items-center sm:justify-center"
          role="dialog"
          aria-modal="true"
          aria-label={t('report.heading')}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div className="max-h-[90vh] w-full overflow-y-auto border-t-4 border-ink bg-ground text-left sm:max-w-md sm:border-4">
            <div className="border-b-4 border-ink bg-red px-5 py-3">
              <p className="font-display m-0 text-[22px] uppercase leading-tight text-ground">
                {t('report.heading')}
              </p>
              <p className="label m-0 mt-0.5 text-[15px] text-[#FFD9A0]">
                {t('report.about', { title: listingTitle })}
              </p>
            </div>

            {done ? (
              <div className="flex flex-col gap-3 p-5">
                <p className="label m-0 border-[3px] border-ink bg-green px-3 py-2.5 text-[17px] text-ground">
                  {t('report.sent')}
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="label min-h-[50px] w-full border-[3px] border-ink bg-dim text-[18px] text-muted-2"
                >
                  {t('contact.close')}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 p-5">
                <span className="label text-[16px] text-muted">{t('report.reason')}</span>
                <div className="flex flex-col gap-1.5">
                  {REASONS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setReason(key)}
                      aria-pressed={reason === key}
                      className={`label min-h-[48px] border-[2.5px] border-ink px-3 text-left text-[17px] ${
                        reason === key ? 'bg-yellow' : 'bg-panel'
                      }`}
                    >
                      {t(`report.reason.${key}`)}
                    </button>
                  ))}
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="label text-[15px] text-muted">{t('report.note')}</span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={500}
                    rows={3}
                  />
                </label>
                {error ? (
                  <p className="label m-0 border-2 border-ink bg-yellow px-3 py-2 text-[16px] text-ink">
                    {error}
                  </p>
                ) : null}
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="label min-h-[50px] w-[110px] border-[3px] border-ink bg-panel text-[17px]"
                  >
                    {t('report.cancel')}
                  </button>
                  <button
                    type="button"
                    disabled={!reason || busy}
                    onClick={send}
                    className="font-display hard min-h-[50px] flex-1 border-[3px] border-ink bg-red text-[19px] uppercase text-ground disabled:opacity-60"
                  >
                    {busy ? t('report.sending') : t('report.send')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
