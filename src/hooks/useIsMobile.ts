'use client'

import { useEffect, useState } from 'react'
import { isMobileUserAgent } from '@/lib/user-agent'

/**
 * SSR-safe: false during server render and the first client render, then the
 * real value after mount, so there is no hydration mismatch.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    setIsMobile(isMobileUserAgent(window.navigator.userAgent))
  }, [])
  return isMobile
}
