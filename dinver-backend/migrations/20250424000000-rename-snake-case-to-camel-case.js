'use strict';

/** @type {import('sequelize-cli').Migration} */
// UP: Rename snake_case to camelCase for models from Allergens to Reviews
module.exports = {
  async up(queryInterface, Sequelize) {
    // EstablishmentPerks
    await queryInterface.renameColumn(
      'EstablishmentPerks',
      'name_en',
      'nameEn',
    );
    await queryInterface.renameColumn(
      'EstablishmentPerks',
      'name_hr',
      'nameHr',
    );
    await queryInterface.renameColumn(
      'EstablishmentPerks',
      'created_at',
      'createdAt',
    );
    await queryInterface.renameColumn(
      'EstablishmentPerks',
      'updated_at',
      'updatedAt',
    );

    // EstablishmentTypes
    await queryInterface.renameColumn(
      'EstablishmentTypes',
      'name_en',
      'nameEn',
    );
    await queryInterface.renameColumn(
      'EstablishmentTypes',
      'name_hr',
      'nameHr',
    );
    await queryInterface.renameColumn(
      'EstablishmentTypes',
      'created_at',
      'createdAt',
    );
    await queryInterface.renameColumn(
      'EstablishmentTypes',
      'updated_at',
      'updatedAt',
    );

    // FoodTypes
    await queryInterface.renameColumn('FoodTypes', 'name_en', 'nameEn');
    await queryInterface.renameColumn('FoodTypes', 'name_hr', 'nameHr');
    await queryInterface.renameColumn('FoodTypes', 'created_at', 'createdAt');
    await queryInterface.renameColumn('FoodTypes', 'updated_at', 'updatedAt');

    // Ingredients
    await queryInterface.renameColumn('Ingredients', 'name_en', 'nameEn');
    await queryInterface.renameColumn('Ingredients', 'name_hr', 'nameHr');
    await queryInterface.renameColumn('Ingredients', 'created_at', 'createdAt');
    await queryInterface.renameColumn('Ingredients', 'updated_at', 'updatedAt');

    // Insights
    await queryInterface.renameColumn('Insights', 'name_en', 'nameEn');
    await queryInterface.renameColumn('Insights', 'name_hr', 'nameHr');
    await queryInterface.renameColumn('Insights', 'created_at', 'createdAt');
    await queryInterface.renameColumn('Insights', 'updated_at', 'updatedAt');

    // MealTypes
    await queryInterface.renameColumn('MealTypes', 'name_en', 'nameEn');
    await queryInterface.renameColumn('MealTypes', 'name_hr', 'nameHr');
    await queryInterface.renameColumn('MealTypes', 'created_at', 'createdAt');
    await queryInterface.renameColumn('MealTypes', 'updated_at', 'updatedAt');

    // PriceCategories
    await queryInterface.renameColumn('PriceCategories', 'name_en', 'nameEn');
    await queryInterface.renameColumn('PriceCategories', 'name_hr', 'nameHr');
    await queryInterface.renameColumn(
      'PriceCategories',
      'created_at',
      'createdAt',
    );
    await queryInterface.renameColumn(
      'PriceCategories',
      'updated_at',
      'updatedAt',
    );

    // Restaurants
    await queryInterface.renameColumn('Restaurants', 'place_id', 'placeId');
    await queryInterface.renameColumn(
      'Restaurants',
      'user_ratings_total',
      'userRatingsTotal',
    );
    await queryInterface.renameColumn(
      'Restaurants',
      'price_level',
      'priceLevel',
    );
    await queryInterface.renameColumn(
      'Restaurants',
      'opening_hours',
      'openingHours',
    );
    await queryInterface.renameColumn(
      'Restaurants',
      'is_open_now',
      'isOpenNow',
    );
    await queryInterface.renameColumn('Restaurants', 'icon_url', 'iconUrl');
    await queryInterface.renameColumn('Restaurants', 'created_at', 'createdAt');
    await queryInterface.renameColumn('Restaurants', 'updated_at', 'updatedAt');

    // Reviews
    await queryInterface.renameColumn('Reviews', 'user_id', 'userId');
    await queryInterface.renameColumn(
      'Reviews',
      'restaurant_id',
      'restaurantId',
    );
    await queryInterface.renameColumn('Reviews', 'food_quality', 'foodQuality');
    await queryInterface.renameColumn(
      'Reviews',
      'value_for_money',
      'valueForMoney',
    );
    await queryInterface.renameColumn('Reviews', 'created_at', 'createdAt');
    await queryInterface.renameColumn('Reviews', 'updated_at', 'updatedAt');
  },

  async down(queryInterface, Sequelize) {
    // EstablishmentPerks
    await queryInterface.renameColumn(
      'EstablishmentPerks',
      'nameEn',
      'name_en',
    );
    await queryInterface.renameColumn(
      'EstablishmentPerks',
      'nameHr',
      'name_hr',
    );
    await queryInterface.renameColumn(
      'EstablishmentPerks',
      'createdAt',
      'created_at',
    );
    await queryInterface.renameColumn(
      'EstablishmentPerks',
      'updatedAt',
      'updated_at',
    );

    // EstablishmentTypes
    await queryInterface.renameColumn(
      'EstablishmentTypes',
      'nameEn',
      'name_en',
    );
    await queryInterface.renameColumn(
      'EstablishmentTypes',
      'nameHr',
      'name_hr',
    );
    await queryInterface.renameColumn(
      'EstablishmentTypes',
      'createdAt',
      'created_at',
    );
    await queryInterface.renameColumn(
      'EstablishmentTypes',
      'updatedAt',
      'updated_at',
    );

    // FoodTypes
    await queryInterface.renameColumn('FoodTypes', 'nameEn', 'name_en');
    await queryInterface.renameColumn('FoodTypes', 'nameHr', 'name_hr');
    await queryInterface.renameColumn('FoodTypes', 'createdAt', 'created_at');
    await queryInterface.renameColumn('FoodTypes', 'updatedAt', 'updated_at');

    // Ingredients
    await queryInterface.renameColumn('Ingredients', 'nameEn', 'name_en');
    await queryInterface.renameColumn('Ingredients', 'nameHr', 'name_hr');
    await queryInterface.renameColumn('Ingredients', 'createdAt', 'created_at');
    await queryInterface.renameColumn('Ingredients', 'updatedAt', 'updated_at');

    // Insights
    await queryInterface.renameColumn('Insights', 'nameEn', 'name_en');
    await queryInterface.renameColumn('Insights', 'nameHr', 'name_hr');
    await queryInterface.renameColumn('Insights', 'createdAt', 'created_at');
    await queryInterface.renameColumn('Insights', 'updatedAt', 'updated_at');

    // MealTypes
    await queryInterface.renameColumn('MealTypes', 'nameEn', 'name_en');
    await queryInterface.renameColumn('MealTypes', 'nameHr', 'name_hr');
    await queryInterface.renameColumn('MealTypes', 'createdAt', 'created_at');
    await queryInterface.renameColumn('MealTypes', 'updatedAt', 'updated_at');

    // PriceCategories
    await queryInterface.renameColumn('PriceCategories', 'nameEn', 'name_en');
    await queryInterface.renameColumn('PriceCategories', 'nameHr', 'name_hr');
    await queryInterface.renameColumn(
      'PriceCategories',
      'createdAt',
      'created_at',
    );
    await queryInterface.renameColumn(
      'PriceCategories',
      'updatedAt',
      'updated_at',
    );

    // Restaurants
    await queryInterface.renameColumn('Restaurants', 'placeId', 'place_id');
    await queryInterface.renameColumn(
      'Restaurants',
      'userRatingsTotal',
      'user_ratings_total',
    );
    await queryInterface.renameColumn(
      'Restaurants',
      'priceLevel',
      'price_level',
    );
    await queryInterface.renameColumn(
      'Restaurants',
      'openingHours',
      'opening_hours',
    );
    await queryInterface.renameColumn(
      'Restaurants',
      'isOpenNow',
      'is_open_now',
    );
    await queryInterface.renameColumn('Restaurants', 'iconUrl', 'icon_url');
    await queryInterface.renameColumn('Restaurants', 'createdAt', 'created_at');
    await queryInterface.renameColumn('Restaurants', 'updatedAt', 'updated_at');

    // Reviews
    await queryInterface.renameColumn('Reviews', 'userId', 'user_id');
    await queryInterface.renameColumn(
      'Reviews',
      'restaurantId',
      'restaurant_id',
    );
    await queryInterface.renameColumn('Reviews', 'foodQuality', 'food_quality');
    await queryInterface.renameColumn(
      'Reviews',
      'valueForMoney',
      'value_for_money',
    );
    await queryInterface.renameColumn('Reviews', 'createdAt', 'created_at');
    await queryInterface.renameColumn('Reviews', 'updatedAt', 'updated_at');
  },
};
