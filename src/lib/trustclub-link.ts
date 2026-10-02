/**
 * Turning TrustClub's verification URL into something an Android phone opens
 * in the app rather than in a browser tab.
 *
 * TrustClub hands us `verification_uri_complete` — today
 * `https://api.trustclub.app/v1/connect/?user_code=XXXX-XXXX` — and both
 * trustclub.app and api.trustclub.app publish an assetlinks.json delegating
 * those URLs to the `com.app.trustclub` app. So on Chrome with the app
 * installed, the plain https link already opens it.
 *
 * It does not always get that far. Android only honours an App Link when the
 * browser hands it to the system, and a member who followed a KantoList link
 * out of Messenger is inside a webview that does not. The intent: form is the
 * standard way to ask for the app by name instead of hoping, and its
 * browser_fallback_url keeps the no-app case working: Android opens the https
 * page instead of showing an error.
 */

/** The app the verification link belongs to — see the assetlinks on both hosts. */
export const TRUSTCLUB_ANDROID_PACKAGE = 'com.app.trustclub'

/** Its Play listing. NOT `app.trustclub.android`, which 404s — that is the id
 *  TrustClub's own fallback page links to, and it is wrong. */
export const TRUSTCLUB_PLAY_URL =
  'https://play.google.com/store/apps/details?id=com.app.trustclub'

/** Hosts whose links the TrustClub app is registered to handle. */
const TRUSTCLUB_HOSTS = ['trustclub.app']

function isTrustclubHost(host: string): boolean {
  const lower = host.toLowerCase()
  return TRUSTCLUB_HOSTS.some((h) => lower === h || lower.endsWith(`.${h}`))
}

/**
 * The intent: URL for a TrustClub https link, or null if it is not one.
 *
 * Null rather than a best effort on anything else: an intent: URL names a
 * package to hand the link to, so building one for a URL we do not recognise
 * would be pointing an arbitrary address at an app we only know handles
 * TrustClub's own.
 */
export function androidIntentUrl(verificationUri: string): string | null {
  let url: URL
  try {
    url = new URL(verificationUri)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  if (!isTrustclubHost(url.hostname)) return null

  // Everything after the scheme, then the Intent block. The fallback has to be
  // encoded: it carries its own ? and &, which would otherwise be read as part
  // of the intent's own parameter list.
  const target = `${url.host}${url.pathname}${url.search}`
  const fallback = encodeURIComponent(verificationUri)
  return (
    `intent://${target}#Intent` +
    `;scheme=https` +
    `;package=${TRUSTCLUB_ANDROID_PACKAGE}` +
    `;S.browser_fallback_url=${fallback}` +
    `;end`
  )
}
