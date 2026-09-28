/**
 * Populate a preview database that has no data yet.
 *
 * A branch-per-preview setup hands each deploy an empty database: the build's
 * `prisma migrate deploy` creates the tables and nothing fills them, so the
 * site renders correctly with zero of everything — no listings, not even a
 * category list. This closes that gap so a preview is usable the moment it
 * finishes building.
 *
 * Two guards, and it does nothing unless BOTH hold:
 *   1. VERCEL_ENV must not be "production". Vercel sets this per deployment,
 *      unlike NODE_ENV, which is "production" for preview builds too.
 *   2. The database must be empty (zero categories). So it can only ever add
 *      the first rows — it cannot overwrite or clear anything.
 *
 * It never fails the build: a preview that deploys empty is a nuisance, a
 * preview that will not deploy is worse. Problems are reported to the log.
 */
import { spawnSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function log(message: string): void {
  process.stdout.write(`[seed-if-empty] ${message}\n`)
}

function run(script: string): boolean {
  const result = spawnSync('npx', ['tsx', script], {
    stdio: 'inherit',
    // Safe by construction: we only get here when the database is empty, so
    // the destructive mode has nothing to destroy.
    env: { ...process.env, ALLOW_DESTRUCTIVE_SEED: '1' },
  })
  return result.status === 0
}

async function main(): Promise<void> {
  if (process.env.VERCEL_ENV === 'production') {
    log('production deployment — never seeds')
    return
  }
  if (!process.env.DATABASE_URL) {
    log('no DATABASE_URL — nothing to seed')
    return
  }

  const categories = await prisma.category.count()
  if (categories > 0) {
    log(`database already has ${categories} categories — leaving it alone`)
    return
  }

  log('empty database — seeding reference data and demo content')
  if (run('scripts/seed.ts') && run('scripts/seed-demo.ts')) log('seeded')
  else log('seeding did not finish; the preview will come up empty')
}

main()
  .catch((error) => {
    // Deliberately not setting a failing exit code: see the header.
    log(`skipped: ${error instanceof Error ? error.message : String(error)}`)
  })
  .finally(() => prisma.$disconnect())
