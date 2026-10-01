'use client'

import { useState } from 'react'

import { useT } from '@/components/LanguageProvider'

/**
 * Sharing a listing is how a classified actually travels here: into a barangay
 * group chat, a Messenger thread, a Facebook post. The phone's own share sheet
 * knows which apps are installed, so it does the work where it exists; the
 * desktop fallback is the clipboard.
 */
export function ShareButton({ title, className = '' }: { title: string; className?: string }) {
  const t = useT()
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')

  async function share() {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // A dismissed share sheet is not a failure, and it lands here the same
        // way a missing one does — so fall through to the clipboard quietly.
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setState('copied')
      setTimeout(() => setState('idle'), 2500)
    } catch {
      setState('failed')
      setTimeout(() => setState('idle'), 2500)
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className={`label flex min-h-[44px] items-center gap-1.5 border-2 border-dim-edge px-3 text-[16px] text-muted hover:border-ink hover:text-red ${className}`}
    >
      <ShareMark />
      {state === 'copied' ? t('share.copied') : state === 'failed' ? t('share.failed') : t('share.action')}
    </button>
  )
}

function ShareMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  )
}
