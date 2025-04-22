'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('UserPointsHistory', 'restaurant_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Restaurants',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // Dodaj indeks za brže pretraživanje
    await queryInterface.addIndex('UserPointsHistory', ['restaurant_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('UserPointsHistory', ['restaurant_id']);
    await queryInterface.removeColumn('UserPointsHistory', 'restaurant_id');
  },
};
