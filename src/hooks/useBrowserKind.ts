'use client'

import { useEffect, useState } from 'react'
import { isAndroidUserAgent, isInAppBrowserUserAgent, isMobileUserAgent } from '@/lib/user-agent'

export interface BrowserKind {
  isMobile: boolean
  isAndroid: boolean
  /** A Facebook/Messenger/Instagram webview, which cannot hand a link to an app. */
  isInApp: boolean
}

/**
 * SSR-safe: everything false during the server render and the first client
 * render, then the real values after mount, so there is no hydration mismatch.
 */
export function useBrowserKind(): BrowserKind {
  const [kind, setKind] = useState<BrowserKind>({ isMobile: false, isAndroid: false, isInApp: false })
  useEffect(() => {
    const ua = window.navigator.userAgent
    setKind({
      isMobile: isMobileUserAgent(ua),
      isAndroid: isAndroidUserAgent(ua),
      isInApp: isInAppBrowserUserAgent(ua),
    })
  }, [])
  return kind
}
