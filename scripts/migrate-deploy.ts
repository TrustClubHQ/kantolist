/**
 * Run migrations on a direct connection.
 *
 * `prisma migrate deploy` takes a session-level advisory lock
 * (`SELECT pg_advisory_lock(...)`). Neon's `-pooler` endpoint is transaction
 * pooling, so consecutive statements can land on different backends: the lock
 * is taken on one connection and never seen by the next, and the deploy fails
 * with P1002 "Timed out trying to acquire a postgres advisory lock". It is
 * intermittent, which is worse than broken — it fails a build now and then for
 * no reason anyone can see at the time.
 *
 * Neon's direct host is the pooled host without `-pooler`, so the fix needs no
 * extra configuration. `DIRECT_URL` overrides it if one is ever set, and a URL
 * with no pooler in it (local Postgres) passes through untouched.
 *
 * Only migrations need this. The app keeps using the pooled URL at runtime,
 * which is what pooling is actually for.
 */
import { spawnSync } from 'node:child_process'

function directUrl(): string | undefined {
  const explicit = process.env.DIRECT_URL
  if (explicit) return explicit

  const url = process.env.DATABASE_URL
  if (!url || !url.includes('-pooler.')) return url

  // pgbouncer=true disables the prepared-statement cache; on a direct
  // connection it is meaningless and Prisma warns about it.
  return url.replace('-pooler.', '.').replace(/([?&])pgbouncer=true&?/, '$1').replace(/[?&]$/, '')
}

const url = directUrl()
if (url && url !== process.env.DATABASE_URL) {
  process.stdout.write('[migrate] using the direct (unpooled) endpoint for migrations\n')
}

const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  env: url ? { ...process.env, DATABASE_URL: url } : process.env,
})
process.exit(result.status ?? 1)
