/**
 * Writes the demo content from scripts/demo-data.ts: accounts, listings, a
 * trust graph, contact taps and a few reports.
 *
 * Requires the reference data to exist already — run `npm run seed:reference`
 * first. This script only ADDS demo content; it never truncates, so it is safe
 * to run against a database you care about, though you probably do not want
 * fictional listings there.
 *
 * It is idempotent: a demo listing is identified by its owner plus its title,
 * and an existing one is skipped rather than duplicated. Re-running therefore
 * tops up anything new instead of doubling the board — which is what happened
 * the first time this was written, and is easy not to notice until the counts
 * look wrong.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaClient, type Prisma } from '@prisma/client'
import { DEMO_ACCOUNTS, DEMO_LISTINGS, DEMO_TRUST } from './demo-data'
import { photoForCategory } from './category-photos'
import { generateCode } from '../src/lib/code'
import { slugify, expiryFor } from '../src/lib/listing'

const prisma = new PrismaClient()

const PHOTO_DIR = join(process.cwd(), 'public', 'demo')

/**
 * Only attach a photo whose file is actually present.
 *
 * A listing_images row pointing at a missing file renders as a broken image,
 * which looks worse than no photo at all — and the CategoryMark placeholder
 * already handles the empty case deliberately. Keeping the reference in
 * demo-data.ts means dropping the file in later is enough to light it up.
 */
function availablePhotos(files: string[] | undefined): string[] {
  if (!files?.length) return []
  const present = files.filter((f) => existsSync(join(PHOTO_DIR, f)))
  const missing = files.filter((f) => !present.includes(f))
  if (missing.length) missingPhotos.push(...missing)
  return present
}

const missingPhotos: string[] = []

/**
 * A listing's own photos where it has them, otherwise its category's stock
 * shot. Every demo listing ends up with something rather than a placeholder.
 */
function photosFor(l: { images?: string[]; category: string; title: string }): string[] {
  const own = availablePhotos(l.images)
  if (own.length) return own
  const fallback = photoForCategory(l.category, l.title, (f) => existsSync(join(PHOTO_DIR, f)))
  return fallback ? [fallback] : []
}

/**
 * Deterministic PRNG so view counts and contact taps are stable across runs —
 * a demo that reshuffles its numbers every seed is hard to talk about.
 */
function makeRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

const CHANNELS = ['PHONE', 'SMS', 'MESSENGER', 'VIBER', 'TRUSTCLUB'] as const

async function main(): Promise<void> {
  const categoryCount = await prisma.category.count()
  if (categoryCount === 0) {
    throw new Error('No categories found. Run `npm run seed:reference` first.')
  }

  const municipalities = new Map(
    (await prisma.municipality.findMany({ select: { id: true, name: true } })).map((m) => [m.name, m.id]),
  )
  const categories = new Map(
    (await prisma.category.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]),
  )

  const accountIds = new Map<string, string>()
  for (const a of DEMO_ACCOUNTS) {
    const row = await prisma.account.upsert({
      where: { trustclubId: a.trustclubId },
      update: {},
      create: {
        trustclubId: a.trustclubId,
        displayName: a.displayName,
        phone: a.phone ?? null,
        phoneVerifiedAt: a.phone ? new Date() : null,
        messengerHandle: a.messenger ?? null,
        viberNumber: a.viber ?? null,
        facebookUrl: a.facebook ?? null,
        municipalityId: municipalities.get(a.municipality) ?? null,
        isStaff: a.isStaff ?? false,
      },
    })
    accountIds.set(a.trustclubId, row.id)
  }

  const random = makeRandom(20260910)
  let created = 0
  let skipped = 0
  let taps = 0

  for (const l of DEMO_LISTINGS) {
    const accountId = accountIds.get(l.owner)
    const categoryId = categories.get(l.category)
    const municipalityId = municipalities.get(l.municipality)
    if (!accountId || !categoryId || !municipalityId) {
      throw new Error(`Demo listing "${l.title}" references something that does not exist`)
    }

    const already = await prisma.listing.findFirst({
      where: { accountId, title: l.title },
      select: { id: true },
    })
    if (already) {
      skipped++
      continue
    }

    const owner = DEMO_ACCOUNTS.find((a) => a.trustclubId === l.owner)!
    const channels: string[] = ['TRUSTCLUB']
    if (owner.phone) channels.unshift('PHONE', 'SMS')
    if (owner.messenger) channels.push('MESSENGER')
    if (owner.viber) channels.push('VIBER')
    if (owner.facebook) channels.push('FACEBOOK')

    const postedAt = new Date(Date.now() - l.daysAgo * 86400_000)
    // Older listings have had longer to accumulate views.
    const views = Math.floor(random() * 40) + l.daysAgo * (3 + Math.floor(random() * 9))

    const listing = await prisma.listing.create({
      data: {
        code: generateCode(),
        accountId,
        categoryId,
        type: l.type,
        title: l.title,
        slug: slugify(l.title),
        description: l.description,
        price: l.price,
        priceUnit: l.unit,
        negotiable: l.negotiable ?? false,
        attributes: l.attributes as unknown as Prisma.InputJsonValue,
        municipalityId,
        barangay: l.barangay ?? null,
        contactChannels: channels as unknown as Prisma.InputJsonValue,
        status: l.status ?? 'ACTIVE',
        postedAt,
        expiresAt: expiryFor(l.type, postedAt),
        closedAt: l.status === 'CLOSED' ? new Date() : null,
        viewCount: views,
        images: photosFor(l).length
          ? {
              create: photosFor(l).map((url, i) => ({
                url: `/demo/${url}`,
                width: i === 0 ? 720 : 480,
                height: i === 0 ? 480 : 320,
                sortOrder: i,
              })),
            }
          : undefined,
      },
    })
    created++

    // Roughly one contact tap per twenty views, so the seller-side numbers look
    // like each other rather than being independently random.
    const tapCount = Math.floor(views / 20)
    for (let i = 0; i < tapCount; i++) {
      const viewer = DEMO_ACCOUNTS[Math.floor(random() * DEMO_ACCOUNTS.length)]
      if (viewer.trustclubId === l.owner) continue
      await prisma.contactEvent.create({
        data: {
          listingId: listing.id,
          channel: CHANNELS[Math.floor(random() * CHANNELS.length)],
          viewerAccountId: accountIds.get(viewer.trustclubId) ?? null,
          createdAt: new Date(postedAt.getTime() + random() * (Date.now() - postedAt.getTime())),
        },
      })
      taps++
    }
  }

  let trustRows = 0
  for (const [from, targets] of Object.entries(DEMO_TRUST)) {
    for (const [to, points] of Object.entries(targets)) {
      await prisma.trustChainCache.upsert({
        where: { fromId_toId: { fromId: from, toId: to } },
        update: { trustPoints: points, fetchedAt: new Date() },
        create: { fromId: from, toId: to, trustPoints: points },
      })
      trustRows++
    }
  }

  // A couple of open reports so the staff queue is not empty.
  const reportable = await prisma.listing.findMany({
    where: { title: { in: ['Rusi Classic 150, no papers', 'Oppo A17 with issue, for parts'] } },
    select: { id: true },
  })
  let reportsCreated = 0
  for (const [i, listing] of reportable.entries()) {
    const existing = await prisma.report.findFirst({
      where: { listingId: listing.id },
      select: { id: true },
    })
    if (existing) continue
    reportsCreated++
    await prisma.report.create({
      data: {
        listingId: listing.id,
        reporterAccountId: accountIds.get('weng.h') ?? null,
        reason: i === 0 ? 'PROHIBITED' : 'OTHER',
        note:
          i === 0
            ? 'Selling a motorcycle with no OR/CR — is this allowed here?'
            : 'Photos look like they were taken from another listing.',
      },
    })
  }

  if (missingPhotos.length) {
    const unique = [...new Set(missingPhotos)].sort()
    process.stdout.write(
      `Skipped ${unique.length} photo file(s) not present in public/demo: ${unique.join(', ')}\n`,
    )
  }

  process.stdout.write(
    `Demo content: ${accountIds.size} accounts, ${created} listings created` +
      (skipped ? ` (${skipped} already present, skipped)` : '') +
      `, ${taps} contact taps, ${trustRows} trust edges, ${reportsCreated} reports\n`,
  )
}

main()
  .catch((error) => {
    process.exitCode = 1
    process.stderr.write(`Demo seed failed: ${error instanceof Error ? error.message : String(error)}\n`)
  })
  .finally(() => prisma.$disconnect())
