import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * TrustClub trust-chain lookups, cached in Postgres.
 *
 * Trust is DIRECTED and relational: `getTrustPoints(viewer, poster)` is how
 * strongly the viewer's own network vouches for the poster. There is no global
 * score, so every ranking is per viewer — see rankByTrust().
 *
 * A failed lookup returns null, never 0. The two are different facts and the UI
 * renders them differently ("no trust path yet" vs. an unknown we don't claim).
 */

const API_URL = process.env.TRUSTCLUB_API_URL ?? 'https://api.trustclub.app'
const CACHE_TTL_MS = 10 * 60 * 1000
const REQUEST_TIMEOUT_MS = 10_000

/** How many upstream lookups one ranking pass may make. */
export const TRUST_LOOKUP_BUDGET = 60

async function readCache(fromId: string, toId: string): Promise<number | null> {
  try {
    const row = await prisma.trustChainCache.findUnique({
      where: { fromId_toId: { fromId, toId } },
    })
    if (row && Date.now() - row.fetchedAt.getTime() < CACHE_TTL_MS) return row.trustPoints
  } catch (error) {
    logger.error('[trustclub] cache read failed', error)
  }
  return null
}

async function writeCache(fromId: string, toId: string, trustPoints: number): Promise<void> {
  try {
    await prisma.trustChainCache.upsert({
      where: { fromId_toId: { fromId, toId } },
      update: { trustPoints, fetchedAt: new Date() },
      create: { fromId, toId, trustPoints },
    })
  } catch (error) {
    logger.error('[trustclub] cache write failed', error)
  }
}

async function fetchUpstream(fromId: string, toId: string): Promise<number | null> {
  const url = `${API_URL}/v1/graph/trust-chain/?node_from=${encodeURIComponent(fromId)}&node_to=${encodeURIComponent(toId)}`
  let response: Response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  } catch (error) {
    const name = (error as { name?: string }).name
    logger.error(`[trustclub] ${name === 'TimeoutError' ? 'timeout' : 'network error'} ${fromId}->${toId}`)
    return null
  }

  if (response.status === 404) {
    // Not an error: the graph simply has no path between these two.
    await writeCache(fromId, toId, 0)
    return 0
  }
  if (!response.ok) {
    logger.error(`[trustclub] api error ${response.status} ${fromId}->${toId}`)
    return null
  }

  let data: { total_tp?: number }
  try {
    data = await response.json()
  } catch {
    logger.error(`[trustclub] non-JSON response ${fromId}->${toId}`)
    return null
  }

  const trustPoints = Math.round(data.total_tp ?? 0)
  await writeCache(fromId, toId, trustPoints)
  return trustPoints
}

/** Trust points from `fromId` toward `toId`, or null when the lookup failed. */
export async function getTrustPoints(fromId: string, toId: string): Promise<number | null> {
  if (fromId === toId) return Number.POSITIVE_INFINITY
  const cached = await readCache(fromId, toId)
  if (cached !== null) return cached
  return fetchUpstream(fromId, toId)
}

/**
 * Trust from one viewer toward many posters. Cache hits are served in a single
 * query; only the misses go upstream, capped by `budget` so one page of results
 * can never fan out into an unbounded number of API calls. Ids beyond the
 * budget resolve to null (unknown), which the UI shows honestly.
 */
export async function getTrustPointsBatch(
  fromId: string,
  toIds: string[],
  budget = TRUST_LOOKUP_BUDGET,
): Promise<Map<string, number | null>> {
  const result = new Map<string, number | null>()
  const wanted = [...new Set(toIds)]
  if (wanted.length === 0) return result

  const selfIndex = wanted.indexOf(fromId)
  if (selfIndex !== -1) result.set(fromId, Number.POSITIVE_INFINITY)

  let rows: { toId: string; trustPoints: number; fetchedAt: Date }[] = []
  try {
    rows = await prisma.trustChainCache.findMany({
      where: { fromId, toId: { in: wanted } },
      select: { toId: true, trustPoints: true, fetchedAt: true },
    })
  } catch (error) {
    logger.error('[trustclub] batch cache read failed', error)
  }

  const now = Date.now()
  const misses: string[] = []
  for (const id of wanted) {
    if (id === fromId) continue
    const row = rows.find((r) => r.toId === id)
    if (row && now - row.fetchedAt.getTime() < CACHE_TTL_MS) result.set(id, row.trustPoints)
    else misses.push(id)
  }

  const toFetch = misses.slice(0, budget)
  for (const id of misses.slice(budget)) result.set(id, null)

  const fetched = await Promise.all(toFetch.map((id) => fetchUpstream(fromId, id)))
  toFetch.forEach((id, i) => result.set(id, fetched[i]))

  return result
}
