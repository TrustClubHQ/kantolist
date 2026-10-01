'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { useT } from '@/components/LanguageProvider'

/**
 * Save a listing to come back to.
 *
 * Optimistic: the mark fills on the tap and goes back if the request fails.
 * Someone comparing three listings on a phone taps this between other things,
 * and a save that waits for a round trip over mobile data reads as a save that
 * did not happen.
 */
export function SaveButton({
  listingId,
  initiallySaved,
  signedIn,
  signInHref,
  className = '',
}: {
  listingId: string
  initiallySaved: boolean
  signedIn: boolean
  signInHref: string
  className?: string
}) {
  const t = useT()
  const router = useRouter()
  const [saved, setSaved] = useState(initiallySaved)
  const [busy, setBusy] = useState(false)

  async function toggle() {
    if (!signedIn) {
      router.push(signInHref)
      return
    }
    const next = !saved
    setSaved(next)
    setBusy(true)
    try {
      const res = await fetch(`/api/listings/${listingId}/save`, {
        method: next ? 'POST' : 'DELETE',
      })
      if (!res.ok) setSaved(!next)
    } catch {
      setSaved(!next)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      className={`label flex min-h-[44px] items-center gap-1.5 border-2 px-3 text-[16px] disabled:opacity-70 ${
        saved ? 'border-ink bg-yellow text-ink' : 'border-dim-edge text-muted hover:border-ink hover:text-red'
      } ${className}`}
    >
      <BookmarkMark filled={saved} />
      {saved ? t('save.saved') : t('save.action')}
    </button>
  )
}

function BookmarkMark({ filled }: { filled: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 3h12v18l-6-5-6 5z" />
    </svg>
  )
}
