'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ListingStatus, ListingType, PriceUnit } from '@prisma/client'
import { Plate, EmptyState } from '@/components/ui'
import { formatPrice } from '@/lib/listing'
import { timeAgo } from '@/lib/format'

interface Row {
  id: string
  href: string
  title: string
  status: ListingStatus
  type: ListingType
  price: number | null
  priceUnit: PriceUnit | null
  image: string | null
  postedAt: string
  expiresAt: string
  viewCount: number
  contactCount: number
}

const TABS: { key: ListingStatus | 'ALL'; label: string }[] = [
  { key: 'ACTIVE', label: 'Active' },
  { key: 'RESERVED', label: 'Reserved' },
  { key: 'CLOSED', label: 'Closed' },
  { key: 'ALL', label: 'All' },
]

export function MyListings({ listings }: { listings: Row[] }) {
  const [tab, setTab] = useState<ListingStatus | 'ALL'>('ACTIVE')
  const [rows, setRows] = useState(listings)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const visible = tab === 'ALL' ? rows : rows.filter((r) => r.status === tab)

  async function act(id: string, body: { status?: ListingStatus; bump?: boolean }) {
    setBusy(id)
    setError(null)
    try {
      const res = await fetch(`/api/listings/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data: { status?: ListingStatus; postedAt?: string; error?: string } = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not update that listing')
        return
      }
      setRows((current) =>
        current.map((r) =>
          r.id === id
            ? { ...r, status: data.status ?? r.status, postedAt: data.postedAt ?? r.postedAt }
            : r,
        ),
      )
    } catch {
      setError('Could not reach the server. Try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display m-0 text-[30px] uppercase leading-none">My listings</h1>
        <Link
          href="/post"
          className="label hard-sm border-[3px] border-ink bg-yellow px-3 py-2 text-[17px] text-ink hover:text-ink"
        >
          Post another
        </Link>
      </div>

      <div className="mb-4 flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`label flex-1 border-[2.5px] border-ink py-2 text-[16px] ${
              tab === t.key ? 'bg-ink text-ground' : 'bg-panel text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="label m-0 mb-3 border-[3px] border-ink bg-yellow px-3.5 py-2.5 text-[17px] text-ink">
          {error}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState title="Nothing here yet">
          {tab === 'ACTIVE' ? (
            <>
              Post something and it shows up here. <Link href="/post">Post a listing</Link>.
            </>
          ) : (
            'Nothing in this tab.'
          )}
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((row) => (
            <Plate key={row.id} className="flex flex-col gap-3 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={row.href} className="label block text-[19px] leading-tight text-ink hover:text-red">
                    {row.title}
                  </Link>
                  <p className="font-display m-0 mt-1 text-[22px] leading-none text-red">
                    {formatPrice(row.price, row.priceUnit)}
                  </p>
                </div>
                <span
                  className={`label shrink-0 border-2 border-ink px-2 py-0.5 text-[13px] ${
                    row.status === 'ACTIVE'
                      ? 'bg-green text-ground'
                      : row.status === 'RESERVED'
                        ? 'bg-yellow text-ink'
                        : 'bg-dim text-muted'
                  }`}
                >
                  {row.status}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <Stat label="Views" value={row.viewCount} />
                <Stat label="Contacts" value={row.contactCount} />
                <span className="label text-[15px] font-semibold text-muted">
                  Posted {timeAgo(row.postedAt)}
                </span>
                {row.status === 'ACTIVE' ? (
                  <span className="label text-[15px] font-semibold text-muted">
                    Expires {new Date(row.expiresAt).toLocaleDateString('en-PH', { day: 'numeric', month: 'short' })}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {row.status === 'ACTIVE' ? (
                  <>
                    <Action busy={busy === row.id} onClick={() => act(row.id, { status: 'RESERVED' })}>
                      Mark reserved
                    </Action>
                    <Action busy={busy === row.id} onClick={() => act(row.id, { status: 'CLOSED' })}>
                      Mark sold
                    </Action>
                    <Action busy={busy === row.id} onClick={() => act(row.id, { bump: true })}>
                      Bump
                    </Action>
                  </>
                ) : null}
                {row.status === 'RESERVED' ? (
                  <>
                    <Action busy={busy === row.id} onClick={() => act(row.id, { status: 'ACTIVE' })}>
                      Back to active
                    </Action>
                    <Action busy={busy === row.id} onClick={() => act(row.id, { status: 'CLOSED' })}>
                      Mark sold
                    </Action>
                  </>
                ) : null}
                {row.status === 'CLOSED' || row.status === 'EXPIRED' ? (
                  <Action busy={busy === row.id} onClick={() => act(row.id, { status: 'ACTIVE' })}>
                    Re-open
                  </Action>
                ) : null}
              </div>
            </Plate>
          ))}
        </div>
      )}
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="label text-[15px] text-muted">
      {label} <span className="text-[17px] text-ink">{value}</span>
    </span>
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
      className="label border-[2.5px] border-ink bg-ground px-3 py-1.5 text-[16px] disabled:opacity-60"
    >
      {children}
    </button>
  )
}
