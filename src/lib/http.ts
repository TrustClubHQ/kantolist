import type { NextRequest } from 'next/server'

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * CSRF guard for state-changing requests. Browsers always attach an Origin to
 * cross-site mutating requests, so: reads always pass; a mutating request with
 * no Origin/Referer is a non-browser caller and passes (it is authenticated by
 * other means); one that carries either header must be same-origin.
 */
export function isAllowedMutatingRequest(request: NextRequest): boolean {
  if (!MUTATING.has(request.method.toUpperCase())) return true
  const origin = request.headers.get('origin') ?? request.headers.get('referer')
  if (!origin) return true
  const host = request.headers.get('host')
  if (!host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

/** Stricter variant for the auth start route: a missing Origin is refused. */
export function isSameOriginPost(request: NextRequest): boolean {
  const origin = request.headers.get('origin') ?? request.headers.get('referer')
  const host = request.headers.get('host')
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

/**
 * Safe to assign to `location.href` on our own origin: a relative path only.
 * Rejects absolute URLs, `javascript:`/`data:` and protocol-relative forms
 * (`//evil.example`, `/\evil.example` — browsers normalise the backslash).
 */
export function isSafeRedirect(s: unknown): s is string {
  if (typeof s !== 'string') return false
  if (s.length === 0 || s.length > 256) return false
  if (!s.startsWith('/')) return false
  if (s.startsWith('//') || s.startsWith('/\\')) return false
  return true
}
