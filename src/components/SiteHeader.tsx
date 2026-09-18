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
      {/* One row at 390px. It used to wrap, which spent a whole band of the
          signboard on a "Log in" button sitting alone. */}
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        <Link href="/" className="flex min-h-[44px] shrink-0 items-center gap-1.5 text-ground hover:text-ground sm:gap-2.5">
          <KaritonMark />
          <span className="font-display text-[20px] uppercase leading-none sm:text-[24px]">
            Kanto<span className="text-yellow">List</span>
          </span>
        </Link>

        <div className="hidden sm:block">
          <MarketSwitcher />
        </div>

        {location ? (
          <span className="label hidden text-[15px] text-[#FFD9A0] sm:inline">{location}</span>
        ) : null}

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
          {account ? (
            <>
              {/* "My listings" is two words too many for a 390px bar. */}
              <Link
                href="/me/listings"
                className="label flex min-h-[44px] items-center px-1 text-[16px] text-ground hover:text-yellow"
              >
                <span className="sm:hidden">Mine</span>
                <span className="hidden sm:inline">My listings</span>
              </Link>
              {account.isStaff ? (
                <Link
                  href="/admin/reports"
                  className="label hidden min-h-[44px] items-center text-[16px] text-ground hover:text-yellow sm:flex"
                >
                  Reports
                </Link>
              ) : null}
            </>
          ) : (
            <Link
              href="/signin"
              className="label flex min-h-[44px] items-center border-2 border-ground px-2.5 text-[15px] text-ground hover:bg-ground hover:text-red"
            >
              Log in
            </Link>
          )}
          {/* Posting is the point of the site, so the button is on every screen
              size — it used to be sm: and up, which hid it from most users. */}
          <Link
            href="/post"
            aria-label="Post a listing"
            className="label hard-sm flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 border-[3px] border-ink bg-yellow px-2.5 text-[16px] text-ink sm:px-3"
          >
            <PlusIcon />
            <span className="hidden sm:inline">Post</span>
          </Link>
        </div>
      </div>
    </header>
  )
}

function KaritonMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true" className="sm:h-[30px] sm:w-[30px]">
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
