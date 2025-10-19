'use strict';

const { z } = require('zod');

const IntentEnum = z.enum([
  'GLOBAL_SEARCH',
  'RESTAURANT_DETAILS',
  'MENU_SEARCH_IN_RESTAURANT',
  'OPEN_NOW',
  'CLARIFY',
]);

const RouterOutputSchema = z.object({
  intent: IntentEnum,
  confidence: z.number().min(0).max(1),
  language: z.enum(['hr', 'en']).default('hr'), 
  entities: z.object({
    restaurant_name: z.string().nullable().default(null),
    restaurant_id: z.string().uuid().nullable().default(null),
    city: z.string().nullable().default(null),
    latitude: z.number().nullable().default(null),
    longitude: z.number().nullable().default(null),
    radius_km: z.number().nullable().default(60),
    menu_terms: z.array(z.string()).default([]),
    filters: z
      .object({
        priceCategoryIds: z.array(z.union([z.number(), z.string().transform(Number)])).default([]),
        foodTypeIds: z.array(z.union([z.number(), z.string().transform(Number)])).default([]),
        dietaryTypeIds: z.array(z.union([z.number(), z.string().transform(Number)])).default([]),
        establishmentTypeIds: z.array(z.union([z.number(), z.string().transform(Number)])).default([]),
        establishmentPerkIds: z.array(z.union([z.number(), z.string().transform(Number)])).default([]),
        mealTypeIds: z.array(z.union([z.number(), z.string().transform(Number)])).default([]),
        minRating: z.number().nullable().default(null),
      })
      .default({}),
    time_ref: z.string().nullable().default(null), 
  }),
});

module.exports = {
  IntentEnum,
  RouterOutputSchema,
};
