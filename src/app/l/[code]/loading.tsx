import { Skeleton } from '@/components/ui'
import { getT } from '@/lib/i18n-server'

/** The listing page waits on two trust lookups as well as the row itself. */
export default async function ListingLoading() {
  const t = await getT()

  return (
    <div className="flex flex-col">
      <Skeleton className="h-[262px] border-b-4 border-ink" />
      <main className="mx-auto w-full max-w-3xl px-3 pt-4 sm:px-4">
        <span className="label sr-only">{t('loading.listing')}</span>
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-[26px] w-[120px]" />
          <Skeleton className="h-[30px] w-[80%]" />
          <Skeleton className="h-[34px] w-[140px]" />
          <Skeleton className="h-[18px] w-[60%]" />
        </div>
        <Skeleton className="mt-4 h-[150px] border-[3px] border-dim-edge" />
        <Skeleton className="mt-4 h-[120px] border-[3px] border-dim-edge" />
      </main>
    </div>
  )
}
