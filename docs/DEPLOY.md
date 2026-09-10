# Deploying KantoList

Vercel + a Postgres database. `npm run build` runs `prisma migrate deploy`, so
**the database must exist and be reachable before the first deploy** — a build
against an empty or unreachable `DATABASE_URL` fails, by design.

Region is pinned to `sin1` (Singapore) in `vercel.json` — the closest Vercel
region to the Philippines.

## 1. Create the database

Any Postgres works. Vercel Postgres or Neon are the least friction, and both
hand you two URLs:

- a **pooled** URL (`...-pooler...`) for the app
- a **direct** URL for migrations

Use the pooled one as `DATABASE_URL`. `src/lib/prisma.ts` appends
`pgbouncer=true` to a `-pooler` host automatically — without it, Prisma's
prepared-statement cache breaks with `cached plan must not change result type`
the first time a deploy changes a table's shape.

## 2. Environment variables

Set these in **Project → Settings → Environment Variables** for Production
(and Preview, if you want previews to work):

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Pooled Postgres connection string |
| `AUTH_SECRET` | yes | `openssl rand -base64 32`. Signs the session cookie. |
| `TRUSTCLUB_AUTH_ISSUER` | for login | **Must end in a trailing slash**, e.g. `https://trustclub.app/v1/connect/` |
| `TRUSTCLUB_AUTH_CLIENT_ID` | for login | From the TrustClub OIDC client |
| `TRUSTCLUB_AUTH_CLIENT_SECRET` | for login | Sent as HTTP Basic on every call — the issuer must be https |
| `ALLOW_DEV_LOGIN` | never in production | Refused when `NODE_ENV=production` regardless |

Two failure modes worth knowing, because neither breaks the build:

- **No `AUTH_SECRET`** — the build succeeds and every authenticated request
  then 500s. `src/lib/auth.ts` refuses to sign with a fallback secret on
  purpose; a known signing key would be worse than an outage.
- **No TrustClub credentials** — the site works and browsing is fine, but
  `/signin` reports `not_configured` and nobody can log in or post.

## 3. Deploy

**Through the dashboard (recommended)** — Add New → Project → import
`TrustClubHQ/kantolist`. Set the variables above before the first build. Pushes
to `main` then deploy automatically.

**From a terminal:**

```bash
npx vercel link          # once, to bind this directory to the project
npx vercel --prod
```

## 4. Seed the categories

The app is useless without its category tree — the posting form and the filter
rail both read it. Against the **direct** (non-pooled) URL:

```bash
DATABASE_URL="<direct url>" npm run seed:reference
```

That writes categories and municipalities only. It is additive and idempotent:
no listings, accounts or contact records are touched, so it is safe to re-run
against a live database — and re-running it is exactly how a new filter reaches
production, since the attribute schema is deliberately overwritten each time.

Do **not** use plain `npm run seed` here. That is the development seed: it
truncates the listing tables and inserts demo accounts and listings. It refuses
to run against a non-localhost host without `ALLOW_DESTRUCTIVE_SEED=1`, which
exists precisely so nobody reaches for it out of habit.

## 5. Optional: demo content

To show the thing working before real sellers arrive:

```bash
DATABASE_URL="<direct url>" npm run seed:demo
```

77 listings across 24 fictional accounts, spread over every category and all
twelve Laguna towns, with a trust graph so ranking is visible. Idempotent — a
listing is identified by owner plus title, so re-running tops up rather than
duplicating.

Log in as `juan.santos` to see the widest trust view. Everything is invented;
the phone numbers use a non-live 0917-555 range.

**Before a real launch, delete it** — a member should not find fictional
listings next to real ones:

```sql
delete from listings where account_id in
  (select id from accounts where trustclub_id in ('juan.santos','ruben.dlc','marites.g', ...));
```

The demo photos under `public/demo/` are freely licensed Wikimedia Commons
images (see `public/demo/CREDITS.md`). Most are CC BY-SA, which **requires
visible attribution** if the site is public. They are stand-ins for
seller-supplied photos — replace them rather than shipping them.

## 6. Check it came up

```bash
curl -s https://<deployment>/api/categories | head -c 200   # tree present?
curl -s https://<deployment>/api/listings | head -c 200     # search answers?
```

Then open `/` and confirm the category grid is populated. An empty grid means
step 4 was skipped.

## Known gaps that affect a real launch

- **No photo upload**, so listings are text-only. Blob storage is not wired.
- **No phone verification**, so `phoneVerifiedAt` is never set — which means
  the larger posting allowance is unreachable and everyone is capped at 3
  active listings.
- **No expiry job.** `expiresAt` is set and filtered on at read time, so
  expired listings do disappear from search, but nothing flips their status to
  `EXPIRED` and no renewal nudge is sent.
- `/terms` and `/privacy` carry visible placeholders pending legal review.
