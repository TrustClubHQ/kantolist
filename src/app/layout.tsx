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
        {/* The faces above the fold: the Anton wordmark and headline, the
            Barlow Condensed labels, the Barlow body copy. @font-face in the
            app stylesheet is only discovered after that sheet parses, and a
            font request started then lands too late to beat first paint — so
            these three are asked for in the markup instead. The latin-ext
            slices (and the weights further down a page) stay lazy: the
            browser fetches them when a glyph actually needs them. */}
        {[
          'barlow-400-latin',
          'barlow-condensed-700-latin',
          'anton-400-latin',
        ].map((face) => (
          <link
            key={face}
            rel="preload"
            as="font"
            type="font/woff2"
            href={`/fonts/${face}.woff2`}
            crossOrigin="anonymous"
          />
        ))}
      </head>
      <body>
        <LanguageProvider language={language}>{children}</LanguageProvider>
      </body>
    </html>
  )
}
