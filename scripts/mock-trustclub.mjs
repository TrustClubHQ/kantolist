/**
 * A local stand-in for TrustClub's OIDC device grant, so the sign-in flow can
 * be exercised without credentials. Without it the flow is untestable
 * locally, which is how the "sign-in expired" bug survived: the failing path
 * only appears when a real authorization is approved and the tab reloads.
 *
 * Serves device_authorization/, token/ and .well-known/jwks.json, plus test
 * controls the real issuer has no equivalent of:
 *   GET /approve?user_code=UC1   the member approves on their phone
 *   GET /expire-all              every outstanding code expires
 *   GET /expire-mode?on=1        every NEW code is born expired
 *   GET /state                   what the issuer is holding
 *
 * Run `npm run mock-trustclub`, then point .env at it:
 *   TRUSTCLUB_AUTH_ISSUER="http://127.0.0.1:9099/v1/connect/"
 *   TRUSTCLUB_AUTH_CLIENT_ID="kantolist-test"
 *   TRUSTCLUB_AUTH_CLIENT_SECRET="test-secret"
 */
import http from 'node:http'
import { generateKeyPair, exportJWK, SignJWT, calculateJwkThumbprint } from 'jose'

const ISSUER = 'http://127.0.0.1:9099/v1/connect/'
const CLIENT_ID = 'kantolist-test'
const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true })
const jwk = await exportJWK(publicKey)
jwk.kid = await calculateJwkThumbprint(jwk)
jwk.alg = 'RS256'
jwk.use = 'sig'

const grants = new Map() // device_code -> { userCode, nonce, approved, expired }
let expireMode = false // when on, every new grant is born already expired
let n = 0

function body(req) {
  return new Promise((r) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => r(d)) })
}
const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)) }

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:9099')
  if (url.pathname === '/v1/connect/device_authorization/') {
    const form = new URLSearchParams(await body(req))
    const device_code = 'dc_' + ++n + '_' + Math.random().toString(36).slice(2)
    const user_code = 'UC' + n
    grants.set(device_code, { userCode: user_code, nonce: form.get('nonce'), approved: false, expired: expireMode })
    return json(res, 200, {
      device_code, user_code,
      verification_uri: 'http://127.0.0.1:9099/activate',
      verification_uri_complete: `http://127.0.0.1:9099/activate?user_code=${user_code}`,
      expires_in: 600, interval: 1,
    })
  }
  if (url.pathname === '/v1/connect/token/') {
    const form = new URLSearchParams(await body(req))
    const g = grants.get(form.get('device_code'))
    if (!g) return json(res, 400, { error: 'invalid_grant' })
    if (g.expired) return json(res, 400, { error: 'expired_token' })
    if (!g.approved) return json(res, 400, { error: 'authorization_pending' })
    const id_token = await new SignJWT({ sub: 'juan.santos', name: 'Juan Santos', nonce: g.nonce })
      .setProtectedHeader({ alg: 'RS256', kid: jwk.kid })
      .setIssuer(ISSUER).setAudience(CLIENT_ID).setIssuedAt().setExpirationTime('5m').sign(privateKey)
    return json(res, 200, { id_token, access_token: 'at_' + Date.now(), token_type: 'Bearer' })
  }
  if (url.pathname === '/v1/connect/.well-known/jwks.json') return json(res, 200, { keys: [jwk] })
  // Test controls
  if (url.pathname === '/approve') {
    for (const g of grants.values()) if (g.userCode === url.searchParams.get('user_code')) g.approved = true
    return json(res, 200, { ok: true })
  }
  if (url.pathname === '/expire-all') { for (const g of grants.values()) g.expired = true; return json(res, 200, { ok: true }) }
  if (url.pathname === '/expire-mode') { expireMode = url.searchParams.get('on') === '1'; return json(res, 200, { expireMode }) }
  if (url.pathname === '/state') return json(res, 200, [...grants].map(([k, v]) => ({ k, ...v })))
  if (url.pathname === '/activate') { res.writeHead(200, {'content-type':'text/html'}); return res.end('<h1>TrustClub: approve?</h1>') }
  json(res, 404, { error: 'not_found' })
}).listen(9099, '127.0.0.1', () => process.stdout.write('mock TrustClub on http://127.0.0.1:9099\n'))
