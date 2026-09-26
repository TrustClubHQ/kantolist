/**
 * Whether an in-flight device authorization can be handed back to a returning
 * tab instead of starting a new one.
 *
 * This is the fix for the phone case: a member taps through to TrustClub,
 * approves, and comes back to a tab the OS has evicted and reloaded. Minting a
 * second device code there orphans the one they just approved — they get a
 * fresh QR, wait on a code nobody will ever approve, and eventually see the
 * sign-in expire. Resuming means the next poll collects the approval.
 *
 * Pure so the rules are testable without a database.
 */

export interface ResumableSession {
  userCode: string
  verificationUri: string | null
  interval: number
  expiresAt: Date
  clientId: string
}

export interface ResumePayload {
  user_code: string
  verification_uri_complete: string
  interval: number
  expires_in: number
  resumed: true
}

/** A resumed code with only seconds left would strand the member on a QR
 *  that dies before they can scan it; below this we start fresh instead. */
export const MIN_RESUME_SECONDS = 15

export function resumePayload(
  session: ResumableSession | null,
  clientId: string,
  now: Date = new Date(),
): ResumePayload | null {
  if (!session) return null
  // A code issued to a different OIDC client cannot be polled with these
  // credentials, so it is not ours to resume.
  if (session.clientId !== clientId) return null
  // Pre-existing rows from before this column was added have no URI to show.
  if (!session.verificationUri) return null

  const remaining = Math.floor((session.expiresAt.getTime() - now.getTime()) / 1000)
  if (remaining < MIN_RESUME_SECONDS) return null

  return {
    user_code: session.userCode,
    verification_uri_complete: session.verificationUri,
    interval: session.interval,
    expires_in: remaining,
    resumed: true,
  }
}
