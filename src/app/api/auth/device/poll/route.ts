import { NextRequest, NextResponse } from 'next/server'
import { pollToken, verifyIdToken, getClientCreds, type IdTokenClaims } from '@/lib/trustclub-oidc'
import { findActiveSession, recordPoll, bumpInterval, deleteSession, reservePoll } from '@/lib/auth-session'
import { createToken, setAuthCookie, upsertAccount } from '@/lib/auth'
import { isSafeRedirect } from '@/lib/http'
import { withApiHandler } from '@/lib/api'
import { logger } from '@/lib/logger'

function clearDeviceCookie(res: NextResponse): NextResponse {
  res.cookies.set('kl-device', '', { maxAge: 0, path: '/' })
  return res
}

export const GET = withApiHandler(async (request: NextRequest) => {
  const sessionId = request.cookies.get('kl-device')?.value
  if (!sessionId) return NextResponse.json({ ok: false, terminal: true, error: 'no_session' })

  const session = await findActiveSession(sessionId)
  if (!session) {
    return clearDeviceCookie(NextResponse.json({ ok: false, terminal: true, error: 'expired_token' }))
  }

  const creds = getClientCreds()
  if (!creds || creds.clientId !== session.clientId) {
    return NextResponse.json({ ok: false, terminal: true, error: 'not_configured' })
  }

  // Atomic reservation: if a concurrent poll (a second tab) already claimed
  // this interval, return the cached error rather than hitting upstream twice.
  const reserved = await reservePoll(session.id, session.interval * 1000)
  if (!reserved) {
    return NextResponse.json({
      ok: false,
      terminal: false,
      error: session.lastError ?? 'authorization_pending',
    })
  }

  const result = await pollToken(creds, session.deviceCode)

  if (result.kind === 'transient') {
    if (result.slowDown) await bumpInterval(session.id)
    await recordPoll(session.id, result.code)
    return NextResponse.json({ ok: false, terminal: false, error: result.code })
  }

  if (result.kind === 'terminal') {
    await deleteSession(session.id)
    return clearDeviceCookie(NextResponse.json({ ok: false, terminal: true, error: result.code }))
  }

  let claims: IdTokenClaims
  try {
    claims = await verifyIdToken(creds, result.idToken, session.nonce)
  } catch (e) {
    logger.error('[auth/device/poll] verify failed', e instanceof Error ? e.message : String(e))
    await deleteSession(session.id)
    return clearDeviceCookie(NextResponse.json({ ok: false, terminal: true, error: 'verify_failed' }))
  }

  const account = await upsertAccount(claims.sub, claims.name)

  // Invalidate the device grant before responding, so a partial response can
  // never leave a usable device code behind.
  await deleteSession(session.id)

  const redirect = isSafeRedirect(session.redirectPath) ? session.redirectPath : '/'
  const res = NextResponse.json({ ok: true, redirect })
  setAuthCookie(res, createToken(account.id, account.trustclubId))
  return clearDeviceCookie(res)
})
