'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Experiences', 'visitId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Visits',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Optional link to Visit (receipt scan) - will be required for new experiences',
    });

    // Add index for querying experiences by visit
    await queryInterface.addIndex('Experiences', ['visitId'], {
      name: 'experiences_visit_id_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('Experiences', 'experiences_visit_id_idx');
    await queryInterface.removeColumn('Experiences', 'visitId');
  },
};
