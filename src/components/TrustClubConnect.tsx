'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Plate } from '@/components/ui'

/**
 * The TrustClub device-authorization flow, ported from TruRate's connect modal
 * and reshaped for a full page.
 *
 * The shape that matters: /start returns a short user code and a verification
 * link, then the browser polls /poll at the interval the server dictates. The
 * server owns the interval (and raises it on slow_down), so this component
 * never decides how fast to ask.
 */

type Phase = 'idle' | 'starting' | 'waiting' | 'error'

interface StartResponse {
  user_code: string
  verification_uri_complete: string
  interval: number
  expires_in: number
  error?: string
}

const MESSAGES: Record<string, string> = {
  not_configured: 'TrustClub login is not configured on this deployment yet.',
  access_denied: 'That request was declined in TrustClub.',
  expired_token: 'The code expired. Start again.',
  network_error: 'Could not reach TrustClub. Check your connection.',
  timeout: 'TrustClub took too long to answer. Try again.',
  verify_failed: 'We could not verify that login. Start again.',
}

export function TrustClubConnect({
  redirectTo,
  devLoginEnabled,
}: {
  redirectTo?: string
  devLoginEnabled: boolean
}) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [session, setSession] = useState<StartResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])

  useEffect(() => stop, [stop])

  const poll = useCallback(
    async (intervalMs: number) => {
      try {
        const res = await fetch('/api/auth/device/poll')
        const data: { ok: boolean; terminal: boolean; error?: string; redirect?: string } = await res.json()

        if (data.ok) {
          stop()
          window.location.href = data.redirect ?? redirectTo ?? '/'
          return
        }
        if (data.terminal) {
          stop()
          setError(MESSAGES[data.error ?? ''] ?? 'That login did not complete. Try again.')
          setPhase('error')
          return
        }
        timer.current = setTimeout(() => poll(intervalMs), intervalMs)
      } catch {
        // A dropped request mid-flow is usually transient; keep waiting rather
        // than throwing the user back to the start.
        timer.current = setTimeout(() => poll(intervalMs), intervalMs)
      }
    },
    [redirectTo, stop],
  )

  async function start() {
    setPhase('starting')
    setError(null)
    try {
      const res = await fetch('/api/auth/device/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirect: redirectTo }),
      })
      const data: StartResponse = await res.json()
      if (!res.ok) {
        setError(MESSAGES[data.error ?? ''] ?? 'Could not start the TrustClub login.')
        setPhase('error')
        return
      }
      setSession(data)
      setPhase('waiting')
      poll(Math.max(2, data.interval) * 1000)
    } catch {
      setError('Could not reach the server. Check your connection.')
      setPhase('error')
    }
  }

  if (phase === 'waiting' && session) {
    return (
      <Plate className="flex flex-col gap-4 p-5">
        <p className="label m-0 text-[18px] text-muted">Waiting for TrustClub…</p>
        <div className="border-[3px] border-ink bg-ground px-4 py-4 text-center">
          <p className="label m-0 text-[15px] text-muted">Your code</p>
          <p className="font-display m-0 mt-1 text-[42px] leading-none tracking-widest text-red">
            {session.user_code}
          </p>
        </div>
        <a
          href={session.verification_uri_complete}
          target="_blank"
          rel="noopener noreferrer"
          className="font-display hard flex min-h-[54px] items-center justify-center border-[3px] border-ink bg-red text-[20px] uppercase text-ground hover:text-ground"
        >
          Open TrustClub
        </a>
        <p className="m-0 text-[13px] font-semibold leading-snug text-muted-2">
          Approve the request in TrustClub and this page continues on its own. Keep it open.
        </p>
      </Plate>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p className="label m-0 border-[3px] border-ink bg-yellow px-3.5 py-2.5 text-[17px] text-ink">{error}</p>
      ) : null}

      <button
        type="button"
        onClick={start}
        disabled={phase === 'starting'}
        className="font-display hard flex min-h-[56px] items-center justify-center border-[3px] border-ink bg-red text-[21px] uppercase text-ground disabled:opacity-60"
      >
        {phase === 'starting' ? 'Starting…' : 'Connect with TrustClub'}
      </button>

      {devLoginEnabled ? <DevLogin /> : null}
    </div>
  )
}

/** Local convenience only — the route behind it refuses to exist in production. */
function DevLogin() {
  const [accounts, setAccounts] = useState<{ trustclubId: string; displayName: string | null }[]>([])

  useEffect(() => {
    fetch('/api/auth/dev-login')
      .then((r) => (r.ok ? r.json() : { accounts: [] }))
      .then((d: { accounts?: { trustclubId: string; displayName: string | null }[] }) =>
        setAccounts(d.accounts ?? []),
      )
      .catch(() => setAccounts([]))
  }, [])

  if (accounts.length === 0) return null

  async function signIn(trustclubId: string) {
    await fetch('/api/auth/dev-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trustclubId }),
    })
    window.location.href = '/'
  }

  return (
    <Plate flat className="p-3">
      <p className="label m-0 text-[15px] text-muted">Dev login (local only)</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {accounts.map((a) => (
          <button
            key={a.trustclubId}
            type="button"
            onClick={() => signIn(a.trustclubId)}
            className="label border-2 border-ink bg-ground px-2.5 py-1 text-[15px]"
          >
            {a.displayName ?? a.trustclubId}
          </button>
        ))}
      </div>
    </Plate>
  )
}
