import { redirect } from 'next/navigation'
import { getCurrentAccount, isDevLoginEnabled } from '@/lib/auth'
import { SiteHeader } from '@/components/SiteHeader'
import { TrustClubConnect } from '@/components/TrustClubConnect'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Log in' }

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const account = await getCurrentAccount()
  const { redirect: target } = await searchParams
  if (account) redirect(target && target.startsWith('/') ? target : '/')

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg px-4 py-8">
        <h1 className="font-display m-0 text-[34px] uppercase leading-none">
          Log in with <span className="text-red">TrustClub</span>
        </h1>
        <p className="mt-2 text-[15px] font-semibold leading-snug text-muted-2">
          KantoList has no password of its own. Your TrustClub account is what puts the people your
          network vouches for at the top of every list.
        </p>
        <div className="mt-5">
          <TrustClubConnect redirectTo={target} devLoginEnabled={isDevLoginEnabled()} />
        </div>
      </main>
    </div>
  )
}
