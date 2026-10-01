-- Eight categories come out of the launch set: motorcycles, tricycles, cars,
-- laptops, sound and lights, transport, laundry and tutoring. Bicycles stay,
-- so Vehicles keeps one child rather than disappearing.
--
-- Their listings go with them. The alternative — reparenting to the group
-- above — leaves a listing filed under a heading, which the posting form
-- cannot produce and the detail table cannot describe. Everything hanging off
-- a listing (photos, saved rows, contact events, reports, service areas)
-- cascades on the delete.
DELETE FROM "listings"
WHERE "category_id" IN (
  SELECT "id" FROM "categories"
  WHERE "slug" IN (
    'motorcycle', 'tricycle', 'car-van-truck', 'laptop-computer',
    'sound-lights', 'transport-hauling', 'laundry', 'tutoring'
  )
);

DELETE FROM "categories"
WHERE "slug" IN (
  'motorcycle', 'tricycle', 'car-van-truck', 'laptop-computer',
  'sound-lights', 'transport-hauling', 'laundry', 'tutoring'
);

-- The group's own mark follows its remaining child.
UPDATE "categories" SET "icon" = 'bicycle' WHERE "slug" = 'vehicles';
