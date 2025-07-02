'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop the existing table and enum type
    await queryInterface.sequelize.query(
      `DROP TABLE IF EXISTS "UserPointsHistory" CASCADE;`,
    );
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "enum_UserPointsHistory_actionType" CASCADE;`,
    );
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "enum_userpointshistory_actiontype" CASCADE;`,
    );

    // Create the enum type with all values
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_userpointshistory_actiontype" AS ENUM (
        'review_add',
        'review_long',
        'review_with_photo',
        'reservation_created',
        'reservation_attended',
        'reservation_cancelled_by_user',
        'profile_verify',
        'first_favorite',
        'new_cuisine_type',
        'achievement_unlocked',
        'visit_qr'
      );
    `);

    // Create the table with the correct enum type
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
        type: 'enum_userpointshistory_actiontype',
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
        allowNull: true,
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
    await queryInterface.dropTable('UserPointsHistory');
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "enum_userpointshistory_actiontype";`,
    );
  },
};
