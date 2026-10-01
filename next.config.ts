import type { NextConfig } from 'next'

const ONE_YEAR = 60 * 60 * 24 * 365

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
    ],
    // Without this the optimizer answers `max-age=0, must-revalidate`, so the
    // footer logo and every listing thumbnail is revalidated on every single
    // navigation — a round trip each, for bytes that never change.
    minimumCacheTTL: ONE_YEAR,
  },
  async headers() {
    return [
      {
        // Everything under /_next/static is already immutable; /public is not,
        // and Vercel's default for it is `max-age=0, must-revalidate`. The
        // fonts are versioned by filename (see the @font-face block in
        // globals.css), so they can be cached for good.
        source: '/fonts/:file*',
        headers: [{ key: 'Cache-Control', value: `public, max-age=${ONE_YEAR}, immutable` }],
      },
    ]
  },
}

export default nextConfig
