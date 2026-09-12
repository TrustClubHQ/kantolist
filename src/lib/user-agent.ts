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
