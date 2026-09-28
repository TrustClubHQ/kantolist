/**
 * Where the Postgres URL comes from.
 *
 * Prisma's schema hardcodes `env("DATABASE_URL")`, but a Vercel/Neon
 * integration names what it injects after its own convention, and connecting
 * the store with a prefix puts an extra `DATABASE_` in front of every one of
 * them — which is how this deployment ended up holding the connection string
 * in `DATABASE_POSTGRES_URL` while the app read `DATABASE_URL` and found
 * nothing. So each name is accepted with and without that prefix.
 *
 * Order matters: a plain `DATABASE_URL` always wins, so nothing here can
 * quietly redirect an environment that is already set up correctly.
 */
const BASE_NAMES = ['DATABASE_URL', 'POSTGRES_URL'] as const

export const DATABASE_URL_VARS: readonly string[] = [
  ...BASE_NAMES,
  ...BASE_NAMES.map((name) => `DATABASE_${name}`),
]

type Env = Record<string, string | undefined>

export function resolveDatabaseUrl(env: Env = process.env): string | undefined {
  for (const name of DATABASE_URL_VARS) {
    const value = env[name]
    if (value && value.trim()) return value.trim()
  }
  return undefined
}

/**
 * The same, but refuses to continue without one. A missing database has to be
 * an error at the point of use — the alternative is a site that renders
 * perfectly with nothing in it, which reads as "no listings yet" and hides the
 * misconfiguration for as long as nobody counts the rows.
 */
export function requireDatabaseUrl(env: Env = process.env): string {
  const url = resolveDatabaseUrl(env)
  if (!url) {
    throw new Error(
      `No database URL. Set one of: ${DATABASE_URL_VARS.join(', ')}. ` +
        'On Vercel, check that the variable is scoped to this environment.',
    )
  }
  return url
}

/**
 * Behind a PgBouncer pooler (a `-pooler` host), Prisma's prepared-statement
 * cache breaks with "cached plan must not change result type" after a deploy
 * changes a table's shape. `pgbouncer=true` disables that cache, which
 * transaction-mode pooling requires. Direct and local URLs are left alone.
 */
export function withPoolerFlag(url: string): string {
  if (!url.includes('-pooler.')) return url
  if (/[?&]pgbouncer=/.test(url)) return url
  return url + (url.includes('?') ? '&' : '?') + 'pgbouncer=true'
}

/**
 * A marketplace with no categories is not an empty marketplace — categories
 * are reference data that the seed writes before anything else, so zero of
 * them means the database is the wrong one, or was never seeded. Callers use
 * this to say so instead of rendering "nothing matches those filters", which
 * is what let a preview pointed at a blank database look like a working site.
 */
export function isUnconfiguredDatabase(categoryCount: number): boolean {
  return categoryCount === 0
}
