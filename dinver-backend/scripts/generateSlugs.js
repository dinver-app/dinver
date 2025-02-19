const { Restaurant } = require('../models');

// Get all Restaurants
async function generateSlugs() {
  try {
    const restaurants = await Restaurant.findAll();
    for (const restaurant of restaurants) {
      const slug = await generateSlug(restaurant.name);
      await restaurant.update({
        slug: slug,
      });
      console.log(`Updated restaurant with place_id: ${restaurant.place_id}`);
    }
    console.log('Database operation completed successfully!');
  } catch (error) {
    console.error('Error generating slugs:', error);
  }
}

const generateSlug = async (name) => {
  const normalizedName = name
    .toLowerCase()
    .trim()
    .replace(/[čć]/g, 'c')
    .replace(/[š]/g, 's')
    .replace(/[ž]/g, 'z')
    .replace(/[đ]/g, 'd')
    .replace(/[^\w\s-]/g, '');

  const baseSlug = normalizedName
    .replace(/[\s]+/g, '-')
    .replace(/[^\w\-]+/g, '');

  let slug = baseSlug;
  let suffix = 1;

  while (await Restaurant.findOne({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
};

generateSlugs();

/* UPDATE SLUGS

DO $$
DECLARE
    restaurant RECORD;
    base_slug TEXT;
    slug_var TEXT;
    suffix INTEGER;
BEGIN
    -- Loop through each restaurant
    FOR restaurant IN
        SELECT id, name FROM public."Restaurants"
    LOOP
        -- Normalize the name
        base_slug := LOWER(restaurant.name);
        base_slug := REGEXP_REPLACE(base_slug, '[čć]', 'c', 'g');
        base_slug := REGEXP_REPLACE(base_slug, '[š]', 's', 'g');
        base_slug := REGEXP_REPLACE(base_slug, '[ž]', 'z', 'g');
        base_slug := REGEXP_REPLACE(base_slug, '[đ]', 'd', 'g');
        base_slug := REGEXP_REPLACE(base_slug, '[^\w\s-]', '', 'g');
        base_slug := REGEXP_REPLACE(base_slug, '\s+', '-', 'g');
        base_slug := REGEXP_REPLACE(base_slug, '[^\w-]', '', 'g');

        slug_var := base_slug;
        suffix := 1;

        -- Check for existing slugs and append a suffix if necessary
        WHILE EXISTS (SELECT 1 FROM public."Restaurants" WHERE public."Restaurants".slug = slug_var) LOOP
            slug_var := base_slug || '-' || suffix;
            suffix := suffix + 1;
        END LOOP;

        -- Update the restaurant with the new slug
        UPDATE public."Restaurants"
        SET slug = slug_var
        WHERE id = restaurant.id;

    END LOOP;
END $$;

*/

/* NonUniqueSlugs

SELECT slug, COUNT(*) as count
FROM public."Restaurants"
GROUP BY slug
HAVING COUNT(*) > 1;

*/

/* Empty or Null Slugs

SELECT * FROM public."Restaurants"
WHERE slug IS NULL OR slug = '';

*/
