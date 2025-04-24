'use strict';

/** @type {import('sequelize-cli').Migration} */
// UP: Rename UserAdmins columns from snake_case to camelCase
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn('UserAdmins', 'user_id', 'userId');
    await queryInterface.renameColumn(
      'UserAdmins',
      'restaurant_id',
      'restaurantId',
    );
    await queryInterface.renameColumn('UserAdmins', 'created_at', 'createdAt');
    await queryInterface.renameColumn('UserAdmins', 'updated_at', 'updatedAt');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameColumn('UserAdmins', 'userId', 'user_id');
    await queryInterface.renameColumn(
      'UserAdmins',
      'restaurantId',
      'restaurant_id',
    );
    await queryInterface.renameColumn('UserAdmins', 'createdAt', 'created_at');
    await queryInterface.renameColumn('UserAdmins', 'updatedAt', 'updated_at');
  },
};
