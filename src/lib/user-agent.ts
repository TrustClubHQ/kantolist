/**
 * Keyword-based mobile classifier, ported from TruRate.
 *
 * Embedded browsers (Facebook, Messenger, Instagram, TikTok) all report
 * `iphone` or `android`, so they are classified as mobile by design — that is
 * the right call here, since most KantoList traffic arrives through a
 * Messenger link and needs the tap-to-open button, not a QR to scan.
 */
const MOBILE_KEYWORDS = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone']

export function isMobileUserAgent(ua: string): boolean {
  const lower = ua.toLowerCase()
  return MOBILE_KEYWORDS.some((k) => lower.includes(k))
}

/** Android specifically, because the intent: scheme is an Android thing. */
export function isAndroidUserAgent(ua: string): boolean {
  return ua.toLowerCase().includes('android')
}

/**
 * The embedded browsers that break tapping through to another app.
 *
 * Facebook's and Messenger's webviews do not honour Android App Links: an
 * https link to a site the TrustClub app has verified stays inside the webview
 * and renders as a web page, so "Connect with TrustClub" never reaches the
 * app. They block the intent: scheme too, so there is no link we can build
 * that escapes — the only way out is opening the page in a real browser, which
 * means telling the member so before they get stuck.
 *
 * Most KantoList traffic arrives through a Messenger link, so this is the
 * common case rather than an edge one.
 *
 * Matched on the markers each app appends to an otherwise ordinary mobile UA:
 * FBAN/FBAV/FB_IAB (Facebook, Messenger), Instagram, Line, and the generic
 * `; wv)` that Android WebView itself sets.
 */
const IN_APP_MARKERS = ['fban', 'fbav', 'fb_iab', 'fbios', 'instagram', 'line/', 'gsa/', '; wv)']

export function isInAppBrowserUserAgent(ua: string): boolean {
  const lower = ua.toLowerCase()
  return IN_APP_MARKERS.some((m) => lower.includes(m))
}

/**
 * Firefox on Android, which mishandles `sms:` URIs.
 *
 * Gecko rewrites the URI on the way to the SMS app — it has prepended slashes
 * to the number for years (Bugzilla 1334850) — and a `?body=` on the end makes
 * the tap do nothing at all, while `tel:` from the same sheet works. So the
 * text link goes out without its prefilled message there: a composer that
 * opens beats a nicety that does not.
 *
 * Firefox on iOS is WebKit with a Mozilla badge (FxiOS) and is not affected,
 * so this deliberately needs both markers.
 */
export function isFirefoxAndroidUserAgent(ua: string): boolean {
  const lower = ua.toLowerCase()
  return lower.includes('firefox') && lower.includes('android')
}
