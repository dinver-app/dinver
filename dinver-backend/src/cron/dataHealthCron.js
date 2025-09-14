'use strict';

const {
  Restaurant,
  MenuItemTranslation,
  DrinkItemTranslation,
} = require('../../models');

async function runDataHealthChecks() {
  const problems = [];

  // Opening hours sanity
  const restaurants = await Restaurant.findAll({
    attributes: [
      'id',
      'name',
      'openingHours',
      'customWorkingDays',
      'priceCategoryId',
      'isClaimed',
    ],
  });
  for (const r of restaurants) {
    if (!r.isClaimed) continue;
    const oh = r.openingHours?.periods;
    const hasPeriods = Array.isArray(oh) && oh.length === 7;
    const hasOverride =
      r.customWorkingDays && Object.keys(r.customWorkingDays).length > 0;
    if (!hasPeriods && !hasOverride) {
      problems.push({ type: 'openingHours', id: r.id, name: r.name });
    }
    if (!r.priceCategoryId) {
      problems.push({ type: 'priceCategory.missing', id: r.id, name: r.name });
    }
  }

  // Duplicate translations by (itemId,language)
  const dupMenu = await MenuItemTranslation.findAll({
    attributes: ['menuItemId', 'language'],
    group: ['menuItemId', 'language'],
    having: 'COUNT(*) > 1',
  }).catch(() => []);
  dupMenu.forEach((d) =>
    problems.push({
      type: 'menuTranslation.duplicate',
      id: d.menuItemId,
      lang: d.language,
    }),
  );

  const dupDrink = await DrinkItemTranslation.findAll({
    attributes: ['drinkItemId', 'language'],
    group: ['drinkItemId', 'language'],
    having: 'COUNT(*) > 1',
  }).catch(() => []);
  dupDrink.forEach((d) =>
    problems.push({
      type: 'drinkTranslation.duplicate',
      id: d.drinkItemId,
      lang: d.language,
    }),
  );

  return problems;
}

module.exports = { runDataHealthChecks };

