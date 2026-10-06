import { redirect } from 'next/navigation'
import { translatedTitle } from '@/lib/page-title'
import { prisma } from '@/lib/prisma'
import { getCurrentAccount } from '@/lib/auth'
import { SiteHeader } from '@/components/SiteHeader'
import { ProfileForm } from '@/components/ProfileForm'
import Link from 'next/link'
import { getT } from '@/lib/i18n-server'

export const dynamic = 'force-dynamic'
export const generateMetadata = translatedTitle('title.profile')

export default async function ProfilePage() {
  const account = await getCurrentAccount()
  if (!account) redirect('/signin?redirect=/me/profile')

  const t = await getT()
  const municipalities = await prisma.municipality.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, province: true },
  })

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      {/* The header has no room for these at 390px, and this is where someone
          lands when they tap their own name. */}
      <nav className="mx-auto flex w-full max-w-2xl gap-2 px-4 pt-4 sm:hidden">
        <Link
          href="/me/listings"
          className="label flex min-h-[44px] flex-1 items-center justify-center border-[2.5px] border-ink bg-panel text-[16px] text-ink hover:text-ink"
        >
          {t('header.mine')}
        </Link>
        <Link
          href="/me/saved"
          className="label flex min-h-[44px] flex-1 items-center justify-center border-[2.5px] border-ink bg-panel text-[16px] text-ink hover:text-ink"
        >
          {t('header.saved')}
        </Link>
      </nav>
      <ProfileForm
        municipalities={municipalities}
        account={{
          trustclubId: account.trustclubId,
          displayName: account.displayName ?? '',
          phone: account.phone ?? '',
          phoneVerified: !!account.phoneVerifiedAt,
          facebookUrl: account.facebookUrl ?? '',
          viberNumber: account.viberNumber ?? '',
          municipalityId: account.municipalityId ?? '',
        }}
      />
    </div>
  )
}
