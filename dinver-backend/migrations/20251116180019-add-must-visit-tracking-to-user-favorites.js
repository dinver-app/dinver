'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add removedAt for soft delete tracking
    await queryInterface.addColumn('UserFavorites', 'removedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp when removed from Must Visit (moved to Visited)',
    });

    // Add removedForVisitId to track which Visit caused the removal
    await queryInterface.addColumn('UserFavorites', 'removedForVisitId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Visits',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Visit ID that caused removal from Must Visit',
    });

    // Add index for querying active Must Visit items (removedAt IS NULL)
    await queryInterface.addIndex('UserFavorites', ['userId', 'removedAt'], {
      name: 'user_favorites_active_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('UserFavorites', 'user_favorites_active_idx');
    await queryInterface.removeColumn('UserFavorites', 'removedForVisitId');
    await queryInterface.removeColumn('UserFavorites', 'removedAt');
  },
};
