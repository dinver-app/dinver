'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('AiMessages', 'reply', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Full reply object with text, restaurants, items, etc.',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('AiMessages', 'reply');
  },
};
