'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop existing table and type
    await queryInterface.dropTable('UserPointsHistory');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_UserPointsHistory_actionType";',
    );

    // Create new enum type
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_UserPointsHistory_actionType" AS ENUM (
        'review_add',
        'review_long',
        'review_with_photo',
        'visit_qr',
        'achievement_unlocked',
        'reservation_visit'
      );
    `);

    // Create new table
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
      actionType: {
        type: 'enum_UserPointsHistory_actionType',
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
      description: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // Add indexes
    await queryInterface.addIndex('UserPointsHistory', ['userId']);
    await queryInterface.addIndex('UserPointsHistory', ['actionType']);
    await queryInterface.addIndex('UserPointsHistory', ['restaurantId']);
    await queryInterface.addIndex('UserPointsHistory', ['createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('UserPointsHistory');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_UserPointsHistory_actionType";',
    );
  },
};
