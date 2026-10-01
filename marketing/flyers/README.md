# Print flyers

A4, white page, KantoList red/yellow as ink only, so they print cleanly on an
office printer.

Every flyer ships in **English (`en`) and Taglish (`tl`)**. Both live in one
HTML file: the `COPY` table at the bottom holds every line of text per
language, and the markup pulls it in by `data-t` key. Change a line in both
languages in the same edit — a key missing from one language throws, and the
render reports it.

```bash
node marketing/flyers/render.mjs   # writes <flyer>-en/-tl .pdf and .png
```

The script fails if either language spills past one A4 page. Taglish runs
longer than English, so check the `-tl` render first. Fix an overflow by
tightening the copy before shrinking the type, and look at both PNGs before
you call it done.

Preview in a browser with `sale-bonus-a4.html#tl` (or `?lang=tl`).

| Flyer | What |
| --- | --- |
| `sale-bonus-a4` | ₱50 per new buyer, max ₱1,000/week, until 31 Oct 2026 |

Fonts are bundled in `fonts/` (Anton, Barlow, Barlow Condensed incl. the ₱
glyph) so a render does not depend on Google Fonts. `qr-kantolist.svg` points
at https://kantolist.ph.
