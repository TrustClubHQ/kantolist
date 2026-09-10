/**
 * The Kanto family. KantoList (goods) is what this repo serves; the rest are
 * declared here so the switcher and the footer stay in one place when they
 * are built out as their own deployments sharing the same account and trust
 * lookups.
 */
export interface Market {
  key: string
  name: string
  covers: string
  href: string | null
}

export const SIBLING_MARKETS: Market[] = [
  { key: 'rooms', name: 'KantoRooms', covers: 'rooms, bedspace, houses', href: null },
  { key: 'services', name: 'KantoServices', covers: 'services and trades', href: null },
  { key: 'farm', name: 'KantoFarm', covers: 'farm, livestock, feeds', href: null },
  { key: 'jobs', name: 'KantoJobs', covers: 'jobs and sideline work', href: null },
]
