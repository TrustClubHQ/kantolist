import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'KantoList — buy, rent and hire on your corner',
    template: '%s · KantoList',
  },
  description:
    'Classifieds for your town, ranked by the people your TrustClub network already vouches for. Sell, rent out or offer a service — then talk to the buyer directly.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#C6362B',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts is loaded by link rather than next/font so a build
            without network access still succeeds — the fallback stacks in
            globals.css are metric-compatible enough to ship on. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
