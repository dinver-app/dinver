'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('UserFavorites', 'id', {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('UserFavorites', 'id');
  },
};
