'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Visits', 'taggedBy', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'User who tagged this person (null if main visit creator)',
    });

    // Add index for common queries
    await queryInterface.addIndex('Visits', ['taggedBy'], {
      name: 'visits_tagged_by_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('Visits', 'visits_tagged_by_idx');
    await queryInterface.removeColumn('Visits', 'taggedBy');
  },
};
