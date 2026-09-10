# KantoList

A trust-ranked classifieds marketplace for Philippine province users, built on
[TrustClub](https://trustclub.app).

Members post things for sale, things for rent, and services they offer. Other
members browse them **ranked by their own trust path to the poster**, filtered
by category-specific attributes, price and location. There is exactly one call
to action on a listing: **contact the seller**.

KantoList deliberately does *not* handle payment, escrow, delivery or messaging.
Its job is discovery and trust signalling; the transaction happens between two
people who now have a reason to trust each other.

## One market in a family

Kanto is the family; KantoList is the goods market. `KantoRooms`,
`KantoServices`, `KantoFarm` and `KantoJobs` are planned beside it, sharing one
account, one login and one trust lookup. The market switcher in the header is
already wired for them.

## Getting started

```bash
cp .env.example .env          # fill in DATABASE_URL and AUTH_SECRET at minimum
npm install
npx prisma migrate dev        # applies migrations and seeds
npm run dev
```

Without TrustClub credentials the OIDC login cannot run. For local work set
`ALLOW_DEV_LOGIN=true` and the sign-in page offers the seeded accounts —
`juan.santos` has a pre-warmed trust cache, so trust ranking is visible
immediately.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | `prisma generate` → `migrate deploy` → `next build` |
| `npm test` | Jest unit tests |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` |
| `npm run seed` | Re-seed (destructive — see below) |

## How the pieces fit

| Path | What lives there |
| --- | --- |
| `src/lib/trustclub.ts` | Trust-chain lookups, cached, with a batched per-viewer call |
| `src/lib/trustclub-oidc.ts` | The OIDC device-authorization wire protocol |
| `src/lib/search.ts` | Search, filtering and the trust ranking pipeline |
| `src/lib/attributes.ts` | The category-attribute engine |
| `src/lib/listing.ts` | Listing rules: codes, slugs, expiry, price units |
| `src/components/ui.tsx` | The signwriter primitives |
| `src/app/api/*` | Route handlers |

### Trust ranking

Trust points are **directed**: TrustClub answers "how strongly does A's network
vouch for B", not "how trusted is B". There is no global score, so ranking is
per viewer and cannot be precomputed into an index column.

`searchListings` therefore: narrows hard in SQL → takes a bounded candidate
window ordered by recency → resolves trust for that window only, batched and
budgeted → sorts and paginates. **The tradeoff:** a listing outside the
candidate window cannot be lifted by trust however strong it is. The window is
several pages deep, so this only bites on very broad searches.

Three states are kept distinct everywhere, and a failed lookup is never
rendered as a zero:

| State | Meaning | Shown as |
| --- | --- | --- |
| a number | the viewer's network vouches for the poster | green badge, `320 TP · via @juan` |
| `0` | the graph has no path between them | grey "No trust path" |
| `null` | the lookup failed or was never made | grey "Trust unknown" |

The badge reuses TruRate's `indirect_trust_incoming` / `outgoing` symbols and
its `formatTrustPoints` abbreviations, so the number means the same thing to a
member who uses both products.

### Category attributes

A leaf category carries an `attributeSchema` — a JSON array of attribute
definitions. It drives the posting form, the filter rail and the detail table,
and is validated on write. **Adding a filter is a seed edit, not a deploy.**

```jsonc
{ "key": "displacement_cc", "label": "Engine size", "type": "int",
  "unit": "cc", "min": 25, "max": 2000, "filter": "range",
  "buckets": [{ "label": "125–155", "min": 125, "max": 155 }] }
```

### Database changes are migration-first

Production runs `prisma migrate deploy`, which applies **migration files**, not
the live schema. A schema edit without a matching migration means the deployed
client references a column the database never got. Always:

```bash
npx prisma migrate dev --name <change_name>
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma   # must print "No difference detected."
```

Seeding is destructive and refuses to run against a non-localhost
`DATABASE_URL` unless `ALLOW_DESTRUCTIVE_SEED=1` is set.

## Design: "signwriter"

Filipino vernacular signage — hand-painted jeepney lettering, sari-sari store
price boards. Flat enamel fills and hard black outlines survive a cheap LCD in
daylight, which is where province users actually shop, better than gradients
and soft shadows do.

Cream `#FFF4D6` ground, enamel red `#C6362B`, chrome yellow `#F2B01E`, jeepney
green `#1F6B4A` for trust. Square corners; one depth device (`4px 4px 0`
offset); Anton for display and Barlow Condensed for labels. **Yellow carries
black text only.** Tokens live in `src/app/globals.css`; compose
`src/components/ui.tsx` rather than re-typing the rules.

## Known gaps

- **Photo upload is not built.** The schema and rendering handle images; the
  upload endpoint does not exist yet, so listings are text-only.
- **Phone verification is not built.** `phoneVerifiedAt` exists and gates the
  larger posting allowance, but nothing sets it yet.
- **Anonymous ranking is recency.** Ranking a logged-out visitor needs an
  aggregate "incoming trust" figure that TrustClub may not expose.
- **No expiry job.** `expiresAt` is set and filtered on, but nothing flips
  `ACTIVE` to `EXPIRED` on a schedule.
- **English only.** The copy is English throughout; no `en`/`tl` layer yet.
- `/terms` and `/privacy` carry visible placeholders pending legal review.
