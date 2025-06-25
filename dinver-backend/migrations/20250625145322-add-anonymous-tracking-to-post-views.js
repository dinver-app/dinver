'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('PostViews', 'deviceId', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('PostViews', 'isAnonymous', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    // Add index for deviceId for better performance when querying anonymous views
    await queryInterface.addIndex('PostViews', [
      'deviceId',
      'postId',
      'createdAt',
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('PostViews', [
      'deviceId',
      'postId',
      'createdAt',
    ]);
    await queryInterface.removeColumn('PostViews', 'deviceId');
    await queryInterface.removeColumn('PostViews', 'isAnonymous');
  },
};
