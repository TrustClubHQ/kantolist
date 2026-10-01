'use client'

import { useEffect } from 'react'

import { useT } from '@/components/LanguageProvider'
import { logger } from '@/lib/logger'

/**
 * What a failed render looks like.
 *
 * Without this file Next shows its own bare sentence — "Application error: a
 * client-side exception has occurred" on a white page, with no way back. On a
 * province connection a dropped request is ordinary, so the failure state is
 * part of the product: say it is our problem, and give the retry that usually
 * fixes it.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT()

  useEffect(() => {
    // The digest is the only handle on the server-side stack, so it goes to
    // the console rather than nowhere.
    logger.error('render failed', { digest: error.digest, message: error.message })
  }, [error])

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-12 text-center">
      <h1 className="font-display m-0 text-[30px] uppercase leading-none">{t('error.title')}</h1>
      <p className="mt-3 text-[15px] font-semibold leading-snug text-muted-2">{t('error.help')}</p>
      <button
        type="button"
        onClick={reset}
        className="font-display hard mt-5 inline-flex min-h-[54px] items-center justify-center border-[3px] border-ink bg-red px-5 text-[20px] uppercase text-ground"
      >
        {t('error.retry')}
      </button>
    </main>
  )
}
