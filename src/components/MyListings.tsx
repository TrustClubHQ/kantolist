'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { ListingStatus, ListingType, PriceUnit } from '@prisma/client'
import { Plate, EmptyState } from '@/components/ui'
import { formatPrice } from '@/lib/listing'
import { timeAgo } from '@/lib/format'
import { useT } from '@/components/LanguageProvider'

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
  viewCount: number
  contactCount: number
}

const TABS: (ListingStatus | 'ALL')[] = ['ACTIVE', 'RESERVED', 'CLOSED', 'ALL']

export function MyListings({ listings }: { listings: Row[] }) {
  const t = useT()
  // Opened from "Manage this listing", which passes the listing's own status:
  // landing on Active hid the very listing that sent you here.
  const params = useSearchParams()
  const requested = params.get('tab')
  const [tab, setTab] = useState<ListingStatus | 'ALL'>(
    TABS.some((key) => key === requested) ? (requested as ListingStatus | 'ALL') : 'ACTIVE',
  )
  const [rows, setRows] = useState(listings)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const visible = tab === 'ALL' ? rows : rows.filter((r) => r.status === tab)
  const countFor = (key: ListingStatus | 'ALL') =>
    key === 'ALL' ? rows.length : rows.filter((r) => r.status === key).length

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
        setError(data.error ?? t('mine.failed'))
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
      setError(t('mine.offline'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display m-0 text-[30px] uppercase leading-none">{t('mine.title')}</h1>
        <Link
          href="/post"
          className="label hard-sm border-[3px] border-ink bg-yellow px-3 py-2 text-[17px] text-ink hover:text-ink"
        >
          {t('mine.postAnother')}
        </Link>
      </div>

      <div className="mb-4 flex gap-1.5">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`label min-h-[44px] flex-1 border-[2.5px] border-ink text-[16px] ${
              tab === key ? 'bg-ink text-ground' : 'bg-panel text-ink'
            }`}
          >
            {t(`mine.tab.${key}`)}
            {/* The count is why you would pick a tab at all — without it,
                finding a closed listing means clicking through to look. */}
            <span className="ml-1.5 text-[13px] opacity-70">{countFor(key)}</span>
          </button>
        ))}
      </div>

      {error ? (
        <p className="label m-0 mb-3 border-[3px] border-ink bg-yellow px-3.5 py-2.5 text-[17px] text-ink">
          {error}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState title={t('mine.empty')}>
          {tab === 'ACTIVE' ? (
            <>
              {t('mine.emptyActive')} <Link href="/post">{t('mine.emptyLink')}</Link>.
            </>
          ) : (
            t('mine.emptyOther')
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
                    {formatPrice(row.price, row.priceUnit, t)}
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
                  {t(`mine.status.${row.status}`)}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <Stat label={t('mine.views')} value={row.viewCount} />
                <Stat label={t('mine.contacts')} value={row.contactCount} />
                <span className="label text-[15px] font-semibold text-muted">
                  {t('mine.posted', { when: timeAgo(row.postedAt, t) })}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {/* First, because changing what a listing says is the thing an
                    owner comes here to do most often. */}
                <Link
                  href={`${row.href}/edit`}
                  className="label flex min-h-[44px] items-center justify-center border-[2.5px] border-ink bg-yellow px-3 text-[16px] text-ink hover:text-ink"
                >
                  {t('mine.edit')}
                </Link>
                {row.status === 'ACTIVE' ? (
                  <>
                    <Action busy={busy === row.id} onClick={() => act(row.id, { status: 'RESERVED' })}>
                      {t('mine.markReserved')}
                    </Action>
                    <Action busy={busy === row.id} onClick={() => act(row.id, { status: 'CLOSED' })}>
                      {t('mine.markSold')}
                    </Action>
                    <Action busy={busy === row.id} onClick={() => act(row.id, { bump: true })}>
                      {t('mine.bump')}
                    </Action>
                  </>
                ) : null}
                {row.status === 'RESERVED' ? (
                  <>
                    <Action busy={busy === row.id} onClick={() => act(row.id, { status: 'ACTIVE' })}>
                      {t('mine.backToActive')}
                    </Action>
                    <Action busy={busy === row.id} onClick={() => act(row.id, { status: 'CLOSED' })}>
                      {t('mine.markSold')}
                    </Action>
                  </>
                ) : null}
                {row.status === 'CLOSED' || row.status === 'EXPIRED' ? (
                  <Action busy={busy === row.id} onClick={() => act(row.id, { status: 'ACTIVE' })}>
                    {t('mine.reopen')}
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
      className="label flex min-h-[44px] items-center justify-center border-[2.5px] border-ink bg-ground px-3 text-[16px] disabled:opacity-60"
    >
      {children}
    </button>
  )
}
