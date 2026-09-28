/**
 * Seeds categories (with their attribute schemas), Laguna municipalities and
 * their adjacency, plus demo accounts and listings.
 *
 * Two modes:
 *   (default)          destructive — truncates the listing-side tables first,
 *                      then writes reference data AND demo content. For local
 *                      development only.
 *   --reference-only   additive — upserts categories and municipalities and
 *                      touches nothing else. Safe to run against production,
 *                      including a database that already holds real listings.
 *
 * The destructive mode also requires ALLOW_DESTRUCTIVE_SEED=1 whenever
 * DATABASE_URL is not a localhost host, so nobody wipes a shared database by
 * muscle memory.
 */
import { PrismaClient, type Prisma } from '@prisma/client'
import { slugify, expiryFor } from '../src/lib/listing'
import { generateCode } from '../src/lib/code'
import { LAGUNA, ADJACENT, CATEGORIES } from './reference-data'

const prisma = new PrismaClient()

const REFERENCE_ONLY = process.argv.includes('--reference-only')

function assertSafeTarget(): void {
  const url = process.env.DATABASE_URL ?? ''
  if (!url) {
    // Distinguish "no configuration" from "pointed somewhere dangerous" — the
    // fix for each is different, and conflating them sent people looking for
    // the wrong problem.
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env first.')
  }
  // Reference-only writes are additive, so they need no destructive guard.
  if (REFERENCE_ONLY) return
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url)
  if (!isLocal && process.env.ALLOW_DESTRUCTIVE_SEED !== '1') {
    throw new Error(
      'DATABASE_URL is not local. Re-run with ALLOW_DESTRUCTIVE_SEED=1 if you really mean to wipe it.',
    )
  }
}

async function clear(): Promise<void> {
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
    prisma.municipalityAdjacency.deleteMany(),
    prisma.category.deleteMany(),
    prisma.municipality.deleteMany(),
  ])
}

async function seedMunicipalities(): Promise<Map<string, string>> {
  const byName = new Map<string, string>()
  for (const name of LAGUNA) {
    const row = await prisma.municipality.upsert({
      where: { name_province: { name, province: 'Laguna' } },
      update: {},
      create: { name, province: 'Laguna' },
    })
    byName.set(name, row.id)
  }
  for (const [a, b] of ADJACENT) {
    const fromId = byName.get(a)
    const toId = byName.get(b)
    if (!fromId || !toId) continue
    await prisma.municipalityAdjacency.createMany({
      data: [
        { fromId, toId },
        { fromId: toId, toId: fromId },
      ],
      skipDuplicates: true,
    })
  }
  return byName
}

async function seedCategories(): Promise<Map<string, string>> {
  const bySlug = new Map<string, string>()
  let order = 0
  for (const parent of CATEGORIES) {
    const parentRow = await prisma.category.upsert({
      where: { slug: parent.slug },
      update: { name: parent.name, icon: parent.icon, sortOrder: order++, isActive: true },
      create: { slug: parent.slug, name: parent.name, icon: parent.icon, sortOrder: order - 1 },
    })
    bySlug.set(parent.slug, parentRow.id)
    let childOrder = 0
    for (const child of parent.children) {
      // The attribute schema is intentionally overwritten on every run: it is
      // the mechanism for shipping a new filter, so re-seeding is how a schema
      // change reaches an existing database.
      const row = await prisma.category.upsert({
        where: { slug: child.slug },
        update: {
          name: child.name,
          parentId: parentRow.id,
          sortOrder: childOrder++,
          isActive: true,
          attributeSchema: child.attributes as unknown as Prisma.InputJsonValue,
        },
        create: {
          slug: child.slug,
          name: child.name,
          parentId: parentRow.id,
          sortOrder: childOrder - 1,
          attributeSchema: child.attributes as unknown as Prisma.InputJsonValue,
        },
      })
      bySlug.set(child.slug, row.id)
    }
  }
  return bySlug
}

interface DemoListing {
  owner: string
  category: string
  type: 'SELL' | 'RENT' | 'SERVICE'
  title: string
  price: number | null
  unit: 'TOTAL' | 'PER_DAY' | 'PER_WEEK' | 'PER_JOB' | 'QUOTE'
  negotiable?: boolean
  municipality: string
  barangay?: string
  description: string
  attributes: Record<string, string | number | boolean>
  daysAgo: number
  status?: 'ACTIVE' | 'RESERVED'
}

const DEMO_ACCOUNTS = [
  { trustclubId: 'ruben.dlc', displayName: "Mang Ruben's Rentals", phone: '+639175551234', messengerHandle: 'ruben.dlc', municipality: 'Calamba' },
  { trustclubId: 'juan.santos', displayName: 'Juan Santos', phone: '+639175552345', messengerHandle: 'juan.santos', municipality: 'Calamba' },
  { trustclubId: 'lito.reyes', displayName: 'Lito Reyes', phone: '+639175553456', municipality: 'Bay' },
  { trustclubId: 'marites.g', displayName: 'Marites Garcia', phone: '+639175554567', messengerHandle: 'marites.g', municipality: 'Los Baños' },
  { trustclubId: 'boyet.motors', displayName: 'Boyet Motorworks', phone: '+639175555678', municipality: 'Los Baños' },
  { trustclubId: 'ana.cruz', displayName: 'Ana Cruz', phone: '+639175556789', municipality: 'Cabuyao' },
  { trustclubId: 'kl-staff', displayName: 'KantoList Staff', phone: null, municipality: 'Calamba', isStaff: true },
]

const DEMO_LISTINGS: DemoListing[] = [
  {
    owner: 'ruben.dlc', category: 'motorcycle', type: 'RENT',
    title: 'Honda Click 125i — daily rental', price: 450, unit: 'PER_DAY', negotiable: true,
    municipality: 'Calamba', barangay: 'Parian', daysAgo: 5,
    description:
      'Well-maintained Click 125i, change oil every month, good tires. Helmet included, second one available on request. Pick-up at Parian or delivery within Calamba for ₱150. Weekly and monthly rates negotiable for long-term renters.',
    attributes: { brand: 'Honda', model: 'Click 125i', year: 2021, displacement_cc: 125, condition: 'Used', with_or_cr: true },
  },
  {
    owner: 'juan.santos', category: 'motorcycle', type: 'SELL',
    title: 'Honda Click 125i 2021, complete papers', price: 52000, unit: 'TOTAL', negotiable: true,
    municipality: 'Calamba', daysAgo: 2,
    description: 'Second owner, all papers complete and updated. No hidden damage, always parked in a garage.',
    attributes: { brand: 'Honda', model: 'Click 125i', year: 2021, displacement_cc: 125, condition: 'Used', mileage_km: 12400, with_or_cr: true },
  },
  {
    owner: 'marites.g', category: 'motorcycle', type: 'RENT',
    title: 'Yamaha Mio Soul 115, weekly rate available', price: 2600, unit: 'PER_WEEK',
    municipality: 'Calamba', daysAgo: 5,
    description: 'Good for delivery riders. Weekly and monthly terms, deposit and valid ID required.',
    attributes: { brand: 'Yamaha', model: 'Mio Soul 115', year: 2019, displacement_cc: 115, condition: 'Used', with_or_cr: true },
  },
  {
    owner: 'ana.cruz', category: 'motorcycle', type: 'SELL',
    title: 'Honda Click 160 ABS 2022, under warranty', price: 68000, unit: 'TOTAL',
    municipality: 'Cabuyao', daysAgo: 7,
    description: 'Still under casa warranty until next year. Complete service records.',
    attributes: { brand: 'Honda', model: 'Click 160 ABS', year: 2022, displacement_cc: 160, condition: 'Used', mileage_km: 6100, with_or_cr: true },
  },
  {
    owner: 'lito.reyes', category: 'motorcycle', type: 'SELL',
    title: 'Yamaha NMAX 155 2022, all stock', price: 61500, unit: 'TOTAL',
    municipality: 'Los Baños', daysAgo: 3, status: 'RESERVED',
    description: 'All stock, nothing replaced. Reserved pending pick-up this week.',
    attributes: { brand: 'Yamaha', model: 'NMAX 155', year: 2022, displacement_cc: 155, condition: 'Used', with_or_cr: true },
  },
  {
    owner: 'lito.reyes', category: 'tricycle', type: 'SELL',
    title: 'Tricycle with franchise, Bajaj 150', price: 95000, unit: 'TOTAL', negotiable: true,
    municipality: 'Bay', daysAgo: 4,
    description: 'Franchise included and transferable. Sidecar recently repainted, body in good shape.',
    attributes: { trike_type: 'Motorcycle + sidecar', year: 2018, with_franchise: true, condition: 'Used' },
  },
  {
    owner: 'boyet.motors', category: 'repair', type: 'SERVICE',
    title: 'Motorcycle repair and tune-up, home service', price: 300, unit: 'PER_JOB',
    municipality: 'Los Baños', daysAgo: 6,
    description: 'Change oil, tune-up, electrical and brake work. Home service within Los Baños and Bay, or drop off at the shop.',
    attributes: { specialty: 'Motorcycle', home_service: true },
  },
  {
    owner: 'ana.cruz', category: 'bicycle', type: 'SELL',
    title: 'Mountain bike 26", 21-speed', price: 4500, unit: 'TOTAL', negotiable: true,
    municipality: 'Cabuyao', daysAgo: 9,
    description: 'Working condition, brakes recently serviced. Small scratches on the frame.',
    attributes: { bike_type: 'Mountain', frame_size: 'M', wheel_size_in: 26, condition: 'Used' },
  },
  {
    owner: 'marites.g', category: 'sound-lights', type: 'RENT',
    title: 'Videoke and sound system for fiestas', price: 1500, unit: 'PER_DAY', negotiable: true,
    municipality: 'Los Baños', daysAgo: 12,
    description: 'Two speakers, amplifier, two mics and basic lights. Delivery and set-up included within Los Baños.',
    attributes: { gear_type: 'Full set', wattage: 1200, condition: 'Used' },
  },
  {
    owner: 'juan.santos', category: 'transport-hauling', type: 'SERVICE',
    title: 'Hauling and lipat-bahay, closed van', price: null, unit: 'QUOTE',
    municipality: 'Calamba', daysAgo: 14,
    description: 'Closed van for moving house or delivering goods anywhere in Laguna. Message for a quote — price depends on distance and volume.',
    attributes: { vehicle: 'Van', capacity_kg: 1500 },
  },
]

async function main(): Promise<void> {
  assertSafeTarget()
  if (!REFERENCE_ONLY) await clear()

  const municipalities = await seedMunicipalities()
  const categories = await seedCategories()

  if (REFERENCE_ONLY) {
    process.stdout.write(
      `Reference data up to date: ${municipalities.size} municipalities, ${categories.size} categories. ` +
        `No listings or accounts were touched.\n`,
    )
    return
  }

  const accounts = new Map<string, string>()
  for (const a of DEMO_ACCOUNTS) {
    const row = await prisma.account.create({
      data: {
        trustclubId: a.trustclubId,
        displayName: a.displayName,
        phone: a.phone ?? null,
        phoneVerifiedAt: a.phone ? new Date() : null,
        messengerHandle: a.messengerHandle ?? null,
        municipalityId: municipalities.get(a.municipality) ?? null,
        isStaff: a.isStaff ?? false,
      },
    })
    accounts.set(a.trustclubId, row.id)
  }

  for (const l of DEMO_LISTINGS) {
    const postedAt = new Date(Date.now() - l.daysAgo * 86400_000)
    const channels: string[] = ['TRUSTCLUB']
    const owner = DEMO_ACCOUNTS.find((a) => a.trustclubId === l.owner)
    if (owner?.phone) channels.unshift('PHONE', 'SMS')
    if (owner?.messengerHandle) channels.push('MESSENGER')

    await prisma.listing.create({
      data: {
        code: generateCode(),
        accountId: accounts.get(l.owner)!,
        categoryId: categories.get(l.category)!,
        type: l.type,
        title: l.title,
        slug: slugify(l.title),
        description: l.description,
        price: l.price === null ? null : l.price,
        priceUnit: l.unit,
        negotiable: l.negotiable ?? false,
        attributes: l.attributes as unknown as Prisma.InputJsonValue,
        municipalityId: municipalities.get(l.municipality)!,
        barangay: l.barangay ?? null,
        contactChannels: channels as unknown as Prisma.InputJsonValue,
        status: l.status ?? 'ACTIVE',
        postedAt,
        expiresAt: expiryFor(l.type, postedAt),
        viewCount: Math.floor(Math.random() * 300),
      },
    })
  }

  // Pre-warm the trust cache so a fresh dev database ranks sensibly without
  // reaching the TrustClub API. Values are illustrative, not real.
  const viewer = 'juan.santos'
  const seededTrust: [string, number][] = [
    ['ruben.dlc', 320], ['marites.g', 210], ['lito.reyes', 95],
    ['boyet.motors', 45], ['ana.cruz', 0],
  ]
  for (const [to, points] of seededTrust) {
    await prisma.trustChainCache.create({ data: { fromId: viewer, toId: to, trustPoints: points } })
  }

  process.stdout.write(
    `Seeded ${municipalities.size} municipalities, ${categories.size} categories, ` +
      `${accounts.size} accounts, ${DEMO_LISTINGS.length} listings\n`,
  )
}

main()
  .catch((error) => {
    process.exitCode = 1
    process.stderr.write(`Seed failed: ${error instanceof Error ? error.message : String(error)}\n`)
  })
  .finally(() => prisma.$disconnect())
