import Link from 'next/link'
import { SIBLING_MARKETS } from '@/lib/markets'

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t-4 border-ink bg-ground px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div>
          <p className="label m-0 text-[16px] text-muted-2">More Kanto markets</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SIBLING_MARKETS.map((m) => (
              <span key={m.key} className="label border-2 border-dim-edge px-2.5 py-1 text-[15px] text-muted">
                {m.name} <span className="text-[12px]">soon</span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm font-semibold text-muted-2">
          <Link href="/safety">Safety tips</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
        </div>
        <p className="m-0 text-xs text-muted">KantoList — built on TrustClub.</p>
      </div>
    </footer>
  )
}
