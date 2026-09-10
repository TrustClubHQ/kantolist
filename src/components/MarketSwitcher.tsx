import { SIBLING_MARKETS } from '@/lib/markets'

/**
 * KantoList is one market in the Kanto family. The switcher is rendered even
 * though the siblings are not built yet, because the alternative — adding it
 * later — would mean re-teaching every returning member where things live.
 * Unbuilt markets are visibly marked rather than silently broken.
 */
export function MarketSwitcher() {
  return (
    <details className="relative">
      <summary className="label hard-sm inline-flex cursor-pointer list-none items-center gap-1.5 border-2 border-ink bg-yellow px-2.5 py-1 text-[15px] text-ink">
        Goods
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#17130E" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className="hard absolute left-0 top-full z-20 mt-2 w-60 border-[3px] border-ink bg-panel p-1.5">
        <p className="label px-2 py-1 text-[14px] text-muted">Kanto markets</p>
        <span className="label block bg-yellow px-2 py-1.5 text-[16px] text-ink">
          KantoList — goods
        </span>
        {SIBLING_MARKETS.map((m) => (
          <span
            key={m.name}
            className="label flex items-baseline justify-between gap-2 px-2 py-1.5 text-[16px] text-muted"
          >
            {m.name}
            <span className="text-[12px] text-dim-edge">soon</span>
          </span>
        ))}
      </div>
    </details>
  )
}
