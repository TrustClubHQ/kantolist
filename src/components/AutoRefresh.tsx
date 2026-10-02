'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Keep a listing page current without the reader doing anything.
 *
 * `router.refresh()` rather than `location.reload()`: it re-fetches the server
 * render and swaps it in, so scroll position, the chosen filters and an open
 * filter sheet all survive, and the JS bundle is not downloaded again every
 * tick. A reload every ten seconds on a provincial mobile connection would
 * cost more data than the listings it is checking for.
 *
 * Paused whenever the tab is not being looked at. A phone left on this page in
 * a background tab would otherwise poll all day, which is the reader's mobile
 * data and our function invocations spent on a screen nobody is reading. The
 * moment it is looked at again it refreshes immediately rather than waiting
 * out the rest of the interval — coming back to the tab is exactly when stale
 * content is most obvious.
 *
 * Renders nothing.
 */
export function AutoRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter()

  useEffect(() => {
    const period = Math.max(1, seconds) * 1000
    let timer: ReturnType<typeof setInterval> | null = null

    function stop() {
      if (timer !== null) {
        clearInterval(timer)
        timer = null
      }
    }

    function start() {
      stop()
      timer = setInterval(() => {
        // Checked again here, not only on the event: a tab can be hidden
        // between ticks without the handler having run yet.
        if (document.visibilityState === 'visible') router.refresh()
      }, period)
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') {
        router.refresh()
        start()
      } else {
        stop()
      }
    }

    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [router, seconds])

  return null
}
