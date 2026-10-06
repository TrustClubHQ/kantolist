import { normalizeMessengerHandle } from '../src/lib/format'

/**
 * m.me answers 302 for any handle, valid or not, so a wrong one is only
 * discovered by the buyer who taps the row and finds nobody there. These are
 * the shapes people actually paste into the box.
 */
describe('normalizeMessengerHandle', () => {
  it.each([
    ['juan.delacruz', 'juan.delacruz'],
    ['@juan.delacruz', 'juan.delacruz'],
    ['  juan.delacruz  ', 'juan.delacruz'],
    ['m.me/juan.delacruz', 'juan.delacruz'],
    ['https://m.me/juan.delacruz', 'juan.delacruz'],
    ['https://www.facebook.com/juan.delacruz', 'juan.delacruz'],
    ['https://web.facebook.com/juan.delacruz/', 'juan.delacruz'],
    ['facebook.com/juan.delacruz?mibextid=ZbWKwL', 'juan.delacruz'],
    ['https://www.messenger.com/t/juan.delacruz', 'juan.delacruz'],
    ['https://fb.me/juan.delacruz', 'juan.delacruz'],
    ['juan.delacruz?mibextid=ZbWKwL', 'juan.delacruz'],
    ['https://www.facebook.com/messages/t/juan.delacruz', 'juan.delacruz'],
    // Nobody here has a username; these are the links they can actually get.
    ['https://www.facebook.com/profile.php?id=61550000000000', '61550000000000'],
    ['facebook.com/profile.php?id=61550000000000&mibextid=ZbWKwL', '61550000000000'],
    ['https://m.facebook.com/profile.php?id=61550000000000', '61550000000000'],
    ['https://www.facebook.com/people/Juan-Dela-Cruz/61550000000000/', '61550000000000'],
    ['https://m.me/61550000000000', '61550000000000'],
    ['61550000000000', '61550000000000'],
  ])('takes %s', (input, expected) => {
    expect(normalizeMessengerHandle(input)).toBe(expected)
  })

  it('refuses a display name, which is what made m.me/Juan%20Dela%20Cruz', () => {
    expect(normalizeMessengerHandle('Juan Dela Cruz')).toBeNull()
  })

  it('refuses a group invite, which is not a person', () => {
    expect(normalizeMessengerHandle('https://m.me/j/AbCdEfGhIjK/')).toBeNull()
  })

  it('refuses a profile.php with no id to resolve', () => {
    expect(normalizeMessengerHandle('https://www.facebook.com/profile.php')).toBeNull()
  })

  it('refuses the obviously-not-a-handle', () => {
    expect(normalizeMessengerHandle('')).toBeNull()
    expect(normalizeMessengerHandle('abc')).toBeNull()
    expect(normalizeMessengerHandle('juan delacruz')).toBeNull()
    expect(normalizeMessengerHandle('juan@example.com')).toBeNull()
    expect(normalizeMessengerHandle('https://m.me/')).toBeNull()
  })
})
