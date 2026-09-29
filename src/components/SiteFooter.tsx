import Link from 'next/link'

import { getT } from '@/lib/i18n-server'

export async function SiteFooter() {
  const t = await getT()

  return (
    <footer className="mt-auto border-t-4 border-ink bg-ground px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        {/* Thumb-sized: these were 20px tall, which is a miss on a phone. */}
        <div className="-my-2 flex flex-wrap gap-x-5 text-sm font-semibold text-muted-2">
          <Link href="/safety" className="flex min-h-[44px] items-center">{t('footer.safety')}</Link>
          <Link href="/terms" className="flex min-h-[44px] items-center">{t('footer.terms')}</Link>
          <Link href="/privacy" className="flex min-h-[44px] items-center">{t('footer.privacy')}</Link>
        </div>
        <p className="m-0 text-xs text-muted">{t('footer.tagline')}</p>
      </div>
    </footer>
  )
}
