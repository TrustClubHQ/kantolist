import Link from 'next/link'
import { SiteHeader } from '@/components/SiteHeader'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg px-4 py-12 text-center">
        <p className="font-display m-0 text-[64px] leading-none text-red">404</p>
        <h1 className="font-display m-0 mt-2 text-[28px] uppercase">That listing is gone</h1>
        <p className="mt-2 text-[15px] font-semibold text-muted-2">
          It may have been sold, closed, or taken down.
        </p>
        <Link
          href="/browse"
          className="font-display hard mt-5 inline-flex min-h-[54px] items-center justify-center border-[3px] border-ink bg-red px-5 text-[20px] uppercase text-ground hover:text-ground"
        >
          Browse listings
        </Link>
      </main>
    </div>
  )
}
