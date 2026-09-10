import { prisma } from '@/lib/prisma'
import type { AuthSession } from '@prisma/client'

const MAX_SESSION_TTL_SECONDS = 600

export interface CreateInput {
  deviceCode: string
  userCode: string
  interval: number
  expiresInSeconds: number
  clientId: string
  redirectPath: string | null
  nonce: string | null
}

export async function createAuthSession(input: CreateInput): Promise<AuthSession> {
  const ttl = Math.min(input.expiresInSeconds, MAX_SESSION_TTL_SECONDS)
  return prisma.authSession.create({
    data: {
      deviceCode: input.deviceCode,
      userCode: input.userCode,
      interval: input.interval,
      expiresAt: new Date(Date.now() + ttl * 1000),
      clientId: input.clientId,
      redirectPath: input.redirectPath,
      nonce: input.nonce,
    },
  })
}

export async function findActiveSession(id: string): Promise<AuthSession | null> {
  const row = await prisma.authSession.findUnique({ where: { id } })
  if (!row) return null
  if (row.expiresAt.getTime() < Date.now()) return null
  return row
}

/**
 * Atomically reserve the next upstream poll. Returns false when a concurrent
 * poll just claimed the slot, so the caller short-circuits with the cached
 * error instead of hitting upstream twice inside one interval.
 */
export async function reservePoll(id: string, intervalMs: number): Promise<boolean> {
  const cutoff = new Date(Date.now() - intervalMs)
  const result = await prisma.authSession.updateMany({
    where: { id, OR: [{ lastPollAt: null }, { lastPollAt: { lt: cutoff } }] },
    data: { lastPollAt: new Date() },
  })
  return result.count > 0
}

export async function recordPoll(id: string, lastError: string | null): Promise<void> {
  await prisma.authSession.update({ where: { id }, data: { lastError } })
}

export async function bumpInterval(id: string): Promise<void> {
  await prisma.authSession.update({ where: { id }, data: { interval: { increment: 5 } } })
}

export async function deleteSession(id: string): Promise<void> {
  try {
    await prisma.authSession.delete({ where: { id } })
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2025') return
    throw e
  }
}
