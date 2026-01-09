'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create RestaurantUpdateViews table
    await queryInterface.createTable('RestaurantUpdateViews', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      updateId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'RestaurantUpdates',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true, // null for anonymous users
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Add indexes
    await queryInterface.addIndex('RestaurantUpdateViews', ['updateId']);
    await queryInterface.addIndex('RestaurantUpdateViews', ['userId']);
    await queryInterface.addIndex('RestaurantUpdateViews', ['createdAt']);

    // Unique constraint for one view per logged-in user per update
    // Using raw SQL because Sequelize partial unique indexes are tricky
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX restaurant_update_views_unique_user_idx
      ON "RestaurantUpdateViews" ("updateId", "userId")
      WHERE "userId" IS NOT NULL;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('RestaurantUpdateViews');
  },
};
