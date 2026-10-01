/**
 * Empty the marketplace, keep the reference data.
 *
 * Launch day: the database holds demo accounts and demo listings, and the
 * town's real offers are about to go in. This deletes every account and every
 * listing — and everything hanging off them — then re-upserts the categories
 * and municipalities, so the site comes up working but empty rather than
 * working and full of invented sellers.
 *
 * It runs inside the Vercel build because that is the only place with a route
 * to the database, so it is gated the same way the destructive seed is:
 * `ALLOW_PRODUCTION_RESET=1`, and nothing without it. Set the variable, deploy
 * once, then take the variable away again — left in place it would wipe the
 * marketplace on every build from then on.
 */
import { spawnSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function log(message: string): void {
  process.stdout.write(`[reset] ${message}\n`)
}

async function main(): Promise<void> {
  if (process.env.ALLOW_PRODUCTION_RESET !== '1') return

  const before = await prisma.listing.count()
  const accounts = await prisma.account.count()
  log(`wiping ${before} listings and ${accounts} accounts`)

  // Order matters even with the cascades: deleting a listing cascades to its
  // children, but nothing cascades from a category, so the reference tables
  // are left alone entirely and refreshed below instead.
  await prisma.$transaction([
    prisma.contactEvent.deleteMany(),
    prisma.report.deleteMany(),
    prisma.savedListing.deleteMany(),
    prisma.listingServiceArea.deleteMany(),
    prisma.listingImage.deleteMany(),
    prisma.listing.deleteMany(),
    prisma.trustChainCache.deleteMany(),
    prisma.authSession.deleteMany(),
    prisma.account.deleteMany(),
  ])

  // Additive: upserts the categories and municipalities, touches nothing else.
  const seeded = spawnSync('npx', ['tsx', 'scripts/seed.ts', '--reference-only'], {
    stdio: 'inherit',
    env: process.env,
  })
  if (seeded.status !== 0) throw new Error('reference data did not seed')

  const categories = await prisma.category.count()
  log(`done — ${await prisma.listing.count()} listings, ${categories} categories`)
}

main()
  .catch((error) => {
    // This one DOES fail the build. A half-wiped database is not something to
    // deploy over: better the old deployment stays up while someone looks.
    log(`failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
