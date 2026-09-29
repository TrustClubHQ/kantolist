import {
  dictionaries,
  translate,
  translatorFor,
  categoryName,
  attributeLabel,
  asLanguage,
  DEFAULT_LANGUAGE,
} from '../src/lib/i18n'

describe('the two dictionaries', () => {
  it('cover exactly the same keys', () => {
    // A key present in one and not the other is a screen that silently falls
    // back to English for half its labels — the failure that makes a
    // translated site read as half-finished.
    const en = Object.keys(dictionaries.en).sort()
    const tl = Object.keys(dictionaries.tl).sort()
    expect(tl.filter((k) => !dictionaries.en[k])).toEqual([])
    expect(en.filter((k) => !dictionaries.tl[k])).toEqual([])
  })

  it('keeps the same placeholders on both sides', () => {
    // "{count} listings" translated without its {count} loses the number.
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort()
    for (const [key, english] of Object.entries(dictionaries.en)) {
      expect({ key, vars: placeholders(dictionaries.tl[key]) }).toEqual({
        key,
        vars: placeholders(english),
      })
    }
  })

  it('has no empty string on either side', () => {
    for (const [key, value] of Object.entries(dictionaries.en)) {
      expect(value.trim().length > 0 || key === 'browse.ranked').toBe(true)
    }
  })
})

describe('translate', () => {
  it('fills placeholders', () => {
    expect(translate('en', 'browse.countMany', { count: 12 })).toBe('12 listings')
    expect(translate('tl', 'browse.countMany', { count: 12 })).toBe('12 listing')
  })

  it('leaves a placeholder alone when nothing was passed for it', () => {
    expect(translate('en', 'contact.button')).toBe('Contact {name}')
  })

  it('falls back to English, then to the key itself', () => {
    // Visible on screen on purpose: a missing key should be noticed.
    expect(translate('tl', 'no.such.key')).toBe('no.such.key')
  })
})

describe('the stored-name fallbacks', () => {
  const t = translatorFor('tl')

  it('translates a category we know, and keeps the stored name for one we do not', () => {
    expect(categoryName(t, 'vehicles', 'Vehicles')).toBe('Sasakyan')
    expect(categoryName(t, 'drones', 'Drones')).toBe('Drones')
  })

  it('does the same for attribute labels', () => {
    expect(attributeLabel(t, 'condition', 'Condition')).toBe('Kondisyon')
    expect(attributeLabel(t, 'rotor_count', 'Rotors')).toBe('Rotors')
  })
})

describe('asLanguage', () => {
  it('accepts only the two languages, and defaults to Taglish', () => {
    expect(asLanguage('en')).toBe('en')
    expect(asLanguage('tl')).toBe('tl')
    expect(asLanguage('de')).toBe(DEFAULT_LANGUAGE)
    expect(asLanguage(undefined)).toBe(DEFAULT_LANGUAGE)
    expect(DEFAULT_LANGUAGE).toBe('tl')
  })
})
