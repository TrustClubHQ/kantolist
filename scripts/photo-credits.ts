/**
 * Regenerates public/demo/CREDITS.md from credits.json.
 *
 * The photos are freely licensed but most are CC BY-SA, which requires visible
 * attribution wherever they are published. Keeping this generated means the
 * credits cannot drift from the files actually shipped.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(process.cwd(), 'public', 'demo')
const CREDITS = join(DIR, 'credits.json')

type Entry = [title: string, artist: string, licence: string, url: string]

function main(): void {
  if (!existsSync(CREDITS)) throw new Error('public/demo/credits.json is missing')
  const raw = JSON.parse(readFileSync(CREDITS, 'utf8')) as Record<string, Entry>
  const present = readdirSync(DIR).filter((f) => f.endsWith('.jpg')).sort()

  const missing = present.filter((f) => !raw[f])
  if (missing.length) {
    throw new Error(`No credit recorded for: ${missing.join(', ')} — every shipped photo needs one`)
  }

  const rows = present.map((file) => {
    const [title, artist, licence, url] = raw[file]
    const name = title.startsWith('File:') ? title.slice(5) : title
    return `| \`${file}\` | [${name}](${url}) | ${artist} | ${licence} |`
  })

  writeFileSync(
    join(DIR, 'CREDITS.md'),
    `# Demo photo credits

These are freely licensed images from Wikimedia Commons, used as stand-ins for
photos a seller would upload. They are **not** photographs of the listed items.

Most carry a CC BY-SA or CC BY licence, which requires attribution wherever the
image is published. If KantoList goes public with these still in place, this
page must be reachable from the site. The intended path is to replace them with
seller-supplied photos before launch.

| File | Source | Author | Licence |
| --- | --- | --- | --- |
${rows.join('\n')}

Regenerate with \`npm run photo-credits\`.
`,
  )
  process.stdout.write(`CREDITS.md written for ${present.length} photos\n`)
}

main()
