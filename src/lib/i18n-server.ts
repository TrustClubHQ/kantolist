import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

import { asLanguage, translatorFor, LANGUAGE_COOKIE, type Language, type T } from './i18n'

/**
 * The visitor's language, on the server.
 *
 * Reading a cookie opts a route out of static rendering. Every page here is
 * already dynamic — the header shows who is signed in, and listings are ranked
 * against the viewer's own Trust Points — so this costs nothing that was not
 * already being paid.
 */
export async function getLanguage(): Promise<Language> {
  return asLanguage((await cookies()).get(LANGUAGE_COOKIE)?.value)
}

/** `const t = await getT()` in a server component, then `t('home.latest')`. */
export async function getT(): Promise<T> {
  return translatorFor(await getLanguage())
}

/**
 * The same, for an API route.
 *
 * A route's refusal is shown to the member verbatim — the post form prints
 * whatever sentence the server sent — so it has to be in their language too.
 * Read from the request rather than `cookies()` because that is what a route
 * handler has in hand.
 */
export function requestT(request: NextRequest): T {
  return translatorFor(asLanguage(request.cookies.get(LANGUAGE_COOKIE)?.value))
}
