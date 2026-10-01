'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ListingStatus } from '@prisma/client'

import { Plate, PlateHeader } from '@/components/ui'
import { useT } from '@/components/LanguageProvider'

/**
 * Reserve, close, re-open, delete — on the edit screen.
 *
 * These used to live only on My listings, so an owner who came to the edit
 * screen to mark something sold had to leave it, find the listing in a list of
 * their own listings, and act there. The edit screen is where an owner already
 * is when they want to change something about a listing.
 */
export function ListingOwnerActions({
  listingId,
  status,
  listingsHref,
}: {
  listingId: string
  status: ListingStatus
  /** Where to go once the listing no longer exists. */
  listingsHref: string
}) {
  const t = useT()
  const router = useRouter()
  const [current, setCurrent] = useState<ListingStatus>(status)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function setStatus(next: ListingStatus) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/listings/${listingId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      const data: { status?: ListingStatus; error?: string } = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? t('mine.failed'))
        return
      }
      setCurrent(data.status ?? next)
      router.refresh()
    } catch {
      setError(t('mine.offline'))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/listings/${listingId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}))
        setError(data.error ?? t('mine.deleteFailed'))
        return
      }
      router.push(listingsHref)
      router.refresh()
    } catch {
      setError(t('mine.offline'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-32">
      <Plate>
        <PlateHeader>{t('mine.status.' + current)}</PlateHeader>
        <div className="flex flex-col gap-3 p-3.5">
          <div className="flex flex-wrap gap-2">
            {current === 'ACTIVE' ? (
              <>
                <Action busy={busy} onClick={() => setStatus('RESERVED')}>
                  {t('mine.markReserved')}
                </Action>
                <Action busy={busy} onClick={() => setStatus('CLOSED')}>
                  {t('mine.markSold')}
                </Action>
              </>
            ) : null}
            {current === 'RESERVED' ? (
              <>
                <Action busy={busy} onClick={() => setStatus('ACTIVE')}>
                  {t('mine.backToActive')}
                </Action>
                <Action busy={busy} onClick={() => setStatus('CLOSED')}>
                  {t('mine.markSold')}
                </Action>
              </>
            ) : null}
            {current === 'CLOSED' || current === 'EXPIRED' ? (
              <Action busy={busy} onClick={() => setStatus('ACTIVE')}>
                {t('mine.reopen')}
              </Action>
            ) : null}
            <Action busy={busy} onClick={() => setConfirming(true)}>
              {t('mine.delete')}
            </Action>
          </div>

          {confirming ? (
            <div className="flex flex-col gap-2 border-[3px] border-ink bg-yellow px-3 py-2.5">
              <p className="label m-0 text-[17px] text-ink">{t('mine.deleteConfirm')}</p>
              <p className="m-0 text-[13px] font-semibold leading-snug text-ink">{t('mine.deleteHelp')}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={remove}
                  className="label min-h-[44px] flex-1 border-[2.5px] border-ink bg-red text-[16px] text-ground disabled:opacity-60"
                >
                  {t('mine.deleteYes')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="label min-h-[44px] flex-1 border-[2.5px] border-ink bg-ground text-[16px]"
                >
                  {t('mine.deleteNo')}
                </button>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="label m-0 border-[3px] border-ink bg-yellow px-3 py-2 text-[16px] text-ink">
              {error}
            </p>
          ) : null}
        </div>
      </Plate>
    </div>
  )
}

function Action({
  children,
  busy,
  onClick,
}: {
  children: React.ReactNode
  busy: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="label flex min-h-[44px] items-center justify-center border-[2.5px] border-ink bg-ground px-3 text-[16px] disabled:opacity-60"
    >
      {children}
    </button>
  )
}
