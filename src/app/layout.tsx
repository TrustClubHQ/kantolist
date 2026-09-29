import type { Metadata, Viewport } from 'next'
import './globals.css'
import { LanguageProvider } from '@/components/LanguageProvider'
import { getLanguage } from '@/lib/i18n-server'
import { translate } from '@/lib/i18n'

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage()
  return {
    title: {
      default: translate(language, 'meta.title'),
      template: '%s · KantoList',
    },
    description: translate(language, 'meta.description'),
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#C6362B',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The language is decided here, once, from the cookie the toggle writes —
  // so the server render and the client render agree from the first paint.
  const language = await getLanguage()

  return (
    <html lang={language === 'tl' ? 'tl' : 'en'}>
      <head>
        {/* Google Fonts is loaded by link rather than next/font so a build
            without network access still succeeds — the fallback stacks in
            globals.css are metric-compatible enough to ship on. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- this is
            the App Router root layout, so the stylesheet is global; the rule
            targets the pages router's per-page <Head>. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;600;700&display=swap"
        />
      </head>
      <body>
        <LanguageProvider language={language}>{children}</LanguageProvider>
      </body>
    </html>
  )
}
