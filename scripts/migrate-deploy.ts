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

function migrate(url: string | undefined): number {
  const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: url ? { ...process.env, DATABASE_URL: url } : process.env,
  })
  return result.status ?? 1
}

const pooled = process.env.DATABASE_URL
const direct = directUrl()
const rewritten = Boolean(direct && direct !== pooled)

if (rewritten) process.stdout.write('[migrate] trying the direct (unpooled) endpoint\n')

let status = migrate(direct)

// Fall back rather than fail the build. Deriving the direct host by dropping
// "-pooler" is a convention, not a guarantee: a project that does not expose
// that endpoint would otherwise turn an intermittent advisory-lock failure
// into a deploy that never succeeds at all — trading a bad day for a worse
// one. If the direct attempt fails, take the pooled connection and its known
// flakiness, and say which one ran.
if (status !== 0 && rewritten) {
  process.stdout.write(
    '[migrate] the direct endpoint did not work; retrying on the pooled one. ' +
      'If this line keeps appearing, migrations are running through the pooler ' +
      'and P1002 advisory-lock timeouts can come back.\n',
  )
  status = migrate(pooled)
}

process.exit(status)
