import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { requestDeviceAuthorization, OidcError, getClientCreds } from '@/lib/trustclub-oidc'
import { createAuthSession, findActiveSession } from '@/lib/auth-session'
import { resumePayload } from '@/lib/device-resume'
import { isSameOriginPost, isSafeRedirect } from '@/lib/http'
import { withApiHandler } from '@/lib/api'
import { logger } from '@/lib/logger'

export const POST = withApiHandler(async (request: NextRequest) => {
  if (!isSameOriginPost(request)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const body: { redirect?: string } = await request.json().catch(() => ({}))
  const creds = getClientCreds()
  if (!creds) return NextResponse.json({ error: 'not_configured' }, { status: 500 })

  // Resume before starting a new one. A phone that leaves for TrustClub and
  // comes back to an evicted-and-reloaded tab used to mint a second device
  // code here, orphaning the one the member had just approved: they saw a
  // fresh QR, waited on a code nobody would ever approve, and eventually got
  // "the sign-in expired". Handing back the live authorization instead means
  // the next poll picks up the approval they already gave.
  const existingId = request.cookies.get('kl-device')?.value
  if (existingId) {
    const resumed = resumePayload(await findActiveSession(existingId), creds.clientId)
    if (resumed) return NextResponse.json(resumed)
  }

  // A fresh nonce per session, sent upstream and stored, so /poll can bind the
  // returned id_token to THIS authorization request.
  const nonce = randomBytes(16).toString('base64url')

  let upstream
  try {
    upstream = await requestDeviceAuthorization(creds, nonce)
  } catch (e) {
    const code = e instanceof OidcError ? e.code : 'upstream_error'
    // Log a bounded message only — an error object can carry response bodies.
    logger.error('[auth/device/start] upstream failure', { code })
    return NextResponse.json({ error: code }, { status: 503 })
  }

  const session = await createAuthSession({
    deviceCode: upstream.device_code,
    userCode: upstream.user_code,
    verificationUri: upstream.verification_uri_complete,
    interval: upstream.interval,
    expiresInSeconds: upstream.expires_in,
    clientId: creds.clientId,
    redirectPath: isSafeRedirect(body.redirect) ? body.redirect : null,
    nonce,
  })

  const res = NextResponse.json({
    user_code: upstream.user_code,
    verification_uri_complete: upstream.verification_uri_complete,
    interval: upstream.interval,
    expires_in: upstream.expires_in,
  })
  res.cookies.set('kl-device', session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.min(upstream.expires_in, 600),
  })
  return res
})
