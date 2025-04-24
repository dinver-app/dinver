'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Restaurants', 'organizationId');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('Restaurants', 'organizationId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Organizations',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },
};
