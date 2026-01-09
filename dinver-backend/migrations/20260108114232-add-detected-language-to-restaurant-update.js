'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('RestaurantUpdates', 'detectedLanguage', {
      type: Sequelize.STRING(5),
      allowNull: true,
    });
    await queryInterface.addIndex('RestaurantUpdates', ['detectedLanguage'], {
      name: 'restaurant_updates_detected_language_idx',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex(
      'RestaurantUpdates',
      'restaurant_updates_detected_language_idx'
    );
    await queryInterface.removeColumn('RestaurantUpdates', 'detectedLanguage');
  },
};
