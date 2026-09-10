/**
 * Wire protocol with TrustClub's OIDC backend: device authorization grant,
 * token poll, and id_token verification.
 *
 * Ported from TruRate. Uses jose v6 — its API differs from v4/v5, so don't
 * paste snippets from older docs.
 */

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

export interface ClientCreds {
  /** Trailing slash REQUIRED — e.g. https://trustclub.app/v1/connect/ */
  issuer: string
  clientId: string
  clientSecret: string
}

export interface DeviceAuthorizationResponse {
  device_code: string
  user_code: string
  verification_uri: string
  verification_uri_complete: string
  expires_in: number
  interval: number
}

export type TokenPollResult =
  | { kind: 'success'; idToken: string; accessToken?: string }
  | { kind: 'transient'; code: string; slowDown?: boolean }
  | { kind: 'terminal'; code: string }

export class OidcError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

const TERMINAL_CODES = new Set([
  'access_denied',
  'expired_token',
  'invalid_grant',
  'invalid_client',
  'unsupported_grant_type',
])

function basicAuth(clientId: string, clientSecret: string): string {
  return 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
}

/**
 * The client_secret goes to the issuer as HTTP Basic on every call, so a
 * plaintext issuer would leak it. http stays allowed outside production for
 * a local mock.
 */
export function isAllowedIssuer(issuer: string): boolean {
  if (issuer.startsWith('https://')) return true
  return process.env.NODE_ENV !== 'production'
}

export function getClientCreds(): ClientCreds | null {
  const issuer = process.env.TRUSTCLUB_AUTH_ISSUER
  if (!issuer || !isAllowedIssuer(issuer)) return null
  const clientId = process.env.TRUSTCLUB_AUTH_CLIENT_ID
  const clientSecret = process.env.TRUSTCLUB_AUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  return { issuer, clientId, clientSecret }
}

export async function requestDeviceAuthorization(
  creds: ClientCreds,
  nonce?: string,
): Promise<DeviceAuthorizationResponse> {
  const form = new URLSearchParams({ scope: 'openid profile' })
  if (nonce) form.set('nonce', nonce)
  let r: Response
  try {
    r = await fetch(`${creds.issuer}device_authorization/`, {
      method: 'POST',
      headers: {
        Authorization: basicAuth(creds.clientId, creds.clientSecret),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
      signal: AbortSignal.timeout(10_000),
    })
  } catch (e: unknown) {
    const name = (e as { name?: string }).name
    throw new OidcError(name === 'TimeoutError' ? 'timeout' : 'network_error')
  }
  if (r.status === 200) {
    try {
      return (await r.json()) as DeviceAuthorizationResponse
    } catch {
      throw new OidcError('invalid_response', 'device_authorization returned non-JSON 200')
    }
  }
  let body: { error?: string } = {}
  try {
    body = await r.json()
  } catch {
    /* upstream sent a non-JSON error */
  }
  throw new OidcError(body.error ?? `http_${r.status}`)
}

export async function pollToken(creds: ClientCreds, deviceCode: string): Promise<TokenPollResult> {
  let r: Response
  try {
    r = await fetch(`${creds.issuer}token/`, {
      method: 'POST',
      headers: {
        Authorization: basicAuth(creds.clientId, creds.clientSecret),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: deviceCode,
      }).toString(),
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return { kind: 'transient', code: 'network_error' }
  }

  let body: { id_token?: string; access_token?: string; error?: string } = {}
  try {
    body = await r.json()
  } catch {
    /* fall through to the error branches */
  }

  if (body.id_token) {
    return { kind: 'success', idToken: body.id_token, accessToken: body.access_token }
  }
  const code = body.error
  if (!code) return { kind: 'transient', code: 'throttled_or_transient' }
  if (code === 'slow_down') return { kind: 'transient', code, slowDown: true }
  if (TERMINAL_CODES.has(code)) return { kind: 'terminal', code }
  return { kind: 'transient', code }
}

export interface IdTokenClaims extends JWTPayload {
  sub: string
  preferred_username?: string
  given_name?: string
  family_name?: string
  name?: string
}

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

function getJwks(issuer: string): ReturnType<typeof createRemoteJWKSet> {
  let resolver = jwksCache.get(issuer)
  if (!resolver) {
    resolver = createRemoteJWKSet(new URL(`${issuer}.well-known/jwks.json`), {
      cooldownDuration: 30_000,
      cacheMaxAge: 60 * 60 * 1000,
    })
    jwksCache.set(issuer, resolver)
  }
  return resolver
}

/** Real id_tokens are 1–2 KB; cap so a hostile upstream can't burn CPU. */
const MAX_ID_TOKEN_BYTES = 8 * 1024

export async function verifyIdToken(
  creds: ClientCreds,
  idToken: string,
  expectedNonce: string | null = null,
): Promise<IdTokenClaims> {
  if (idToken.length > MAX_ID_TOKEN_BYTES) throw new OidcError('id_token_too_large')

  const { payload } = await jwtVerify(idToken, getJwks(creds.issuer), {
    algorithms: ['RS256'],
    issuer: creds.issuer,
    audience: creds.clientId,
    clockTolerance: 60,
  })
  if (typeof payload.sub !== 'string') throw new OidcError('invalid_id_token', 'missing sub')

  // The nonce binds this id_token to THIS session's authorization request;
  // without it a captured token could be replayed against any polling session.
  if (expectedNonce !== null) {
    if (typeof payload.nonce !== 'string' || payload.nonce !== expectedNonce) {
      throw new OidcError('invalid_id_token', 'nonce mismatch')
    }
  }
  return payload as IdTokenClaims
}
