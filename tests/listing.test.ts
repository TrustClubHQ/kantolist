import { translatorFor } from '../src/lib/i18n'
import {
  slugify, formatPrice, listingPath, codeFromParam, parseVideoUrl, videoHostName, pastedSiteName,
  PRICE_UNITS_FOR_TYPE,
} from '@/lib/listing'
import { generateCode } from '@/lib/code'

describe('slugify', () => {
  it('makes a url-safe slug from a real title', () => {
    expect(slugify('Honda Click 125i — daily rental')).toBe('honda-click-125i-daily-rental')
    expect(slugify('Mountain bike 26", 21-speed')).toBe('mountain-bike-26-21-speed')
  })

  it('never leaves leading or trailing separators', () => {
    expect(slugify('  ¡Hola!  ')).toBe('hola')
    expect(slugify('!!!')).toBe('')
  })

  it('bounds the length so a URL stays readable', () => {
    expect(slugify('a'.repeat(200)).length).toBeLessThanOrEqual(60)
  })
})

describe('generateCode', () => {
  it('avoids characters that are misread over the phone', () => {
    const codes = Array.from({ length: 200 }, () => generateCode())
    for (const code of codes) {
      expect(code).toHaveLength(6)
      expect(code).not.toMatch(/[01IO]/)
      expect(code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]+$/)
    }
  })
})

describe('parseVideoUrl', () => {
  it('accepts the platforms sellers here actually use', () => {
    expect(parseVideoUrl('https://youtu.be/abc123')).toEqual({ url: 'https://youtu.be/abc123' })
    expect(parseVideoUrl('https://www.tiktok.com/@nena/video/7231')).toEqual({
      url: 'https://www.tiktok.com/@nena/video/7231',
    })
    expect(parseVideoUrl('https://fb.watch/xyz/')).toEqual({ url: 'https://fb.watch/xyz/' })
  })

  it('takes a link pasted without its scheme, and secures it', () => {
    expect(parseVideoUrl('youtube.com/watch?v=abc')).toEqual({ url: 'https://youtube.com/watch?v=abc' })
    expect(parseVideoUrl('http://www.facebook.com/reel/99')).toEqual({
      url: 'https://www.facebook.com/reel/99',
    })
  })

  it('treats an empty box as no video rather than an error', () => {
    expect(parseVideoUrl('')).toEqual({ url: null })
    expect(parseVideoUrl('   ')).toEqual({ url: null })
    expect(parseVideoUrl(undefined)).toEqual({ url: null })
  })

  it('refuses anywhere else, so the button cannot lead off the map', () => {
    expect(parseVideoUrl('https://example.com/video.mp4')).toHaveProperty('error')
    expect(parseVideoUrl('javascript:alert(1)')).toHaveProperty('error')
    expect(parseVideoUrl('not a link at all')).toHaveProperty('error')
  })

  it('names the platform for the button', () => {
    expect(videoHostName('https://youtu.be/abc')).toBe('YouTube')
    expect(videoHostName('https://vm.tiktok.com/abc')).toBe('TikTok')
    expect(videoHostName('https://example.com/abc')).toBeNull()
  })
})

const en = translatorFor('en')

describe('formatPrice', () => {
  it('formats pesos with the unit', () => {
    expect(formatPrice(450, 'PER_DAY', en)).toBe('₱450\u00A0/\u00A0day')
    expect(formatPrice(52000, 'TOTAL', en)).toBe('₱52,000')
  })

  it('keeps the amount and its unit on one line', () => {
    // A phone card is ~170px wide. Breaking after the slash would leave
    // "₱450 /" on its own line, which reads as a flat price of ₱450.
    const out = formatPrice(450, 'PER_DAY', en)
    expect(out).toBe('₱450\u00A0/\u00A0day')
    expect(out).not.toMatch(/ /) // no ordinary spaces to break at
  })

  it('never shows ₱0 for an absent price, which would read as free', () => {
    expect(formatPrice(null, 'TOTAL', en)).toBe('Ask')
    expect(formatPrice(undefined, null, en)).toBe('Ask')
    expect(formatPrice(null, 'QUOTE', en)).toBe('Ask for a quote')
  })

  it('shows a real zero when a zero was actually entered', () => {
    expect(formatPrice(0, 'TOTAL', en)).toBe('₱0')
  })
})

describe('PRICE_UNITS_FOR_TYPE', () => {
  it('does not let a sale be priced per day, or a rental as a one-off total', () => {
    expect(PRICE_UNITS_FOR_TYPE.SELL).toEqual(['TOTAL'])
    expect(PRICE_UNITS_FOR_TYPE.RENT).not.toContain('TOTAL')
    expect(PRICE_UNITS_FOR_TYPE.SERVICE).toContain('QUOTE')
  })
})

describe('listing paths', () => {
  it('round-trips the code out of the url segment', () => {
    const path = listingPath('7KQ4M2', 'honda-click-125i')
    expect(path).toBe('/l/7KQ4M2-honda-click-125i')
    expect(codeFromParam('7KQ4M2-honda-click-125i')).toBe('7KQ4M2')
  })

  it('upper-cases a code someone typed in lower case', () => {
    expect(codeFromParam('7kq4m2-honda')).toBe('7KQ4M2')
  })

  it('handles a slug-less url', () => {
    expect(codeFromParam('7KQ4M2')).toBe('7KQ4M2')
  })
})

/**
 * The share links people actually paste.
 *
 * vt.tiktok.com is what TikTok's own share sheet produces across much of Asia,
 * and the original exact-hostname allowlist rejected it — so a seller pasted a
 * real TikTok link and was told to paste a TikTok link. These are regression
 * cases, not hypotheticals.
 */
describe('video links people paste', () => {
  const accepted = [
    'https://vt.tiktok.com/ZSdFyqPqT/',
    'https://vm.tiktok.com/ZSdFyqPqT/',
    'https://www.tiktok.com/@seller/video/7300000000000000000',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/shorts/abc123',
    'youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.facebook.com/share/v/abc123/',
    'https://ph.facebook.com/watch/?v=123',
    'https://fb.watch/abc123/',
    'https://fb.me/abc',
  ]
  it.each(accepted)('accepts %s', (link) => {
    expect(parseVideoUrl(link)).not.toHaveProperty('error')
  })

  // The leading dot in the suffix test is what stops a lookalike domain from
  // passing as the real thing.
  const refused = [
    'https://evil-tiktok.com/x',
    'https://tiktok.com.phish.example/x',
    'https://notyoutube.com/x',
    'https://example.com/x',
  ]
  it.each(refused)('refuses %s', (link) => {
    expect(parseVideoUrl(link)).toHaveProperty('error')
  })

  it('still treats an empty box as no video rather than an error', () => {
    expect(parseVideoUrl('')).toEqual({ url: null })
    expect(parseVideoUrl('   ')).toEqual({ url: null })
    expect(parseVideoUrl(null)).toEqual({ url: null })
  })
})

describe('pastedSiteName', () => {
  it('names a real site so the message can say which one', () => {
    expect(pastedSiteName('https://www.instagram.com/reel/Cabc123/')).toBe('instagram.com')
    expect(pastedSiteName('vt.tiktok.com/ZSdFyqPqT/')).toBe('vt.tiktok.com')
  })

  it('names nothing for prose, which new URL would otherwise mangle into a host', () => {
    // "not a link at all" parses as the hostname "not%20a%20link%20at%20all",
    // and quoting that back at someone reads like a malfunction.
    expect(pastedSiteName('not a link at all')).toBeNull()
    expect(pastedSiteName('hello')).toBeNull()
    expect(pastedSiteName('')).toBeNull()
  })
})
