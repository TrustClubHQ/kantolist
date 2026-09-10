# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

KantoList — a trust-ranked classifieds marketplace for Philippine province
users, built on TrustClub. Next.js 15 (App Router), TypeScript, Tailwind 4,
Prisma 6 on PostgreSQL. See `README.md` for the architecture; this file covers
the things that are easy to get wrong.

**Repository**: `git@github.com:TrustClubHQ/kantolist.git`

## Sibling project

TruRate (`TrustClubHQ/trurate`) is the lending marketplace and shares this
stack, the TrustClub integration and the migration-first workflow. Code worth
reusing: `trustclub.ts`, `trustclub-oidc.ts`, the auth-session poll reservation,
and the trust-point symbols. **Do not reuse its visual style** — KantoList has
its own identity on purpose.

## Rules that matter

### Never render a failed trust lookup as 0

`getTrustPoints` returns `null` on failure and `0` when the graph genuinely has
no path. These are different facts about a real person and the UI must keep
them apart ("Trust unknown" vs "No trust path"). The same rule applies to any
value we could not fetch — show "n/a", never a default that reads as a real
measurement.

### Trust is directed

TrustClub answers "how strongly does A's network vouch for B". There is no
global score. Anything that wants "how trusted is this member" is asking a
question the API cannot answer — say so rather than approximating it (see the
posting-cap comment in `src/app/api/listings/route.ts`).

### Database changes are migration-first

The schema edit and its migration file land in the **same commit**. Production
applies migration files, not the schema. Verify with:

```bash
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma     # "No difference detected."
```

`prisma db push` is for throwaway experiments only.

### Build, don't just typecheck

`tsc --noEmit` will not catch a server-only import reaching a client bundle —
`node:crypto` in `src/lib/listing.ts` passed types and failed the build. Run
`npx next build` before claiming a change works.

### Don't put server-only imports in shared modules

`src/lib/listing.ts` is imported by client components. Anything needing
`node:*` goes in its own module (see `src/lib/code.ts`).

### Phone numbers

A full number is only ever returned to a signed-in member, and only through
`POST /api/listings/[id]/contact`. Never embed one in server-rendered HTML —
that is what stops a scraper harvesting numbers by walking every listing.

### Adding a filter

Edit the category's `attributeSchema` in `scripts/seed.ts` (or the row). Do not
add a column or a bespoke filter component — the form, the filter rail and the
detail table all read the schema.

## Design system

"Signwriter" — tokens in `src/app/globals.css`, primitives in
`src/components/ui.tsx`. Square corners, one `4px 4px 0` shadow, no gradients,
no blur. Yellow (`#F2B01E`) carries black text only. Compose the primitives
rather than re-typing borders and shadows at call sites.

## Development

```bash
npm run dev                      # dev server
npm test                         # jest
npm run lint && npm run typecheck
npx next build                   # the real compilation check
ALLOW_DESTRUCTIVE_SEED=1 npm run seed
```

`ALLOW_DEV_LOGIN=true` (non-production only) puts the seeded accounts on the
sign-in page. `juan.santos` has a pre-warmed trust cache, so trust ranking is
visible without reaching the TrustClub API.

## Memories

- When you learn something about this repo's dev process, add it here.
- The dev database can be wiped and re-seeded freely. Never clear production
  data without explicit permission.
