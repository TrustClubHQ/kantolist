import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { Plate, SafetyNote } from '@/components/ui'
import { getT } from '@/lib/i18n-server'
import { translatedTitle } from '@/lib/page-title'

export const generateMetadata = translatedTitle('title.safety')

/** Six tips, by key; the text of each lives in the dictionary. */
const TIPS = ['tip1', 'tip2', 'tip3', 'tip4', 'tip5', 'tip6']

export default async function SafetyPage() {
  const t = await getT()

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <h1 className="font-display m-0 text-[34px] uppercase leading-none">{t('safety.title')}</h1>
        <p className="mt-2 text-[15px] font-semibold leading-snug text-muted-2">{t('safety.intro')}</p>

        <div className="mt-5 flex flex-col gap-3">
          {TIPS.map((tip) => (
            <Plate key={tip} className="p-3.5">
              <h2 className="font-display m-0 text-[20px] uppercase">{t(`safety.${tip}.title`)}</h2>
              <p className="m-0 mt-1.5 text-[14px] leading-relaxed text-body">
                {t(`safety.${tip}.body`)}
              </p>
            </Plate>
          ))}
        </div>

        <div className="mt-5">
          <SafetyNote>{t('safety.note')}</SafetyNote>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
