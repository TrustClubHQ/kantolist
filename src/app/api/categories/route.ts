import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withApiHandler } from '@/lib/api'
import { parseSchema } from '@/lib/attributes'

/** The tree plus each leaf's attribute schema — what the form and filters read. */
export const GET = withApiHandler(async () => {
  const rows = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, slug: true, name: true, icon: true, parentId: true, attributeSchema: true },
  })

  const parents = rows.filter((r) => !r.parentId)
  const tree = parents.map((parent) => ({
    id: parent.id,
    slug: parent.slug,
    name: parent.name,
    icon: parent.icon,
    children: rows
      .filter((r) => r.parentId === parent.id)
      .map((child) => ({
        id: child.id,
        slug: child.slug,
        name: child.name,
        attributes: parseSchema(child.attributeSchema),
      })),
  }))

  return NextResponse.json({ categories: tree })
})
