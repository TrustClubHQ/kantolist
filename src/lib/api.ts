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
      logger.error(`[api] ${req?.method ?? ''} ${path} failed`, error)
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
  }
}

export const badRequest = (error: string, details?: unknown) =>
  NextResponse.json({ error, ...(details === undefined ? {} : { details }) }, { status: 400 })
export const unauthorized = (error = 'Sign in to continue') =>
  NextResponse.json({ error }, { status: 401 })
export const forbidden = (error = 'Not allowed') => NextResponse.json({ error }, { status: 403 })
export const notFound = (error = 'Not found') => NextResponse.json({ error }, { status: 404 })
