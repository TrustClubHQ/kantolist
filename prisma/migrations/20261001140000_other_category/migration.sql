-- A catch-all group, so random stuff has a home page tile of its own.
--
-- The previous migration gave each existing group an "Other" leaf, which
-- helps a seller whose bicycle-shaped thing is not a bicycle. It does nothing
-- for a seller whose thing belongs under no heading at all — they still had
-- to file it under a heading they knew was wrong. This is that heading.
--
-- sort_order 999 keeps it last among the groups however many are added later;
-- the seed re-numbers by array position in development and reaches the same
-- place, because it is last in the list there too.
INSERT INTO "categories" ("id", "slug", "parent_id", "name", "market", "icon", "sort_order", "is_active", "attribute_schema")
VALUES (gen_random_uuid()::text, 'other', NULL, 'Other', 'LIST', 'other', 999, true, '[]'::jsonb)
ON CONFLICT ("slug") DO NOTHING;

-- Its one leaf, named by the same rule the other groups' leaves follow. The
-- posting form only offers children — a group heading is an optgroup label
-- and cannot be selected — so the group is unusable without it.
INSERT INTO "categories" ("id", "slug", "parent_id", "name", "market", "icon", "sort_order", "is_active", "attribute_schema")
SELECT gen_random_uuid()::text, 'other-other', p."id", 'Other', p."market", NULL, 999, true, '[]'::jsonb
FROM "categories" p
WHERE p."slug" = 'other'
ON CONFLICT ("slug") DO NOTHING;
