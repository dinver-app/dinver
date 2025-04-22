'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'phone', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
      validate: {
        // Dozvoli međunarodni format brojeva telefona
        is: /^\+?[1-9]\d{1,14}$/,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'phone');
  },
};
