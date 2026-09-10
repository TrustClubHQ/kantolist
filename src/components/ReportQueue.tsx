'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ListingStatus, ReportReason, ReportStatus } from '@prisma/client'
import { Plate, EmptyState } from '@/components/ui'
import { timeAgo } from '@/lib/format'

interface ReportRow {
  id: string
  reason: ReportReason
  note: string | null
  createdAt: string
  reporter: string | null
  listing: { title: string; href: string; status: ListingStatus; seller: string }
}

const REASON_LABEL: Record<ReportReason, string> = {
  SCAM: 'Looks like a scam',
  PROHIBITED: 'Prohibited item',
  DUPLICATE: 'Duplicate listing',
  WRONG_CATEGORY: 'Wrong category',
  SOLD_ALREADY: 'Already sold',
  OTHER: 'Something else',
}

const TABS: ReportStatus[] = ['OPEN', 'ACTIONED', 'DISMISSED']

export function ReportQueue({ reports, status }: { reports: ReportRow[]; status: ReportStatus }) {
  const [rows, setRows] = useState(reports)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function resolve(id: string, action: 'remove' | 'dismiss') {
    setBusy(id)
    setError(null)
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}))
        setError(data.error ?? 'Could not resolve that report')
        return
      }
      setRows((current) => current.filter((r) => r.id !== id))
    } catch {
      setError('Could not reach the server. Try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-5">
      <h1 className="font-display m-0 text-[30px] uppercase leading-none">Reports</h1>

      <div className="my-4 flex gap-1.5">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/admin/reports?status=${t}`}
            className={`label flex-1 border-[2.5px] border-ink py-2 text-center text-[16px] ${
              status === t ? 'bg-ink text-ground' : 'bg-panel text-ink'
            }`}
          >
            {t}
          </Link>
        ))}
      </div>

      {error ? (
        <p className="label m-0 mb-3 border-[3px] border-ink bg-yellow px-3.5 py-2.5 text-[17px] text-ink">
          {error}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState title="Queue is clear">Nothing waiting in this tab.</EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <Plate key={r.id} className="flex flex-col gap-2.5 p-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="label border-2 border-ink bg-yellow px-2 py-0.5 text-[14px] text-ink">
                  {REASON_LABEL[r.reason]}
                </span>
                <span className="label text-[15px] font-semibold text-muted">
                  {r.reporter ? `@${r.reporter}` : 'anonymous'} · {timeAgo(r.createdAt)}
                </span>
              </div>

              <Link href={r.listing.href} className="label text-[19px] leading-tight text-ink hover:text-red">
                {r.listing.title}
              </Link>
              <p className="label m-0 text-[15px] font-semibold text-muted">
                Seller: {r.listing.seller} · listing is {r.listing.status}
              </p>

              {r.note ? (
                <p className="m-0 border-l-4 border-dim-edge pl-3 text-[14px] leading-snug text-body">{r.note}</p>
              ) : null}

              {status === 'OPEN' ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={busy === r.id}
                    onClick={() => resolve(r.id, 'remove')}
                    className="label border-[2.5px] border-ink bg-red px-3 py-1.5 text-[16px] text-ground disabled:opacity-60"
                  >
                    Remove listing
                  </button>
                  <button
                    type="button"
                    disabled={busy === r.id}
                    onClick={() => resolve(r.id, 'dismiss')}
                    className="label border-[2.5px] border-ink bg-ground px-3 py-1.5 text-[16px] disabled:opacity-60"
                  >
                    Dismiss
                  </button>
                </div>
              ) : null}
            </Plate>
          ))}
        </div>
      )}
    </main>
  )
}
