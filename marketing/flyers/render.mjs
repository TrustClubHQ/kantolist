// Builds every language of every flyer in this folder, and fails if any page
// spills past one A4 sheet. Run after any copy or layout change:
//
//   node marketing/flyers/render.mjs
//
// Each flyer is one HTML file holding all its languages (see the COPY table
// at the bottom of the file), so EN and TL are always edited together.
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const LANGS = ['en', 'tl']
const here = dirname(fileURLToPath(import.meta.url))

// Playwright is not a project dependency; fall back to a global install.
const require = createRequire(import.meta.url)
let playwright
try { playwright = require('playwright') } catch {
  playwright = require(join(execSync('npm root -g').toString().trim(), 'playwright'))
}

const browser = await playwright.chromium.launch()
let failed = false
for (const file of readdirSync(here).filter((f) => f.endsWith('.html'))) {
  const base = file.replace(/\.html$/, '')
  for (const lang of LANGS) {
    const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 })
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(`file://${join(here, file)}?lang=${lang}`, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    const [scroll, client] = await page.evaluate(() => {
      const p = document.querySelector('.page')
      return [p.scrollHeight, p.clientHeight]
    })
    const out = join(here, `${base}-${lang}`)
    await page.pdf({ path: `${out}.pdf`, format: 'A4', printBackground: true, preferCSSPageSize: true })
    await page.screenshot({ path: `${out}.png`, fullPage: true })
    const overflow = scroll - client
    const ok = overflow <= 0 && errors.length === 0
    if (!ok) failed = true
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${base}-${lang}` +
      (overflow > 0 ? `  overflows A4 by ${overflow}px` : '') +
      (errors.length ? `  ${errors.join('; ')}` : ''))
    await page.close()
  }
}
await browser.close()
process.exit(failed ? 1 : 0)
