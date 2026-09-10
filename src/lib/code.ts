import { randomInt } from 'node:crypto'

/**
 * Server-only. Kept out of `listing.ts` because that module is imported by
 * client components for price formatting, and pulling `node:crypto` into a
 * client bundle fails the build.
 */

/** Base32 without the characters people misread aloud over the phone. */
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

export function generateCode(length = 6): string {
  let out = ''
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  return out
}
