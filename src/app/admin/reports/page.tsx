import { redirect } from 'next/navigation'
import type { ReportStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentAccount } from '@/lib/auth'
import { SiteHeader } from '@/components/SiteHeader'
import { ReportQueue } from '@/components/ReportQueue'
import { listingPath } from '@/lib/listing'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Reports' }

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const account = await getCurrentAccount()
  if (!account) redirect('/signin?redirect=/admin/reports')
  if (!account.isStaff) redirect('/')

  const { status: raw } = await searchParams
  const status: ReportStatus = raw === 'ACTIONED' || raw === 'DISMISSED' ? raw : 'OPEN'

  const reports = await prisma.report.findMany({
    where: { status },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      listing: {
        select: {
          id: true, code: true, slug: true, title: true, status: true,
          account: { select: { trustclubId: true, displayName: true } },
        },
      },
      reporter: { select: { trustclubId: true } },
    },
  })

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <ReportQueue
        status={status}
        reports={reports.map((r) => ({
          id: r.id,
          reason: r.reason,
          note: r.note,
          createdAt: r.createdAt.toISOString(),
          reporter: r.reporter?.trustclubId ?? null,
          listing: {
            title: r.listing.title,
            href: listingPath(r.listing.code, r.listing.slug),
            status: r.listing.status,
            seller: r.listing.account.displayName ?? r.listing.account.trustclubId,
          },
        }))}
      />
    </div>
  )
}
