-- Every group gets an "Other" subcategory.
--
-- The posting form asks for a subcategory and only lists the specific ones:
-- the group headings are optgroup labels, which cannot be selected. So a
-- seller whose thing does not match any of the named children had no legal
-- answer, left the picker on its placeholder, and hit a publish button that
-- appeared to do nothing. An escape hatch per group is the fix; the clearer
-- error message is the other half of it.
--
-- Written against the parents already in the table rather than a hardcoded
-- list, so it covers the eight launch groups without naming them. ids are
-- uuids here because cuids are minted by the Prisma client, which a migration
-- has no access to — the slug is the stable handle either way, and the seed
-- upserts on it.
--
-- No attributes: the whole point of this leaf is that the thing does not fit
-- a shape, so it does not then demand shape-specific answers.
INSERT INTO "categories" ("id", "slug", "parent_id", "name", "market", "icon", "sort_order", "is_active", "attribute_schema")
SELECT
  gen_random_uuid()::text,
  'other-' || p."slug",
  p."id",
  'Other',
  p."market",
  NULL,
  999,
  true,
  '[]'::jsonb
FROM "categories" p
WHERE p."parent_id" IS NULL
ON CONFLICT ("slug") DO NOTHING;
