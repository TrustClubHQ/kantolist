import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

/**
 * Behind a PgBouncer pooler (a `-pooler` host), Prisma's prepared-statement
 * cache breaks with "cached plan must not change result type" after a deploy
 * changes a table's shape. `pgbouncer=true` disables that cache, which
 * transaction-mode pooling requires. Direct and local URLs are left alone.
 */
function resolveDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL
  if (!url || !url.includes('-pooler.')) return url
  if (/[?&]pgbouncer=/.test(url)) return url
  return url + (url.includes('?') ? '&' : '?') + 'pgbouncer=true'
}

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    datasourceUrl: resolveDatabaseUrl(),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
