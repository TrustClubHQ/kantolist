'use client'

import { useState } from 'react'
import Link from 'next/link'

import { useT } from '@/components/LanguageProvider'

/**
 * The only call to action in the product.
 *
 * Tapping a channel posts to the API first, which records that a contact
 * happened and returns the link to open. The link is never built client-side:
 * that keeps the phone number off the page for anonymous visitors, so a
 * scraper cannot harvest numbers by walking every listing.
 */

const CHANNEL_ORDER = ['PHONE', 'SMS', 'MESSENGER', 'VIBER']

export function ContactSheet({
  listingId,
  listingTitle,
  sellerName,
  channels,
  maskedPhone,
  signedIn,
  isOwner,
  signInHref,
  editHref,
}: {
  listingId: string
  listingTitle: string
  sellerName: string
  sellerTrustclubId: string
  channels: string[]
  maskedPhone: string | null
  signedIn: boolean
  isOwner: boolean
  /** So "Manage this listing" lands on the tab that actually holds it. */
  /** Sign in and come back to this listing, not to the home page. */
  signInHref: string
  /** The owner's edit screen for this listing. */
  editHref: string
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Signed out, Call and Text are the same locked row twice — the same masked
  // number, the same link, nothing to tell them apart. One row says it once.
  const available = CHANNEL_ORDER.filter((c) => channels.includes(c))
  const ordered = signedIn
    ? available
    : available.filter((c) => c !== 'SMS' || !available.includes('PHONE'))
  const firstName = sellerName.split(' ')[0]

  async function openChannel(channel: string) {
    setBusy(channel)
    setError(null)
    try {
      const res = await fetch(`/api/listings/${listingId}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      })
      const data: { target?: string; error?: string; signInRequired?: boolean } = await res.json()
      if (!res.ok || !data.target) {
        setError(data.error ?? t('contact.failed'))
        return
      }
      window.location.href = data.target
    } catch {
      setError(t('contact.offline'))
    } finally {
      setBusy(null)
    }
  }

  if (isOwner) {
    return (
      <div className="sticky bottom-0 border-t-4 border-ink bg-ground px-4 py-3">
        <div className="mx-auto flex max-w-3xl gap-2.5">
          {/* Edit is the only action worth a sticky bar here. The list with the
              status buttons is one tap away in the header, and sending an owner
              to it to find the listing they are already looking at was a
              detour. */}
          <Link
            href={`${editHref}`}
            className="font-display hard flex min-h-[54px] flex-1 items-center justify-center border-[3px] border-ink bg-yellow text-[21px] uppercase text-ink hover:text-ink"
          >
            {t('contact.owner.edit')}
          </Link>
        </div>
      </div>
    )
  }

  /**
   * Posting now requires a number or a Messenger handle, but a seller can
   * still clear their profile afterwards, and listings from before the rule
   * exist. Rather than a call-to-action that opens an empty sheet, say the
   * plain thing: there is no way to reach this person right now.
   */
  if (ordered.length === 0) {
    return (
      <div className="sticky bottom-0 z-10 border-t-4 border-ink bg-ground px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <p className="label m-0 flex min-h-[54px] items-center justify-center border-[3px] border-dim-edge bg-dim px-3 text-center text-[17px] text-muted-2">
            {t('contact.none')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="sticky bottom-0 z-10 border-t-4 border-ink bg-ground px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="font-display hard flex min-h-[54px] w-full items-center justify-center gap-2 border-[3px] border-ink bg-red text-[21px] uppercase text-ground"
          >
            <PhoneIcon />
            {t('contact.button', { name: firstName })}
          </button>
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-[rgba(23,19,14,0.6)]"
          role="dialog"
          aria-modal="true"
          aria-label={t('contact.heading', { name: sellerName })}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div className="max-h-[90vh] overflow-y-auto border-t-4 border-ink bg-ground">
            <div className="border-b-4 border-ink bg-red px-5 py-4 text-center">
              <p className="font-display m-0 text-[25px] uppercase leading-tight text-ground">
                {t('contact.heading', { name: sellerName })}
              </p>
              <p className="label m-0 mt-1 text-[16px] text-[#FFD9A0]">
                {t('contact.about', { title: listingTitle })}
              </p>
            </div>

            <div className="mx-auto flex max-w-3xl flex-col gap-2.5 px-5 pb-3 pt-4">
              <p className="label m-0 text-center text-[16px] tracking-wide text-muted">
                {t('contact.choose')}
              </p>

              {ordered.map((channel) => {
                const needsAuth = (channel === 'PHONE' || channel === 'SMS') && !signedIn
                if (needsAuth) {
                  return (
                    <Link
                      key={channel}
                      href={signInHref}
                      className="hard flex min-h-[54px] items-center justify-center gap-2 border-[3px] border-dim-edge bg-dim text-ink hover:text-ink"
                    >
                      <span className="label text-[19px] text-muted-2">
                        {t('contact.logInToSee', {
                          phone: maskedPhone ?? t('contact.phoneHidden'),
                        })}
                      </span>
                    </Link>
                  )
                }
                return (
                  <button
                    key={channel}
                    type="button"
                    disabled={busy !== null}
                    onClick={() => openChannel(channel)}
                    className={`hard flex min-h-[54px] items-center justify-center gap-2.5 border-[3px] border-ink disabled:opacity-60 ${
                      channel === 'PHONE' ? 'bg-green text-ground' : 'bg-panel text-ink'
                    }`}
                  >
                    <span className={channel === 'PHONE' ? 'font-display text-[20px] uppercase' : 'label text-[20px]'}>
                      {busy === channel ? t('contact.opening') : t(`contact.channel.${channel}`)}
                    </span>
                  </button>
                )
              })}

              {error ? (
                <p className="label m-0 border-2 border-ink bg-yellow px-3 py-2 text-center text-[16px] text-ink">
                  {error}
                </p>
              ) : null}

            </div>

            <div className="mx-auto max-w-3xl px-5 pb-6 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="label min-h-[50px] w-full border-[3px] border-ink bg-dim text-[19px] text-muted-2"
              >
                {t('contact.close')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.5 5.5c0 7.7 6.3 14 14 14l2-2.8-3.7-2.5-2.2 2a15 15 0 0 1-6.8-6.8l2-2.2L7.3 3.5z" />
    </svg>
  )
}
