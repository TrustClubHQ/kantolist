'use client'

import { useEffect, useRef, useState } from 'react'
import { ListingCard, type ListingCardData } from '@/components/ListingCard'

/**
 * A grid of listings that keeps itself current.
 *
 * It replaces only the cards. The first version of this refreshed the whole
 * route — correct, but it re-rendered the header, the hero, the filter rail
 * and the sale strip to find out whether one listing had appeared, and a
 * provincial phone paid for all of it every ten seconds.
 *
 * The server still renders the first grid, so the page is complete before any
 * JavaScript runs and a crawler sees real listings. This takes over afterwards.
 *
 * Two things keep it quiet:
 *   - it polls only while the tab is being looked at, and refreshes once
 *     immediately on return, which is when stale content is most obvious;
 *   - it compares a signature of the result and keeps the previous array when
 *     nothing has changed, so React re-renders nothing on a tick that found no
 *     news — which is nearly all of them.
 */

interface ApiItem extends Omit<ListingCardData, 'postedAt'> {
  code: string
  postedAt: string
}

/**
 * Everything a card reads, so a tick that found no news re-renders nothing.
 *
 * The whole item rather than a hand-picked set of fields. The first version
 * listed code, status, price, image and trust points — and silently missed a
 * retitled listing, because the signature came out identical and the update
 * was skipped. Any field this misses is a change that never reaches the
 * screen, and the list of fields a card renders is not one worth maintaining
 * in two places.
 */
function signature(items: ApiItem[]): string {
  return JSON.stringify(items)
}

export function LiveListings({
  initial,
  query,
  limit,
  seconds = 10,
  className,
  signedIn,
  empty,
}: {
  /** The server-rendered grid this takes over from. */
  initial: ApiItem[]
  /** The search this grid is showing, as a query string for /api/listings. */
  query: string
  /** The home page shows the first few of a full page of results. */
  limit?: number
  seconds?: number
  className: string
  signedIn: boolean
  /** Shown when a poll comes back with nothing — the page owns the wording. */
  empty: React.ReactNode
}) {
  const [items, setItems] = useState(initial)
  // Kept in a ref as well so the poll can compare without being re-created on
  // every change, which would restart the interval each time.
  const current = useRef(signature(initial))

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null

    async function pull() {
      if (document.visibilityState !== 'visible') return
      try {
        const res = await fetch(`/api/listings?${query}`, { cache: 'no-store' })
        if (!res.ok || cancelled) return
        const data: { items?: ApiItem[] } = await res.json()
        const next = limit ? (data.items ?? []).slice(0, limit) : (data.items ?? [])
        const sig = signature(next)
        if (sig === current.current) return
        current.current = sig
        setItems(next)
      } catch {
        // A dropped poll on a patchy connection is not worth telling anyone
        // about: the grid already on screen stays, and the next tick tries
        // again.
      }
    }

    function start() {
      if (timer === null) timer = setInterval(pull, Math.max(1, seconds) * 1000)
    }
    function stop() {
      if (timer !== null) {
        clearInterval(timer)
        timer = null
      }
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') {
        pull()
        start()
      } else {
        stop()
      }
    }

    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [query, limit, seconds])

  if (items.length === 0) return <>{empty}</>

  return (
    <div className={className}>
      {items.map((item) => (
        <ListingCard key={item.code} listing={{ ...item, signedIn }} />
      ))}
    </div>
  )
}
