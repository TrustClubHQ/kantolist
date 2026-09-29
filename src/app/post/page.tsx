import { redirect } from 'next/navigation'
import { translatedTitle } from '@/lib/page-title'
import { prisma } from '@/lib/prisma'
import { getCurrentAccount } from '@/lib/auth'
import { SiteHeader } from '@/components/SiteHeader'
import { PostForm } from '@/components/PostForm'
import { parseSchema } from '@/lib/attributes'
import { photosEnabled } from '@/lib/photo-store'

export const dynamic = 'force-dynamic'
export const generateMetadata = translatedTitle('title.post')

export default async function PostPage() {
  const account = await getCurrentAccount()
  if (!account) redirect('/signin?redirect=/post')

  const [categories, municipalities] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }],
      select: { id: true, slug: true, name: true, parentId: true, attributeSchema: true },
    }),
    prisma.municipality.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, province: true } }),
  ])

  const parents = categories.filter((c) => !c.parentId)
  const tree = parents.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    children: categories
      .filter((c) => c.parentId === p.id)
      .map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        attributes: parseSchema(c.attributeSchema),
      })),
  }))

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <PostForm
        categories={tree}
        municipalities={municipalities}
        defaultMunicipalityId={account.municipalityId}
        contact={{
          phone: account.phone,
          phoneVerified: !!account.phoneVerifiedAt,
          messenger: account.messengerHandle,
          facebook: account.facebookUrl,
          viber: account.viberNumber,
        }}
        photosEnabled={photosEnabled()}
      />
    </div>
  )
}
