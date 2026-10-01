import Link from 'next/link'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { getT } from '@/lib/i18n-server'

/**
 * A listing that is not there is a different event from a mistyped URL: it was
 * probably sold or taken down, and the useful next step is the listings rather
 * than the front page. The root 404 keeps the generic wording.
 */
export default async function ListingNotFound() {
  const t = await getT()

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg px-4 py-12 text-center">
        <p className="font-display m-0 text-[64px] leading-none text-red">404</p>
        <h1 className="font-display m-0 mt-2 text-[28px] uppercase">{t('error.notFound')}</h1>
        <p className="mt-2 text-[15px] font-semibold text-muted-2">{t('error.notFoundHelp')}</p>
        <Link
          href="/browse"
          className="font-display hard mt-5 inline-flex min-h-[54px] items-center justify-center border-[3px] border-ink bg-red px-5 text-[20px] uppercase text-ground hover:text-ground"
        >
          {t('error.browse')}
        </Link>
      </main>
      <SiteFooter />
    </div>
  )
}
