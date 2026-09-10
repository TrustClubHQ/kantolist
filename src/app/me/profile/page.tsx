import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentAccount } from '@/lib/auth'
import { SiteHeader } from '@/components/SiteHeader'
import { ProfileForm } from '@/components/ProfileForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'My profile' }

export default async function ProfilePage() {
  const account = await getCurrentAccount()
  if (!account) redirect('/signin?redirect=/me/profile')

  const municipalities = await prisma.municipality.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, province: true },
  })

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <ProfileForm
        municipalities={municipalities}
        account={{
          trustclubId: account.trustclubId,
          displayName: account.displayName ?? '',
          phone: account.phone ?? '',
          phoneVerified: !!account.phoneVerifiedAt,
          messengerHandle: account.messengerHandle ?? '',
          facebookUrl: account.facebookUrl ?? '',
          viberNumber: account.viberNumber ?? '',
          municipalityId: account.municipalityId ?? '',
        }}
      />
    </div>
  )
}
