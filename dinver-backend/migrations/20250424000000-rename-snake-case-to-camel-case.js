'use strict';

/** @type {import('sequelize-cli').Migration} */
// UP: Rename snake_case to camelCase for models from Allergens to Reviews
module.exports = {
  async up(queryInterface, Sequelize) {
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

    // FoodTypes
    await queryInterface.renameColumn('FoodTypes', 'name_en', 'nameEn');
    await queryInterface.renameColumn('FoodTypes', 'name_hr', 'nameHr');

    // Ingredients
    await queryInterface.renameColumn('Ingredients', 'name_en', 'nameEn');
    await queryInterface.renameColumn('Ingredients', 'name_hr', 'nameHr');

    // Insights
    await queryInterface.renameColumn('Insights', 'name_en', 'nameEn');
    await queryInterface.renameColumn('Insights', 'name_hr', 'nameHr');
    await queryInterface.renameColumn('Insights', 'user_id', 'userId');
    await queryInterface.renameColumn(
      'Insights',
      'restaurant_id',
      'restaurantId',
    );
    await queryInterface.renameColumn('Insights', 'menu_item_id', 'menuItemId');

    // MealTypes
    await queryInterface.renameColumn('MealTypes', 'name_en', 'nameEn');
    await queryInterface.renameColumn('MealTypes', 'name_hr', 'nameHr');

    // PriceCategories
    await queryInterface.renameColumn('PriceCategories', 'name_en', 'nameEn');
    await queryInterface.renameColumn('PriceCategories', 'name_hr', 'nameHr');

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
    await queryInterface.renameColumn(
      'Restaurants',
      'photo_reference',
      'photoReference',
    );
    await queryInterface.renameColumn(
      'Restaurants',
      'business_status',
      'businessStatus',
    );
    await queryInterface.renameColumn(
      'Restaurants',
      'icon_background_color',
      'iconBackgroundColor',
    );
    await queryInterface.renameColumn(
      'Restaurants',
      'icon_mask_base_uri',
      'iconMaskBaseUri',
    );
    await queryInterface.renameColumn('Restaurants', 'plus_code', 'plusCode');
    await queryInterface.renameColumn(
      'Restaurants',
      'thumbnail_url',
      'thumbnailUrl',
    );
    await queryInterface.renameColumn(
      'Restaurants',
      'working_hours_info',
      'workingHoursInfo',
    );
    await queryInterface.renameColumn('Restaurants', 'food_types', 'foodTypes');
    await queryInterface.renameColumn(
      'Restaurants',
      'establishment_types',
      'establishmentTypes',
    );
    await queryInterface.renameColumn(
      'Restaurants',
      'establishment_perks',
      'establishmentPerks',
    );
    await queryInterface.renameColumn(
      'Restaurants',
      'website_url',
      'websiteUrl',
    );
    await queryInterface.renameColumn('Restaurants', 'fb_url', 'fbUrl');
    await queryInterface.renameColumn('Restaurants', 'ig_url', 'igUrl');
    await queryInterface.renameColumn('Restaurants', 'tt_url', 'ttUrl');
    await queryInterface.renameColumn('Restaurants', 'meal_types', 'mealTypes');
    await queryInterface.renameColumn(
      'Restaurants',
      'price_category_id',
      'priceCategoryId',
    );

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
      'is_verified_reviewer',
      'isVerifiedReviewer',
    );
    await queryInterface.renameColumn(
      'Reviews',
      'value_for_money',
      'valueForMoney',
    );
    await queryInterface.renameColumn('Reviews', 'edit_history', 'editHistory');
    await queryInterface.renameColumn('Reviews', 'edit_count', 'editCount');
    await queryInterface.renameColumn(
      'Reviews',
      'last_edited_at',
      'lastEditedAt',
    );
    await queryInterface.renameColumn('Reviews', 'is_hidden', 'isHidden');
    await queryInterface.renameColumn('Reviews', 'created_at', 'createdAt');
    await queryInterface.renameColumn('Reviews', 'updated_at', 'updatedAt');
  },

  async down(queryInterface, Sequelize) {
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

    // FoodTypes
    await queryInterface.renameColumn('FoodTypes', 'nameEn', 'name_en');
    await queryInterface.renameColumn('FoodTypes', 'nameHr', 'name_hr');

    // Ingredients
    await queryInterface.renameColumn('Ingredients', 'nameEn', 'name_en');
    await queryInterface.renameColumn('Ingredients', 'nameHr', 'name_hr');

    // Insights
    await queryInterface.renameColumn('Insights', 'nameEn', 'name_en');
    await queryInterface.renameColumn('Insights', 'nameHr', 'name_hr');
    await queryInterface.renameColumn('Insights', 'userId', 'user_id');
    await queryInterface.renameColumn(
      'Insights',
      'restaurantId',
      'restaurant_id',
    );
    await queryInterface.renameColumn('Insights', 'menuItemId', 'menu_item_id');

    // MealTypes
    await queryInterface.renameColumn('MealTypes', 'nameEn', 'name_en');
    await queryInterface.renameColumn('MealTypes', 'nameHr', 'name_hr');

    // PriceCategories
    await queryInterface.renameColumn('PriceCategories', 'nameEn', 'name_en');
    await queryInterface.renameColumn('PriceCategories', 'nameHr', 'name_hr');

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
    await queryInterface.renameColumn(
      'Restaurants',
      'photoReference',
      'photo_reference',
    );
    await queryInterface.renameColumn(
      'Restaurants',
      'businessStatus',
      'business_status',
    );
    await queryInterface.renameColumn(
      'Restaurants',
      'iconBackgroundColor',
      'icon_background_color',
    );
    await queryInterface.renameColumn(
      'Restaurants',
      'iconMaskBaseUri',
      'icon_mask_base_uri',
    );
    await queryInterface.renameColumn('Restaurants', 'plusCode', 'plus_code');
    await queryInterface.renameColumn(
      'Restaurants',
      'thumbnailUrl',
      'thumbnail_url',
    );
    await queryInterface.renameColumn(
      'Restaurants',
      'workingHoursInfo',
      'working_hours_info',
    );
    await queryInterface.renameColumn('Restaurants', 'foodTypes', 'food_types');
    await queryInterface.renameColumn(
      'Restaurants',
      'establishmentTypes',
      'establishment_types',
    );
    await queryInterface.renameColumn(
      'Restaurants',
      'establishmentPerks',
      'establishment_perks',
    );
    await queryInterface.renameColumn(
      'Restaurants',
      'websiteUrl',
      'website_url',
    );
    await queryInterface.renameColumn('Restaurants', 'fbUrl', 'fb_url');
    await queryInterface.renameColumn('Restaurants', 'igUrl', 'ig_url');
    await queryInterface.renameColumn('Restaurants', 'ttUrl', 'tt_url');
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
