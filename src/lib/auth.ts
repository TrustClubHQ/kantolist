import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import type { Account } from '@prisma/client'

export const AUTH_COOKIE = 'kl-auth'
const TOKEN_TTL = '30d'

interface TokenPayload {
  accountId: string
  trustclubId: string
  exp?: number
}

/** No hardcoded fallback: an unset secret must fail loudly, not sign with a known value. */
function secret(): string {
  const s = process.env.AUTH_SECRET
  if (!s) throw new Error('AUTH_SECRET is not set — refusing to sign or verify session tokens')
  return s
}

export function createToken(accountId: string, trustclubId: string): string {
  return jwt.sign({ accountId, trustclubId }, secret(), { expiresIn: TOKEN_TTL })
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    // Pinned to the algorithm we sign with, so a crafted header can't coax
    // the library into a different scheme.
    return jwt.verify(token, secret(), { algorithms: ['HS256'] }) as TokenPayload
  } catch {
    return null
  }
}

export function setAuthCookie(res: NextResponse, token: string): void {
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export function clearAuthCookie(res: NextResponse): void {
  res.cookies.set(AUTH_COOKIE, '', { maxAge: 0, path: '/' })
}

/** Upsert on every successful login; `name` only fills a blank display name. */
export async function upsertAccount(trustclubId: string, name?: string): Promise<Account> {
  const existing = await prisma.account.findUnique({ where: { trustclubId } })
  if (existing) {
    return prisma.account.update({
      where: { trustclubId },
      data: {
        lastLogin: new Date(),
        ...(existing.displayName || !name ? {} : { displayName: name }),
      },
    })
  }
  return prisma.account.create({ data: { trustclubId, displayName: name ?? null } })
}

/** Route-handler identity. Returns null for anonymous visitors — browsing is public. */
export async function getAccountFromRequest(req: NextRequest): Promise<Account | null> {
  const token = req.cookies.get(AUTH_COOKIE)?.value
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null
  const account = await prisma.account.findUnique({ where: { id: payload.accountId } })
  if (!account || account.isBlocked) return null
  return account
}

/** Server-component identity, read from the request cookie jar. */
export async function getCurrentAccount(): Promise<Account | null> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null
  const account = await prisma.account.findUnique({ where: { id: payload.accountId } })
  if (!account || account.isBlocked) return null
  return account
}

export function isDevLoginEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_LOGIN === 'true'
}
