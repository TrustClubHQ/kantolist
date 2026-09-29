import { redirect } from 'next/navigation'
import { translatedTitle } from '@/lib/page-title'
import { getCurrentAccount, isDevLoginEnabled } from '@/lib/auth'
import { SiteHeader } from '@/components/SiteHeader'
import { getT } from '@/lib/i18n-server'
import { TrustClubConnect } from '@/components/TrustClubConnect'

export const dynamic = 'force-dynamic'
export const generateMetadata = translatedTitle('title.signin')

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const [account, t] = await Promise.all([getCurrentAccount(), getT()])
  const { redirect: target } = await searchParams
  if (account) redirect(target && target.startsWith('/') ? target : '/')

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg px-4 py-8">
        <h1 className="font-display m-0 text-[34px] uppercase leading-none">
          {t('signin.title', { brand: '' }).replace('{brand}', '').trim()}{' '}
          <span className="text-red">TrustClub</span>
        </h1>
        <div className="mt-5">
          <TrustClubConnect redirectTo={target} devLoginEnabled={isDevLoginEnabled()} />
        </div>
      </main>
    </div>
  )
}
