import { resumePayload, MIN_RESUME_SECONDS, type ResumableSession } from '@/lib/device-resume'

const NOW = new Date('2026-09-26T08:00:00Z')
const CLIENT = 'kantolist'

function session(over: Partial<ResumableSession> = {}): ResumableSession {
  return {
    userCode: 'ABCD-1234',
    verificationUri: 'https://trustclub.app/activate?user_code=ABCD-1234',
    interval: 5,
    expiresAt: new Date(NOW.getTime() + 300_000),
    clientId: CLIENT,
    ...over,
  }
}

describe('resumePayload', () => {
  it('hands back the live authorization so a returning tab keeps the code it already showed', () => {
    // The member approved on their phone; the tab reloaded. Minting a second
    // device code here is what stranded them on an unapprovable QR.
    const out = resumePayload(session(), CLIENT, NOW)
    expect(out).toEqual({
      user_code: 'ABCD-1234',
      verification_uri_complete: 'https://trustclub.app/activate?user_code=ABCD-1234',
      interval: 5,
      expires_in: 300,
      resumed: true,
    })
  })

  it('reports the time actually left, not the original window', () => {
    const old = session({ expiresAt: new Date(NOW.getTime() + 42_000) })
    expect(resumePayload(old, CLIENT, NOW)?.expires_in).toBe(42)
  })

  it('starts fresh when there is no session to resume', () => {
    expect(resumePayload(null, CLIENT, NOW)).toBeNull()
  })

  it('refuses a code issued to a different OIDC client', () => {
    // These credentials cannot poll it, so resuming would dead-end.
    expect(resumePayload(session({ clientId: 'someone-else' }), CLIENT, NOW)).toBeNull()
  })

  it('refuses a row with no stored URI, so pre-migration sessions start fresh', () => {
    expect(resumePayload(session({ verificationUri: null }), CLIENT, NOW)).toBeNull()
  })

  it('refuses a code about to die rather than showing a QR that expires mid-scan', () => {
    const almost = session({ expiresAt: new Date(NOW.getTime() + (MIN_RESUME_SECONDS - 1) * 1000) })
    expect(resumePayload(almost, CLIENT, NOW)).toBeNull()
    const ok = session({ expiresAt: new Date(NOW.getTime() + MIN_RESUME_SECONDS * 1000) })
    expect(resumePayload(ok, CLIENT, NOW)).not.toBeNull()
  })

  it('refuses an already-expired code', () => {
    expect(resumePayload(session({ expiresAt: new Date(NOW.getTime() - 1000) }), CLIENT, NOW)).toBeNull()
  })
})
