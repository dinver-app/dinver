'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Experiences', 'viewCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addIndex('Experiences', ['viewCount'], {
      name: 'experiences_view_count_idx',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('Experiences', 'experiences_view_count_idx');
    await queryInterface.removeColumn('Experiences', 'viewCount');
  },
};
