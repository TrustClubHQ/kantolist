import { unstable_cache } from 'next/cache'

import { prisma } from './prisma'

/**
 * Categories and towns, cached.
 *
 * Every page that renders a filter rail, a category picker or the front page
 * tiles reads the same ~28 rows, and they change when someone edits the seed —
 * not between two page views. Everything here is already dynamic (the header
 * knows who is signed in, listings are ranked against the viewer), so the
 * per-request work is what there is to save, and this is the cheapest of it.
 *
 * Deliberately not cached: anything about listings. A seller who publishes
 * something and does not see it has lost more than a database round trip was
 * worth.
 */
const FIVE_MINUTES = 300

export const getCategories = unstable_cache(
  async () =>
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }],
      select: { id: true, slug: true, name: true, icon: true, parentId: true, attributeSchema: true },
    }),
  ['categories'],
  { revalidate: FIVE_MINUTES, tags: ['categories'] },
)

export const getMunicipalities = unstable_cache(
  async () =>
    prisma.municipality.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, province: true },
    }),
  ['municipalities'],
  { revalidate: FIVE_MINUTES, tags: ['municipalities'] },
)
