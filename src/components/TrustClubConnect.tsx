'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Plate } from '@/components/ui'
import { isSafeRedirect } from '@/lib/http'

/**
 * The TrustClub device-authorization flow, matching TruRate's presentation.
 *
 * The user code is deliberately NOT shown. In the device grant the code only
 * matters when the two devices cannot be linked automatically; here
 * `verification_uri_complete` already carries it, so the member either scans a
 * QR (desktop) or taps straight through (mobile) and never types anything.
 * Showing the code just adds a step nobody needs to take.
 *
 * The server owns the poll interval and raises it on slow_down, so this
 * component never decides how fast to ask.
 */

type Phase = 'starting' | 'waiting' | 'success' | 'error'

interface StartResponse {
  user_code: string
  verification_uri_complete: string
  interval: number
  expires_in: number
  error?: string
}

const ERRORS: Record<string, string> = {
  access_denied: 'That request was declined in TrustClub.',
  expired_token: 'The sign-in expired. Try again.',
  invalid_grant: 'That sign-in did not go through. Try again.',
  invalid_client: 'TrustClub sign-in is misconfigured on this deployment.',
  unsupported_grant_type: 'TrustClub sign-in is misconfigured on this deployment.',
  not_configured: 'TrustClub sign-in is not set up on this deployment yet.',
  verify_failed: 'We could not verify that sign-in. Try again.',
  no_session: 'The sign-in expired. Try again.',
  network_error: 'Could not reach TrustClub. Check your connection.',
  timeout: 'TrustClub took too long to answer. Try again.',
}

export function TrustClubConnect({
  redirectTo,
  devLoginEnabled,
}: {
  redirectTo?: string
  devLoginEnabled: boolean
}) {
  const [phase, setPhase] = useState<Phase>('starting')
  const [verificationUri, setVerificationUri] = useState('')
  const [error, setError] = useState('')
  const [downloadError, setDownloadError] = useState('')
  // Bumping this restarts the flow without unmounting, which is what "Try
  // again" needs — a reload would lose the redirect we were sent with.
  const [restartKey, setRestartKey] = useState(0)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)
  const isMobile = useIsMobile()

  // Captured once so a parent re-render with a new redirect cannot tear the
  // flow down mid-authorisation.
  const initialRedirect = useRef(redirectTo)

  useEffect(() => {
    let aborted = false
    let timer: ReturnType<typeof setTimeout> | null = null

    setPhase('starting')
    setError('')
    setVerificationUri('')

    function poll(intervalMs: number) {
      timer = setTimeout(async () => {
        if (aborted) return
        try {
          const res = await fetch('/api/auth/device/poll')
          const data: { ok: boolean; terminal?: boolean; error?: string; redirect?: string } =
            await res.json()
          if (aborted) return
          if (data.ok) {
            setPhase('success')
            const target = isSafeRedirect(data.redirect) ? data.redirect : '/'
            window.location.href = target
            return
          }
          if (data.terminal) {
            setError(ERRORS[data.error ?? ''] ?? 'That sign-in did not complete. Try again.')
            setPhase('error')
            return
          }
        } catch {
          // A dropped poll is usually transient — keep waiting rather than
          // throwing the member back to the start.
        }
        poll(intervalMs)
      }, intervalMs)
    }

    async function start() {
      try {
        const res = await fetch('/api/auth/device/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ redirect: initialRedirect.current }),
        })
        const data: StartResponse = await res.json()
        if (aborted) return
        if (!res.ok) {
          setError(ERRORS[data.error ?? ''] ?? 'Could not start the TrustClub sign-in.')
          setPhase('error')
          return
        }
        setVerificationUri(data.verification_uri_complete)
        setPhase('waiting')
        // Poll only after start resolves: the first poll needs the device
        // cookie that the start response sets, or it comes back `no_session`.
        poll(Math.max(2, data.interval) * 1000)
      } catch {
        if (!aborted) {
          setError('Could not reach the server. Check your connection.')
          setPhase('error')
        }
      }
    }

    start()
    return () => {
      aborted = true
      if (timer) clearTimeout(timer)
    }
  }, [restartKey])

  const downloadQr = useCallback(() => {
    setDownloadError('')
    const canvas = qrCanvasRef.current
    if (!canvas) {
      setDownloadError('Could not save the QR code.')
      return
    }
    canvas.toBlob((blob) => {
      if (!blob) {
        setDownloadError('Could not save the QR code.')
        return
      }
      const url = URL.createObjectURL(blob)
      try {
        const a = document.createElement('a')
        a.href = url
        a.download = 'kantolist-login-qr.png'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } catch {
        setDownloadError('Could not save the QR code.')
      } finally {
        URL.revokeObjectURL(url)
      }
    }, 'image/png')
  }, [])

  if (phase === 'starting') {
    return (
      <Plate className="p-6 text-center">
        <p className="label m-0 text-[18px] text-muted">Preparing sign-in…</p>
      </Plate>
    )
  }

  if (phase === 'success') {
    return (
      <Plate className="p-6 text-center">
        <p className="font-display m-0 text-[22px] uppercase text-green">Signed in — taking you back…</p>
      </Plate>
    )
  }

  if (phase === 'error') {
    return (
      <div className="flex flex-col gap-3">
        <p className="label m-0 border-[3px] border-ink bg-yellow px-3.5 py-2.5 text-[17px] text-ink">
          {error}
        </p>
        <button
          type="button"
          onClick={() => setRestartKey((k) => k + 1)}
          className="font-display hard min-h-[54px] border-[3px] border-ink bg-red text-[20px] uppercase text-ground"
        >
          Try again
        </button>
        {devLoginEnabled ? <DevLogin /> : null}
      </div>
    )
  }

  // Desktop: the member has their phone in hand, so a big QR is the whole UI.
  if (!isMobile) {
    return (
      <div className="flex flex-col gap-3">
        <Plate className="flex flex-col items-center gap-4 p-6">
          {verificationUri ? (
            <div className="border-[3px] border-ink bg-panel p-3">
              <QRCodeSVG value={verificationUri} size={232} bgColor="#FFFFFF" fgColor="#17130E" />
            </div>
          ) : null}
          <p className="label m-0 max-w-[19rem] text-center text-[18px] leading-snug">
            Scan this with the TrustClub app on your phone
          </p>
          <p className="m-0 text-center text-[13px] font-semibold text-muted">
            Keep this page open — it continues on its own once you approve.
          </p>
        </Plate>
        {devLoginEnabled ? <DevLogin /> : null}
      </div>
    )
  }

  // Mobile: TrustClub is on this same device, so tapping through is the path.
  // The QR stays as a fallback for showing someone else's phone.
  return (
    <div className="flex flex-col gap-3">
      <Plate className="flex flex-col items-center p-5">
        {verificationUri ? (
          <a
            href={verificationUri}
            className="font-display hard flex min-h-[56px] w-full items-center justify-center gap-3 border-[3px] border-ink bg-red text-[20px] uppercase text-ground hover:text-ground"
          >
            <Image
              src="/TCLogo-IconOnly-StealthBlack-minpadding.png"
              alt=""
              width={22}
              height={22}
              className="shrink-0 invert"
              aria-hidden
            />
            Connect with TrustClub
          </a>
        ) : null}

        <div className="my-5 flex w-full items-center gap-3">
          <span className="h-[2px] flex-1 bg-dim-edge" />
          <span className="label text-[14px] tracking-widest text-muted">or</span>
          <span className="h-[2px] flex-1 bg-dim-edge" />
        </div>

        {verificationUri ? (
          <div className="border-[3px] border-ink bg-panel p-2.5">
            <QRCodeCanvas
              ref={qrCanvasRef}
              value={verificationUri}
              size={150}
              bgColor="#FFFFFF"
              fgColor="#17130E"
              className="block"
            />
          </div>
        ) : null}

        <p className="m-0 mt-3 max-w-[15rem] text-center text-[13px] font-semibold leading-snug text-muted">
          Scan this from another phone, or save it to open later.
        </p>

        <button
          type="button"
          onClick={downloadQr}
          className="label mt-3 inline-flex items-center gap-2 border-[2.5px] border-ink bg-ground px-3.5 py-2 text-[16px]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Save QR code
        </button>

        {downloadError ? (
          <p className="label m-0 mt-3 text-[15px] text-red">{downloadError}</p>
        ) : null}
      </Plate>
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
