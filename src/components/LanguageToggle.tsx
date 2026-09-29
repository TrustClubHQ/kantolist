'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import { useLanguage } from '@/components/LanguageProvider'
import { LANGUAGE_COOKIE, LANGUAGE_LABEL, LANGUAGE_SHORT, type Language } from '@/lib/i18n'

/**
 * One tap, two languages.
 *
 * The choice is a cookie rather than component state because most of this site
 * renders on the server: writing it and refreshing is what makes the listing
 * page, the browse results and the page titles change language too.
 */
export function LanguageToggle() {
  const { language, t } = useLanguage()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const next: Language = language === 'en' ? 'tl' : 'en'

  function choose() {
    const oneYear = 60 * 60 * 24 * 365
    document.cookie = `${LANGUAGE_COOKIE}=${next}; path=/; max-age=${oneYear}; samesite=lax`
    startTransition(() => router.refresh())
  }

  return (
    <button
      type="button"
      onClick={choose}
      disabled={pending}
      title={t('header.languageSwitch', { language: LANGUAGE_LABEL[next] })}
      aria-label={t('header.languageSwitch', { language: LANGUAGE_LABEL[next] })}
      className="label flex min-h-[44px] min-w-[44px] items-center justify-center border-2 border-ground px-2 text-[15px] text-ground hover:bg-ground hover:text-red disabled:opacity-60"
    >
      {LANGUAGE_SHORT[language]}
    </button>
  )
}
