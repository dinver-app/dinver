'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop the existing table if it exists
    await queryInterface.dropTable('UserPointsHistory', { cascade: true });

    // Create the table with the enum type
    await queryInterface.createTable('UserPointsHistory', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      restaurantId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      actionType: {
        type: Sequelize.ENUM(
          'review_add',
          'review_long',
          'review_with_photo',
          'visit_qr',
          'reservation_visit',
          'achievement_unlocked',
        ),
        allowNull: false,
      },
      points: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      referenceId: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      description: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Add any necessary indexes
    await queryInterface.addIndex('UserPointsHistory', ['userId']);
    await queryInterface.addIndex('UserPointsHistory', ['restaurantId']);
    await queryInterface.addIndex('UserPointsHistory', ['actionType']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('UserPointsHistory', { cascade: true });
  },
};
