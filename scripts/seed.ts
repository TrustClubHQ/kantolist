/**
 * Seeds categories (with their attribute schemas), Laguna municipalities and
 * their adjacency, plus demo accounts and listings.
 *
 * Destructive: it truncates the listing-side tables. The ALLOW_DESTRUCTIVE_SEED
 * guard is required whenever DATABASE_URL is not a localhost host, so nobody
 * wipes a shared database by muscle memory.
 */
import { PrismaClient, type Prisma } from '@prisma/client'
import { slugify, expiryFor } from '../src/lib/listing'
import { generateCode } from '../src/lib/code'
import type { AttributeDef } from '../src/lib/attributes'

const prisma = new PrismaClient()

function assertSafeTarget(): void {
  const url = process.env.DATABASE_URL ?? ''
  if (!url) {
    // Distinguish "no configuration" from "pointed somewhere dangerous" — the
    // fix for each is different, and conflating them sent people looking for
    // the wrong problem.
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env first.')
  }
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url)
  if (!isLocal && process.env.ALLOW_DESTRUCTIVE_SEED !== '1') {
    throw new Error(
      'DATABASE_URL is not local. Re-run with ALLOW_DESTRUCTIVE_SEED=1 if you really mean to wipe it.',
    )
  }
}

const LAGUNA = [
  'Calamba', 'Los Baños', 'Bay', 'Cabuyao', 'Santa Rosa', 'Biñan',
  'San Pablo', 'Calauan', 'Victoria', 'Pila', 'Santa Cruz', 'Alaminos',
]

/** Adjacency drives the "include nearby towns" filter. Undirected; stored both ways. */
const ADJACENT: [string, string][] = [
  ['Calamba', 'Los Baños'], ['Calamba', 'Cabuyao'], ['Calamba', 'Bay'],
  ['Los Baños', 'Bay'], ['Bay', 'Calauan'], ['Calauan', 'Victoria'],
  ['Victoria', 'Pila'], ['Pila', 'Santa Cruz'], ['Cabuyao', 'Santa Rosa'],
  ['Santa Rosa', 'Biñan'], ['Calamba', 'Alaminos'], ['Alaminos', 'San Pablo'],
  ['San Pablo', 'Calauan'],
]

const CONDITION: AttributeDef = {
  key: 'condition', label: 'Condition', type: 'enum',
  options: ['Brand new', 'Used', 'For parts'], filter: 'exact', required: true,
}

interface SeedCategory {
  slug: string
  name: string
  icon?: string
  children: { slug: string; name: string; attributes: AttributeDef[] }[]
}

const CATEGORIES: SeedCategory[] = [
  {
    slug: 'vehicles', name: 'Vehicles', icon: 'motorcycle',
    children: [
      {
        slug: 'motorcycle', name: 'Motorcycle',
        attributes: [
          { key: 'brand', label: 'Brand', type: 'enum', filter: 'exact', required: true,
            options: ['Honda', 'Yamaha', 'Suzuki', 'Kawasaki', 'Rusi', 'Kymco', 'Other'] },
          { key: 'model', label: 'Model', type: 'text', filterable: false },
          { key: 'year', label: 'Year', type: 'int', min: 1970, max: 2100, filter: 'range' },
          { key: 'displacement_cc', label: 'Engine size', type: 'int', unit: 'cc', min: 25, max: 2000,
            filter: 'range', required: true,
            buckets: [
              { label: 'Under 125', max: 124 },
              { label: '125–155', min: 125, max: 155 },
              { label: '156–250', min: 156, max: 250 },
              { label: '250 and up', min: 251 },
            ] },
          CONDITION,
          { key: 'mileage_km', label: 'Mileage', type: 'int', unit: 'km', min: 0, max: 500000, filter: 'range' },
          { key: 'with_or_cr', label: 'With OR/CR', type: 'bool', filter: 'exact' },
        ],
      },
      {
        slug: 'bicycle', name: 'Bicycle',
        attributes: [
          { key: 'bike_type', label: 'Type', type: 'enum', filter: 'exact', required: true,
            options: ['Mountain', 'Road', 'BMX', 'Folding', 'E-bike', 'Kids'] },
          { key: 'frame_size', label: 'Frame size', type: 'enum', filter: 'exact',
            options: ['XS', 'S', 'M', 'L', 'XL'] },
          { key: 'wheel_size_in', label: 'Wheel size', type: 'int', unit: 'in', min: 12, max: 29, filter: 'exact' },
          CONDITION,
        ],
      },
      {
        slug: 'tricycle', name: 'Tricycle / E-trike',
        attributes: [
          { key: 'trike_type', label: 'Type', type: 'enum', filter: 'exact',
            options: ['Motorcycle + sidecar', 'E-trike'] },
          { key: 'year', label: 'Year', type: 'int', min: 1970, max: 2100, filter: 'range' },
          { key: 'with_franchise', label: 'With franchise', type: 'bool', filter: 'exact' },
          CONDITION,
        ],
      },
      {
        slug: 'car-van-truck', name: 'Car / Van / Truck',
        attributes: [
          { key: 'brand', label: 'Brand', type: 'text', filterable: false },
          { key: 'year', label: 'Year', type: 'int', min: 1960, max: 2100, filter: 'range' },
          { key: 'transmission', label: 'Transmission', type: 'enum', filter: 'exact',
            options: ['Manual', 'Automatic'] },
          { key: 'seats', label: 'Seats', type: 'int', min: 2, max: 60, filter: 'min' },
          CONDITION,
        ],
      },
    ],
  },
  {
    slug: 'electronics', name: 'Electronics', icon: 'phone',
    children: [
      {
        slug: 'phone-tablet', name: 'Phone / Tablet',
        attributes: [
          { key: 'brand', label: 'Brand', type: 'enum', filter: 'exact', required: true,
            options: ['Samsung', 'Apple', 'Xiaomi', 'Realme', 'Oppo', 'Vivo', 'Infinix', 'Other'] },
          { key: 'model', label: 'Model', type: 'text', filterable: false },
          { key: 'storage_gb', label: 'Storage', type: 'int', unit: 'GB', min: 4, max: 2048, filter: 'min' },
          CONDITION,
          { key: 'with_box', label: 'With box and charger', type: 'bool', filter: 'exact' },
        ],
      },
      {
        slug: 'laptop-computer', name: 'Laptop / Computer',
        attributes: [
          { key: 'brand', label: 'Brand', type: 'text', filterable: false },
          { key: 'ram_gb', label: 'RAM', type: 'int', unit: 'GB', min: 1, max: 256, filter: 'min' },
          { key: 'storage_gb', label: 'Storage', type: 'int', unit: 'GB', min: 8, max: 8192, filter: 'min' },
          CONDITION,
        ],
      },
      {
        slug: 'sound-lights', name: 'Sound / Lights',
        attributes: [
          { key: 'gear_type', label: 'Type', type: 'enum', filter: 'exact', required: true,
            options: ['Speaker', 'Amplifier', 'Lights', 'Full set'] },
          { key: 'wattage', label: 'Power', type: 'int', unit: 'W', min: 10, max: 20000, filter: 'min' },
          CONDITION,
        ],
      },
      {
        slug: 'appliances', name: 'Appliances',
        attributes: [
          { key: 'appliance_type', label: 'Type', type: 'text', filterable: false },
          { key: 'brand', label: 'Brand', type: 'text', filterable: false },
          CONDITION,
        ],
      },
    ],
  },
  {
    slug: 'tools-equipment', name: 'Tools & Equipment', icon: 'tools',
    children: [
      {
        slug: 'power-tools', name: 'Tools & machines',
        attributes: [
          { key: 'tool_type', label: 'Type', type: 'enum', filter: 'exact', required: true,
            options: ['Welding', 'Generator', 'Water pump', 'Power tools', 'Grass cutter', 'Other'] },
          { key: 'brand', label: 'Brand', type: 'text', filterable: false },
          { key: 'power_w', label: 'Power', type: 'int', unit: 'W', min: 10, max: 50000, filter: 'min' },
          CONDITION,
        ],
      },
    ],
  },
  {
    slug: 'home-furniture', name: 'Home & Furniture', icon: 'home',
    children: [
      {
        slug: 'furniture', name: 'Furniture',
        attributes: [
          { key: 'furniture_type', label: 'Type', type: 'text', filterable: false },
          { key: 'material', label: 'Material', type: 'enum', filter: 'exact',
            options: ['Wood', 'Rattan', 'Metal', 'Plastic', 'Upholstered'] },
          CONDITION,
        ],
      },
    ],
  },
  {
    slug: 'services', name: 'Services', icon: 'repair',
    children: [
      {
        slug: 'repair', name: 'Repair',
        attributes: [
          { key: 'specialty', label: 'Specialty', type: 'enum', filter: 'exact', required: true,
            options: ['Motorcycle', 'Appliance', 'Phone', 'Electrical', 'Plumbing', 'Aircon', 'Other'] },
          { key: 'home_service', label: 'Home service', type: 'bool', filter: 'exact' },
        ],
      },
      {
        slug: 'construction', name: 'Construction & trades',
        attributes: [
          { key: 'trade', label: 'Trade', type: 'enum', filter: 'exact', required: true,
            options: ['Mason', 'Carpenter', 'Welder', 'Painter', 'Electrician', 'Plumber'] },
          { key: 'crew_size', label: 'Crew size', type: 'int', min: 1, max: 100, filter: 'min' },
        ],
      },
      {
        slug: 'transport-hauling', name: 'Transport & hauling',
        attributes: [
          { key: 'vehicle', label: 'Vehicle', type: 'enum', filter: 'exact', required: true,
            options: ['Tricycle', 'Van', 'Truck', 'Habal-habal', 'Multicab'] },
          { key: 'capacity_kg', label: 'Capacity', type: 'int', unit: 'kg', min: 10, max: 40000, filter: 'min' },
        ],
      },
      {
        slug: 'events-food', name: 'Events & food',
        attributes: [
          { key: 'event_type', label: 'Type', type: 'enum', filter: 'exact', required: true,
            options: ['Catering', 'Lechon', 'Photo / video', 'Sound system', 'Host'] },
          { key: 'capacity_pax', label: 'Capacity', type: 'int', unit: 'pax', min: 1, max: 5000, filter: 'min' },
        ],
      },
    ],
  },
  {
    slug: 'farm-animals', name: 'Farm & Animals', icon: 'farm',
    children: [
      {
        slug: 'livestock', name: 'Livestock & poultry',
        attributes: [
          { key: 'animal', label: 'Animal', type: 'enum', filter: 'exact', required: true,
            options: ['Cattle', 'Carabao', 'Goat', 'Pig', 'Chicken', 'Duck'] },
          { key: 'breed', label: 'Breed', type: 'text', filterable: false },
          { key: 'quantity', label: 'How many', type: 'int', min: 1, max: 10000, filter: 'min' },
        ],
      },
      {
        slug: 'farm-supplies', name: 'Feeds, seedlings & equipment',
        attributes: [
          { key: 'supply_type', label: 'Type', type: 'enum', filter: 'exact',
            options: ['Feeds', 'Seedlings', 'Fertiliser', 'Equipment'] },
        ],
      },
    ],
  },
]

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
    const row = await prisma.municipality.create({ data: { name, province: 'Laguna' } })
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
    const parentRow = await prisma.category.create({
      data: { slug: parent.slug, name: parent.name, icon: parent.icon, sortOrder: order++ },
    })
    bySlug.set(parent.slug, parentRow.id)
    let childOrder = 0
    for (const child of parent.children) {
      const row = await prisma.category.create({
        data: {
          slug: child.slug,
          name: child.name,
          parentId: parentRow.id,
          sortOrder: childOrder++,
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
  await clear()

  const municipalities = await seedMunicipalities()
  const categories = await seedCategories()

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
