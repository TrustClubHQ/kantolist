import type { Metadata } from 'next'

import { translate } from './i18n'
import { getLanguage } from './i18n-server'

/**
 * `generateMetadata` for a page whose title is translated:
 *
 *   export const generateMetadata = translatedTitle('title.post')
 *
 * A client page cannot export `metadata` at all, and a static `metadata`
 * export cannot see the language cookie — so the title would stay English on
 * a page whose whole body is Taglish.
 */
export function translatedTitle(key: string, rest?: Metadata) {
  return async function generateMetadata(): Promise<Metadata> {
    return { ...rest, title: translate(await getLanguage(), key) }
  }
}
