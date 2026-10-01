import { Skeleton } from '@/components/ui'
import { getT } from '@/lib/i18n-server'

/**
 * Browse has to hit the database and, for a signed-in viewer, TrustClub as
 * well. Without this the tap on a category looks like nothing happened, and
 * the second tap is what people do next.
 */
export default async function BrowseLoading() {
  const t = await getT()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-4 sm:px-4 lg:flex-row lg:items-start lg:gap-6 lg:py-5">
      <aside className="lg:w-[288px] lg:shrink-0">
        <Skeleton className="h-[52px] border-[3px] border-dim-edge lg:h-[420px]" />
      </aside>
      <main className="min-w-0 flex-1">
        <span className="label sr-only">{t('loading.listings')}</span>
        <Skeleton className="mb-4 h-[34px] w-[180px]" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border-[3px] border-dim-edge bg-panel">
              <Skeleton className="h-[150px] border-b-[3px] border-dim-edge" />
              <div className="flex flex-col gap-2 p-2.5">
                <Skeleton className="h-[20px] w-[70px]" />
                <Skeleton className="h-[16px] w-full" />
                <Skeleton className="h-[14px] w-[60%]" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
