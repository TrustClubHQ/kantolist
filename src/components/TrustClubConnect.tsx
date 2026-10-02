'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import { useBrowserKind } from '@/hooks/useBrowserKind'
import { androidIntentUrl, TRUSTCLUB_PLAY_URL } from '@/lib/trustclub-link'
import { Plate } from '@/components/ui'
import { isSafeRedirect } from '@/lib/http'
import { useT } from '@/components/LanguageProvider'
import type { T } from '@/lib/i18n'

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

/**
 * One sentence per cause. Three of these used to read "that sign-in window
 * closed" — TrustClub rejecting the code, this server having no record of it,
 * and the browser not sending the cookie back — which made every report of the
 * failure identical and none of them actionable.
 */
const ERROR_CODES = new Set([
  'access_denied',
  'expired_token',
  'session_gone',
  'no_session',
  'invalid_grant',
  'invalid_client',
  'unsupported_grant_type',
  'not_configured',
  'verify_failed',
  'network_error',
  'timeout',
])

function errorText(code: string | undefined, t: T): string {
  if (code && ERROR_CODES.has(code)) return t(`signin.error.${code}`)
  return t('signin.error.unknown', { code: code ?? 'unknown' })
}

export function TrustClubConnect({
  redirectTo,
  devLoginEnabled,
}: {
  redirectTo?: string
  devLoginEnabled: boolean
}) {
  const t = useT()
  // The poll below must not restart when the language changes: switching
  // language mid-sign-in would abandon the device code the member is already
  // approving on their phone. So the effect reads the current translator
  // through a ref instead of depending on it.
  const tRef = useRef(t)
  useEffect(() => {
    tRef.current = t
  }, [t])
  const [phase, setPhase] = useState<Phase>('starting')
  const [verificationUri, setVerificationUri] = useState('')
  const [userCode, setUserCode] = useState('')
  const [error, setError] = useState('')
  const [downloadError, setDownloadError] = useState('')
  // Bumping this restarts the flow without unmounting, which is what "Try
  // again" needs — a reload would lose the redirect we were sent with.
  const [restartKey, setRestartKey] = useState(0)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)
  const { isMobile, isAndroid, isInApp } = useBrowserKind()

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
            // Assigning the URL we are already on is a no-op in browsers, which
            // would leave this mounted and let the next poll race the success
            // with invalid_grant. Reload instead so the new cookie is picked up.
            const here = window.location.pathname + window.location.search
            if (target === here) window.location.reload()
            else window.location.href = target
            return
          }
          if (data.terminal) {
            // Say what happened, and say it once. A previous version quietly
            // restarted the flow on an expired code, which showed "Preparing
            // sign-in…" and then a fresh QR — indistinguishable from the page
            // ignoring an approval the member had just given, and it hid the
            // reason from them and from the logs.
            setError(errorText(data.error, tRef.current))
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
          setError(
            data.error ? errorText(data.error, tRef.current) : tRef.current('signin.error.start'),
          )
          setPhase('error')
          return
        }
        setVerificationUri(data.verification_uri_complete)
        setUserCode(data.user_code ?? '')
        setPhase('waiting')
        // Poll only after start resolves: the first poll needs the device
        // cookie that the start response sets, or it comes back `no_session`.
        //
        // Fixed 2s, like TruRate, rather than the server's interval. The
        // server owns the real rate — `reservePoll` refuses anything inside
        // the interval and serves the cached state — so polling faster just
        // keeps the page responsive the moment an approval lands, and the
        // client never has to track a `slow_down` bump it cannot see.
        poll(2000)
      } catch {
        if (!aborted) {
          setError(tRef.current('signin.error.offline'))
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
        setDownloadError(t('signin.qrFailed'))
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
        setDownloadError(t('signin.qrFailed'))
      } finally {
        URL.revokeObjectURL(url)
      }
    }, 'image/png')
  }, [t])

  if (phase === 'starting') {
    return (
      <Plate className="p-6 text-center">
        <p className="label m-0 text-[18px] text-muted">{t('signin.preparing')}</p>
      </Plate>
    )
  }

  if (phase === 'success') {
    return (
      <Plate className="p-6 text-center">
        <p className="font-display m-0 text-[22px] uppercase text-green">{t('signin.done')}</p>
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
          {t('signin.retry')}
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
            {t('signin.scanDesktop')}
          </p>
          <p className="m-0 text-center text-[13px] font-semibold text-muted">
            {t('signin.keepOpen')}
          </p>
        </Plate>
        {devLoginEnabled ? <DevLogin /> : null}
      </div>
    )
  }

  // Mobile: TrustClub is on this same device, so tapping through is the path.
  // The QR stays as a fallback for showing someone else's phone.
  //
  // On Android the link goes out as an intent: so the OS is asked for the
  // TrustClub app by name rather than left to notice the App Link itself,
  // with the https page as browser_fallback_url for a phone without the app.
  // Not inside a Facebook or Messenger webview though: those block intent:
  // outright, and an intent: that goes nowhere is worse than an https link
  // that at least loads something — there the banner above is the real fix.
  const tapHref = (isAndroid && !isInApp ? androidIntentUrl(verificationUri) : null) ?? verificationUri

  return (
    <div className="flex flex-col gap-3">
      {isInApp ? <InAppBrowserNotice /> : null}
      <Plate className="flex flex-col items-center p-5">
        {verificationUri ? (
          <a
            href={tapHref}
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
            {t('signin.connect')}
          </a>
        ) : null}

        <div className="my-5 flex w-full items-center gap-3">
          <span className="h-[2px] flex-1 bg-dim-edge" />
          <span className="label text-[14px] tracking-widest text-muted">{t('signin.or')}</span>
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
          {t('signin.scanOther')}
        </p>

        {/* The way through when the tap does not reach the app.
            This code used to be hidden on the grounds that the link carries it
            so nobody has to type anything — true right up until the link does
            not open the app, and then it is the only route left. TrustClub's
            own fallback page tells a member to "scan the code shown by the
            partner site", which on one phone is nothing at all; this is that
            code. */}
        {userCode ? (
          <div className="mt-4 w-full border-t-2 border-dim-edge pt-3 text-center">
            <p className="m-0 text-[13px] font-semibold leading-snug text-muted-2">
              {t('signin.codeFallback')}
            </p>
            <p className="font-display m-0 mt-1 text-[26px] tracking-[0.12em] text-ink">{userCode}</p>
            <a
              href={TRUSTCLUB_PLAY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="label mt-2 inline-block text-[15px] underline"
            >
              {t('signin.getApp')}
            </a>
          </div>
        ) : null}

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
          {t('signin.saveQr')}
        </button>

        {downloadError ? (
          <p className="label m-0 mt-3 text-[15px] text-red">{downloadError}</p>
        ) : null}
      </Plate>
      {devLoginEnabled ? <DevLogin /> : null}
    </div>
  )
}

/**
 * Shown when the page is inside a Facebook, Messenger or Instagram webview.
 *
 * Those do not hand an https link to the system, so Android never resolves it
 * as an App Link and "Connect with TrustClub" opens TrustClub's web page
 * instead of the app — a page which, on one phone, tells the member to scan a
 * code that is not there. They block the intent: scheme too, so there is no
 * link that escapes: the only way out is opening this page in a real browser,
 * and the member has to be told that before they get stuck rather than after.
 *
 * Most KantoList traffic arrives through a Messenger link, so this is the
 * common path, not an edge case.
 */
function InAppBrowserNotice() {
  const t = useT()
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
    } catch {
      // Clipboard refused — the menu route in the text still works.
      setCopied(false)
    }
  }

  return (
    <div className="border-[3px] border-ink bg-yellow px-3.5 py-3">
      <p className="label m-0 text-[17px] text-ink">{t('signin.inApp.title')}</p>
      <p className="m-0 mt-1 text-[13px] font-semibold leading-snug text-ink">
        {t('signin.inApp.body')}
      </p>
      <button
        type="button"
        onClick={copy}
        className="label hard-sm mt-2.5 inline-flex min-h-[44px] items-center justify-center border-[3px] border-ink bg-ground px-3.5 text-[16px] text-ink"
      >
        {copied ? t('signin.inApp.copied') : t('signin.inApp.copy')}
      </button>
    </div>
  )
}

/** Local convenience only — the route behind it refuses to exist in production. */
function DevLogin() {
  const t = useT()
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
      <p className="label m-0 text-[15px] text-muted">{t('signin.devLogin')}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {accounts.map((a) => (
          <button
            key={a.trustclubId}
            type="button"
            onClick={() => signIn(a.trustclubId)}
            className="label min-h-[44px] border-2 border-ink bg-ground px-2.5 text-[15px]"
          >
            {a.displayName ?? a.trustclubId}
          </button>
        ))}
      </div>
    </Plate>
  )
}
