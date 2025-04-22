'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Reviews', 'is_hidden', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('Reviews', 'last_edited_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('Reviews', 'edit_count', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('Reviews', 'edit_history', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Reviews', 'is_hidden');
    await queryInterface.removeColumn('Reviews', 'last_edited_at');
    await queryInterface.removeColumn('Reviews', 'edit_count');
    await queryInterface.removeColumn('Reviews', 'edit_history');
  },
};
