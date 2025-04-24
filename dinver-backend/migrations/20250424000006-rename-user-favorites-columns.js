'use strict';

/** @type {import('sequelize-cli').Migration} */
// UP: Rename UserFavorites columns from snake_case to camelCase
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn('UserFavorites', 'user_id', 'userId');
    await queryInterface.renameColumn(
      'UserFavorites',
      'restaurant_id',
      'restaurantId',
    );
    await queryInterface.renameColumn(
      'UserFavorites',
      'created_at',
      'createdAt',
    );
    await queryInterface.renameColumn(
      'UserFavorites',
      'updated_at',
      'updatedAt',
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameColumn('UserFavorites', 'userId', 'user_id');
    await queryInterface.renameColumn(
      'UserFavorites',
      'restaurantId',
      'restaurant_id',
    );
    await queryInterface.renameColumn(
      'UserFavorites',
      'createdAt',
      'created_at',
    );
    await queryInterface.renameColumn(
      'UserFavorites',
      'updatedAt',
      'updated_at',
    );
  },
};
