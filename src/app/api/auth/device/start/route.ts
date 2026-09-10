import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { requestDeviceAuthorization, OidcError, getClientCreds } from '@/lib/trustclub-oidc'
import { createAuthSession } from '@/lib/auth-session'
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
