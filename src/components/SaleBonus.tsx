import { getT } from '@/lib/i18n-server'

/**
 * The sale bonus, on the front page.
 *
 * Nearly everyone who opens KantoList in San Ildefonso has already heard about
 * this one — it is on the flyer, and the flyer is what brought them. So the
 * strip states the offer in a line and keeps the rules behind a disclosure:
 * the people who know do not have to read past it, and the people checking a
 * detail do not have to find a flyer.
 *
 * `<details>` rather than a modal or a page of its own: it works before any
 * JavaScript arrives, which on a province connection is most of the time
 * someone spends on the page.
 */

/** The last day the promo covers, Philippine time. */
const ENDS = new Date('2026-10-31T16:00:00.000Z')

export async function SaleBonus({ asOf = new Date() }: { asOf?: Date }) {
  if (asOf > ENDS) return null
  const t = await getT()

  return (
    <section className="border-b-4 border-ink bg-yellow">
      <details className="group mx-auto w-full max-w-6xl px-3 py-2.5 sm:px-4">
        <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-[21px] uppercase leading-none text-ink sm:text-[24px]">
            {t('bonus.headline')}
          </span>
          <span className="label text-[15px] text-ink">{t('bonus.sub')}</span>
          <span className="label ml-auto flex min-h-[32px] shrink-0 items-center gap-1 text-[15px] text-ink underline">
            {t('bonus.details')}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="transition-transform group-open:rotate-180"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </summary>

        <ol className="m-0 mt-3 flex list-none flex-col gap-2 p-0 sm:flex-row sm:gap-4">
          {['bonus.step1', 'bonus.step2', 'bonus.step3'].map((key, i) => (
            <li key={key} className="flex flex-1 items-start gap-2">
              <span className="font-display flex h-[24px] w-[24px] shrink-0 items-center justify-center border-2 border-ink bg-ink text-[14px] text-yellow">
                {i + 1}
              </span>
              <p className="m-0 text-[13px] font-semibold leading-snug text-ink">{t(key)}</p>
            </li>
          ))}
        </ol>

        <ul className="m-0 mt-2.5 flex list-none flex-col gap-1 p-0 border-t-2 border-ink pt-2.5">
          {['bonus.rule1', 'bonus.rule2', 'bonus.rule3'].map((key) => (
            <li key={key} className="m-0 text-[13px] font-semibold leading-snug text-ink">
              · {t(key)}
            </li>
          ))}
        </ul>

        <p className="m-0 mt-2 text-[12px] font-semibold leading-snug text-ink opacity-80">
          {t('bonus.cap')}
        </p>
      </details>
    </section>
  )
}
