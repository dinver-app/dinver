'use strict';
const { Op, Sequelize } = require('sequelize');
const {
  Restaurant,
  MenuItem,
  MenuItemTranslation,
  DrinkItem,
  DrinkItemTranslation,
  PriceCategory,
  Review,
  FoodType,
  EstablishmentType,
  EstablishmentPerk,
  MealType,
  DietaryType,
} = require('../../models');
const { calculateDistance } = require('../../utils/distance');

async function fetchPartnersBasic() {
  const partners = await Restaurant.findAll({
    where: { isClaimed: true },
    attributes: [
      'id',
      'name',
      'address',
      'place',
      'latitude',
      'longitude',
      'phone',
      'rating',
      'priceLevel',
      'slug',
      'thumbnailUrl',
      'isClaimed',
    ],
    order: [Sequelize.fn('RANDOM')],
  });
  return partners.map((r) => (r.get ? r.get() : r));
}

async function fetchRestaurantDetails(id) {
  // Reuse shape from getFullRestaurantDetails where possible (simplified)
  const restaurant = await Restaurant.findOne({
    where: { id, isClaimed: true },
    include: [
      {
        model: PriceCategory,
        as: 'priceCategory',
        attributes: ['id', 'nameEn', 'nameHr', 'icon', 'level'],
      },
    ],
    attributes: [
      'id',
      'name',
      'address',
      'place',
      'latitude',
      'longitude',
      'phone',
      'rating',
      'userRatingsTotal',
      'priceLevel',
      'thumbnailUrl',
      'slug',
      'isClaimed',
      'foodTypes',
      'establishmentTypes',
      'establishmentPerks',
      'mealTypes',
      'dietaryTypes',
      'priceCategoryId',
      'reservationEnabled',
      'websiteUrl',
      'fbUrl',
      'igUrl',
      'ttUrl',
      'email',
      'images',
      'openingHours',
      'customWorkingDays',
      'subdomain',
      'virtualTourUrl',
    ],
  });
  return restaurant ? (restaurant.get ? restaurant.get() : restaurant) : null;
}

async function searchMenuAcrossRestaurants(term) {
  if (!term) return [];
  const like = `%${term}%`;
  // Find item translations first (both menu and drink) for partner restaurants only
  const [menuTranslations, drinkTranslations] = await Promise.all([
    MenuItemTranslation.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: like } },
          { description: { [Op.iLike]: like } },
        ],
      },
      include: [
        { model: MenuItem, as: 'menuItem', attributes: ['id', 'restaurantId'] },
      ],
      limit: 100,
    }),
    DrinkItemTranslation.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: like } },
          { description: { [Op.iLike]: like } },
        ],
      },
      include: [
        {
          model: DrinkItem,
          as: 'drinkItem',
          attributes: ['id', 'restaurantId'],
        },
      ],
      limit: 100,
    }),
  ]);

  const restaurantIds = new Set();
  menuTranslations.forEach(
    (t) => t.menuItem && restaurantIds.add(t.menuItem.restaurantId),
  );
  drinkTranslations.forEach(
    (t) => t.drinkItem && restaurantIds.add(t.drinkItem.restaurantId),
  );

  if (restaurantIds.size === 0) return [];
  const restaurants = await Restaurant.findAll({
    where: { id: { [Op.in]: Array.from(restaurantIds) }, isClaimed: true },
    attributes: ['id', 'name', 'place', 'slug', 'latitude', 'longitude'],
  });
  const byId = new Map(restaurants.map((r) => [r.id, r.get ? r.get() : r]));

  const results = [];
  menuTranslations.forEach((t) => {
    const rest = t.menuItem ? byId.get(t.menuItem.restaurantId) : null;
    if (rest) results.push({ type: 'food', restaurant: rest, name: t.name });
  });
  drinkTranslations.forEach((t) => {
    const rest = t.drinkItem ? byId.get(t.drinkItem.restaurantId) : null;
    if (rest) results.push({ type: 'drink', restaurant: rest, name: t.name });
  });
  return results;
}

async function findNearbyPartners({
  latitude,
  longitude,
  radiusKm = 10,
  limit = 10,
}) {
  const partners = await fetchPartnersBasic();
  if (typeof latitude === 'undefined' || typeof longitude === 'undefined')
    return [];
  const lat = Number(latitude);
  const lon = Number(longitude);
  const filtered = partners
    .map((r) => ({
      ...r,
      distanceKm: calculateDistance(
        lat,
        lon,
        Number(r.latitude),
        Number(r.longitude),
      ),
    }))
    .filter((r) => r.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
  return filtered;
}

async function fetchTypesForRestaurant(restaurant) {
  const [
    foodTypes,
    establishmentTypes,
    establishmentPerks,
    mealTypes,
    dietaryTypes,
  ] = await Promise.all([
    FoodType.findAll({
      where: { id: { [Op.in]: restaurant.foodTypes || [] } },
      attributes: ['id', 'nameEn', 'nameHr', 'icon'],
    }),
    EstablishmentType.findAll({
      where: { id: { [Op.in]: restaurant.establishmentTypes || [] } },
      attributes: ['id', 'nameEn', 'nameHr', 'icon'],
    }),
    EstablishmentPerk.findAll({
      where: { id: { [Op.in]: restaurant.establishmentPerks || [] } },
      attributes: ['id', 'nameEn', 'nameHr', 'icon'],
    }),
    MealType.findAll({
      where: { id: { [Op.in]: restaurant.mealTypes || [] } },
      attributes: ['id', 'nameEn', 'nameHr', 'icon'],
    }),
    DietaryType.findAll({
      where: { id: { [Op.in]: restaurant.dietaryTypes || [] } },
      attributes: ['id', 'nameEn', 'nameHr', 'icon'],
    }),
  ]);
  return {
    foodTypes: foodTypes.map((t) => (t.get ? t.get() : t)),
    establishmentTypes: establishmentTypes.map((t) => (t.get ? t.get() : t)),
    establishmentPerks: establishmentPerks.map((t) => (t.get ? t.get() : t)),
    mealTypes: mealTypes.map((t) => (t.get ? t.get() : t)),
    dietaryTypes: dietaryTypes.map((t) => (t.get ? t.get() : t)),
  };
}

async function fetchReviewsSummary(restaurantId) {
  const reviews = await Review.findAll({
    where: { restaurantId, isHidden: false },
  });
  const ratings = { overall: 0, foodQuality: 0, service: 0, atmosphere: 0 };
  if (reviews.length > 0) {
    const sums = reviews.reduce(
      (acc, r) => ({
        rating: acc.rating + (r.rating || 0),
        foodQuality: acc.foodQuality + (r.foodQuality || 0),
        service: acc.service + (r.service || 0),
        atmosphere: acc.atmosphere + (r.atmosphere || 0),
      }),
      { rating: 0, foodQuality: 0, service: 0, atmosphere: 0 },
    );
    ratings.overall = Number((sums.rating / reviews.length).toFixed(2));
    ratings.foodQuality = Number(
      (sums.foodQuality / reviews.length).toFixed(2),
    );
    ratings.service = Number((sums.service / reviews.length).toFixed(2));
    ratings.atmosphere = Number((sums.atmosphere / reviews.length).toFixed(2));
  }
  return { ratings, totalReviews: reviews.length };
}

module.exports = {
  fetchPartnersBasic,
  fetchRestaurantDetails,
  searchMenuAcrossRestaurants,
  findNearbyPartners,
  fetchTypesForRestaurant,
  fetchReviewsSummary,
};
