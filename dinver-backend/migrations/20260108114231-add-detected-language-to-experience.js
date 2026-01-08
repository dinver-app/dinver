'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Experiences', 'detectedLanguage', {
      type: Sequelize.STRING(5),
      allowNull: true,
    });
    await queryInterface.addIndex('Experiences', ['detectedLanguage'], {
      name: 'experiences_detected_language_idx',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('Experiences', 'experiences_detected_language_idx');
    await queryInterface.removeColumn('Experiences', 'detectedLanguage');
  },
};
