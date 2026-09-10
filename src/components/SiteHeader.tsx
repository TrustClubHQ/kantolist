import Link from 'next/link'
import { getCurrentAccount } from '@/lib/auth'
import { MarketSwitcher } from '@/components/MarketSwitcher'

/**
 * The signboard header. KantoList is one market in the Kanto family, so the
 * wordmark sits next to a switcher rather than standing alone.
 */
export async function SiteHeader({ location }: { location?: string }) {
  const account = await getCurrentAccount()

  return (
    <header className="border-b-4 border-ink bg-red">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5 text-ground hover:text-ground">
          <KaritonMark />
          <span className="font-display text-[24px] uppercase leading-none">
            Kanto<span className="text-yellow">List</span>
          </span>
        </Link>

        <MarketSwitcher />

        {location ? (
          <span className="label hidden text-[15px] text-[#FFD9A0] sm:inline">{location}</span>
        ) : null}

        <div className="ml-auto flex items-center gap-3">
          {account ? (
            <>
              <Link href="/me/listings" className="label text-[16px] text-ground hover:text-yellow">
                My listings
              </Link>
              {account.isStaff ? (
                <Link href="/admin/reports" className="label text-[16px] text-ground hover:text-yellow">
                  Reports
                </Link>
              ) : null}
            </>
          ) : (
            <Link
              href="/signin"
              className="label border-2 border-ground px-2.5 py-1 text-[15px] text-ground hover:bg-ground hover:text-red"
            >
              Log in
            </Link>
          )}
          <Link
            href="/post"
            className="label hard-sm hidden items-center gap-1.5 border-[3px] border-ink bg-yellow px-3 py-1.5 text-[16px] text-ink sm:inline-flex"
          >
            <PlusIcon />
            Post
          </Link>
        </div>
      </div>
    </header>
  )
}

function KaritonMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="3" y="9" width="20" height="12" fill="#F2B01E" stroke="#17130E" strokeWidth="2.5" />
      <circle cx="9" cy="24" r="3.5" fill="#FFF4D6" stroke="#17130E" strokeWidth="2.5" />
      <circle cx="19" cy="24" r="3.5" fill="#FFF4D6" stroke="#17130E" strokeWidth="2.5" />
      <path d="M23 12h5l1 6" stroke="#17130E" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function PlusIcon({ stroke = 'currentColor' }: { stroke?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="3.2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
