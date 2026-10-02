import { androidIntentUrl, TRUSTCLUB_ANDROID_PACKAGE } from '../src/lib/trustclub-link'
import { isAndroidUserAgent, isInAppBrowserUserAgent, isMobileUserAgent } from '../src/lib/user-agent'

const REAL = 'https://api.trustclub.app/v1/connect/?user_code=44TZ-5KBZ'

describe('androidIntentUrl', () => {
  it('names the package and keeps the whole link as the fallback', () => {
    const intent = androidIntentUrl(REAL)
    expect(intent).toBe(
      'intent://api.trustclub.app/v1/connect/?user_code=44TZ-5KBZ#Intent' +
        ';scheme=https' +
        `;package=${TRUSTCLUB_ANDROID_PACKAGE}` +
        ';S.browser_fallback_url=https%3A%2F%2Fapi.trustclub.app%2Fv1%2Fconnect%2F%3Fuser_code%3D44TZ-5KBZ' +
        ';end',
    )
  })

  it('encodes the fallback so its own query is not read as intent parameters', () => {
    // An unencoded fallback would end the intent block at the first ; or &.
    const intent = androidIntentUrl('https://trustclub.app/c/?a=1&b=2') ?? ''
    expect(intent).toContain('S.browser_fallback_url=https%3A%2F%2Ftrustclub.app%2Fc%2F%3Fa%3D1%26b%3D2;end')
  })

  it('takes subdomains of trustclub.app', () => {
    expect(androidIntentUrl('https://api.trustclub.app/x')).not.toBeNull()
    expect(androidIntentUrl('https://trustclub.app/x')).not.toBeNull()
  })

  it('refuses anything that is not TrustClub', () => {
    // Pointing the TrustClub package at someone else's address is not a
    // best-effort case, it is a different thing entirely.
    expect(androidIntentUrl('https://evil.example/x')).toBeNull()
    expect(androidIntentUrl('https://nottrustclub.app/x')).toBeNull()
    expect(androidIntentUrl('https://trustclub.app.evil.example/x')).toBeNull()
  })

  it('refuses a non-https link and a non-URL', () => {
    expect(androidIntentUrl('http://trustclub.app/x')).toBeNull()
    expect(androidIntentUrl('not a url')).toBeNull()
  })
})

describe('user agents', () => {
  const CHROME_ANDROID =
    'Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
  const MESSENGER_ANDROID =
    'Mozilla/5.0 (Linux; Android 13; SM-A135F; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.0.0 Mobile Safari/537.36 [FB_IAB/MESSENGER;FBAV/448.0.0.0;]'
  const FB_IOS =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/440.0.0.0;]'
  const DESKTOP =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

  it('spots Android only where it is Android', () => {
    expect(isAndroidUserAgent(CHROME_ANDROID)).toBe(true)
    expect(isAndroidUserAgent(MESSENGER_ANDROID)).toBe(true)
    expect(isAndroidUserAgent(DESKTOP)).toBe(false)
  })

  it('spots the embedded browsers that cannot hand off to an app', () => {
    expect(isInAppBrowserUserAgent(MESSENGER_ANDROID)).toBe(true)
    expect(isInAppBrowserUserAgent(FB_IOS)).toBe(true)
    expect(isInAppBrowserUserAgent(CHROME_ANDROID)).toBe(false)
    expect(isInAppBrowserUserAgent(DESKTOP)).toBe(false)
  })

  it('still counts an embedded browser as mobile, which is what picks the tap-through layout', () => {
    expect(isMobileUserAgent(MESSENGER_ANDROID)).toBe(true)
  })
})
