'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove unused columns from Experiences table
    // These columns exist in production but are not used in the current model

    const tableInfo = await queryInterface.describeTable('Experiences');

    if (tableInfo.mediaKind) {
      await queryInterface.removeColumn('Experiences', 'mediaKind');
    }

    if (tableInfo.visibility) {
      await queryInterface.removeColumn('Experiences', 'visibility');
    }
  },

  async down(queryInterface, Sequelize) {
    // Re-add the columns if needed to rollback (all nullable for safety)
    await queryInterface.addColumn('Experiences', 'mediaKind', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });

    await queryInterface.addColumn('Experiences', 'visibility', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
  },
};
