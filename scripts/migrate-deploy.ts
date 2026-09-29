/**
 * Run migrations, retrying while the advisory lock is held.
 *
 * `prisma migrate deploy` takes a session-level advisory lock so two of them
 * cannot run at once. Vercel builds every push, so a run of pushes a minute or
 * two apart has builds overlapping — the second reaches the lock while the
 * first still holds it, waits 10s, and fails the whole build with:
 *
 *   Error: P1002 — Timed out trying to acquire a postgres advisory lock
 *   (SELECT pg_advisory_lock(72707369)). Timeout: 10000ms
 *
 * It is worth being precise about what this is NOT, because a previous version
 * of this file guessed wrong: it is not the connection pooler. The build log
 * for the failure says "The database server was reached but timed out" while
 * connected to the DIRECT endpoint, so transaction pooling never came into it.
 * Pointing migrations at an unpooled host fixed nothing and risked a host that
 * may not exist.
 *
 * Waiting is the whole fix. The holder is another build that finishes in a
 * minute, or a killed one whose session the database reaps shortly after.
 * Anything that is not a lock timeout fails immediately — a bad credential or
 * a broken migration should not be retried for four minutes.
 */
import { spawnSync } from 'node:child_process'

/** ~4 minutes in total, which covers both a concurrent build and a reaped session. */
const BACKOFF_SECONDS = [10, 20, 30, 45, 60, 75]

function isLockContention(output: string): boolean {
  return /advisory lock/i.test(output) || /\bP1002\b/.test(output)
}

function attempt(): { ok: boolean; output: string } {
  const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    encoding: 'utf8',
    env: process.env,
  })
  const output = (result.stdout ?? '') + (result.stderr ?? '')
  process.stdout.write(output)
  return { ok: result.status === 0, output }
}

function sleep(seconds: number): void {
  // Synchronous on purpose: this is a build step, there is nothing else to do,
  // and a busy Atomics wait keeps it to one obvious mechanism.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, seconds * 1000)
}

for (let i = 0; ; i++) {
  const { ok, output } = attempt()
  if (ok) process.exit(0)

  if (!isLockContention(output)) {
    process.stderr.write('[migrate] failed for a reason that retrying cannot fix\n')
    process.exit(1)
  }

  if (i >= BACKOFF_SECONDS.length) {
    process.stderr.write(
      '[migrate] the advisory lock stayed held for about four minutes. ' +
        'Another deploy is probably still migrating — re-run this build.\n',
    )
    process.exit(1)
  }

  const wait = BACKOFF_SECONDS[i]
  process.stdout.write(
    `[migrate] another migration holds the advisory lock; waiting ${wait}s ` +
      `(attempt ${i + 2} of ${BACKOFF_SECONDS.length + 1})\n`,
  )
  sleep(wait)
}
