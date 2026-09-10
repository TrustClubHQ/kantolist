'use client'

import { useState } from 'react'
import Link from 'next/link'

const REASONS: { key: string; label: string }[] = [
  { key: 'SCAM', label: 'Looks like a scam' },
  { key: 'PROHIBITED', label: 'Prohibited item' },
  { key: 'SOLD_ALREADY', label: 'Already sold' },
  { key: 'WRONG_CATEGORY', label: 'Wrong category' },
  { key: 'DUPLICATE', label: 'Duplicate listing' },
  { key: 'OTHER', label: 'Something else' },
]

export function ReportLink({ listingId, signedIn }: { listingId: string; signedIn: boolean }) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!signedIn) {
    return (
      <Link href="/signin" className="label text-[16px] text-muted hover:text-red">
        Log in to report this listing
      </Link>
    )
  }

  if (done) {
    return <span className="label text-[16px] text-green">Reported — staff will take a look</span>
  }

  async function send(reason: string) {
    setBusy(true)
    try {
      await fetch(`/api/listings/${listingId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      setDone(true)
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" onClick={() => setOpen((o) => !o)} className="label text-[16px] text-muted hover:text-red">
        Report this listing
      </button>
      {open ? (
        <div className="hard flex flex-wrap justify-center gap-1.5 border-[3px] border-ink bg-panel p-3">
          {REASONS.map((r) => (
            <button
              key={r.key}
              type="button"
              disabled={busy}
              onClick={() => send(r.key)}
              className="label border-[2.5px] border-ink bg-ground px-2.5 py-1 text-[15px] disabled:opacity-60"
            >
              {r.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
