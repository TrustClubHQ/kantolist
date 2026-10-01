-- "Fashion & Baby" is now "Clothing". The slug moves with the name so the
-- browse URL reads /browse?category=clothing rather than carrying the old
-- heading around; its children (clothes, shoes-bags, baby-items) are untouched.
UPDATE "categories"
SET "slug" = 'clothing', "name" = 'Clothing'
WHERE "slug" = 'fashion-baby';
