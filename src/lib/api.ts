import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * Wraps a route handler so an uncaught error is logged once and returned as a
 * consistent JSON 500, instead of repeating try/catch in every route. Routes
 * that map a specific error to a non-500 keep a narrow inner catch and rethrow
 * everything else for this wrapper.
 */
export function withApiHandler<A extends unknown[]>(
  handler: (...args: A) => Promise<NextResponse> | NextResponse,
  errorMessage = 'Something went wrong',
): (...args: A) => Promise<NextResponse> {
  return async (...args: A) => {
    try {
      return await handler(...args)
    } catch (error) {
      const req = args[0] as { method?: string; url?: string } | undefined
      let path = req?.url ?? ''
      try {
        if (req?.url) path = new URL(req.url).pathname
      } catch {
        /* keep the raw url */
      }
      // The same id goes to the log and to the caller, so a 500 seen in a
      // browser can be found in the platform logs by searching for one string.
      // "There are no logs for this request" is otherwise impossible to tell
      // apart from "the logs are not being read in the right place".
      const errorId = Math.random().toString(36).slice(2, 10)
      logger.error(
        `[api] ${req?.method ?? ''} ${path} failed (id ${errorId})`,
        error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
      )
      return NextResponse.json({ error: errorMessage, errorId }, { status: 500 })
    }
  }
}

/**
 * A rejected request, logged as well as returned.
 *
 * It used to only be returned. The reason reaches the member, who reads it and
 * moves on or gives up, and nothing reaches us — so a morning of "posting does
 * not work" showed up in the platform logs as forty-seven identical
 * `POST /api/listings 400` lines with no hint which of a dozen validation
 * rules was firing, and the only way to find out was to guess. The message is
 * ours, not user content, so logging it leaks nothing.
 */
export const badRequest = (error: string, details?: unknown) => {
  logger.warn(`[api] 400 ${error}`, details === undefined ? undefined : { details })
  return NextResponse.json({ error, ...(details === undefined ? {} : { details }) }, { status: 400 })
}
export const unauthorized = (error = 'Sign in to continue') =>
  NextResponse.json({ error }, { status: 401 })
export const forbidden = (error = 'Not allowed') => {
  // Same reasoning as badRequest: a refusal nobody can see is a refusal nobody
  // can fix. The posting floor and the per-day caps both answer this way.
  logger.warn(`[api] 403 ${error}`)
  return NextResponse.json({ error }, { status: 403 })
}
export const notFound = (error = 'Not found') => NextResponse.json({ error }, { status: 404 })
