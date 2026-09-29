'use client'

import { createContext, useContext, type ReactNode } from 'react'

import { translatorFor, type Language, type T } from '@/lib/i18n'

/**
 * The language, for client components.
 *
 * Seeded from the server, from the cookie the toggle writes — not read from
 * localStorage on mount. Deciding the language in an effect means the first
 * paint is in the wrong language and then flips, and a provider that returns
 * null until it knows means the page arrives blank. Server and client render
 * the same words on the first pass because they read the same cookie.
 */
const LanguageContext = createContext<{ language: Language; t: T } | null>(null)

export function LanguageProvider({ language, children }: { language: Language; children: ReactNode }) {
  return (
    <LanguageContext.Provider value={{ language, t: translatorFor(language) }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider')
  return context
}

/** The common case: just the translator. */
export function useT(): T {
  return useLanguage().t
}
