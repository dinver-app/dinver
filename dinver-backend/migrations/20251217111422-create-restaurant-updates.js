'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create RestaurantUpdates table
    await queryInterface.createTable('RestaurantUpdates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      restaurantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      createdByUserId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      // Content
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      category: {
        type: Sequelize.ENUM(
          'LIVE_MUSIC',
          'NEW_PRODUCT',
          'NEW_LOCATION',
          'SPECIAL_OFFER',
          'SEASONAL_MENU',
          'EVENT',
          'EXTENDED_HOURS',
          'RESERVATIONS',
          'CHEFS_SPECIAL',
          'FAMILY_FRIENDLY',
          'REOPENING'
        ),
        allowNull: false,
      },
      // Optional image
      imageKey: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      imageWidth: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      imageHeight: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      // Lifecycle
      status: {
        type: Sequelize.ENUM('ACTIVE', 'EXPIRED', 'DELETED'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
      durationDays: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      // Cache for faster filtering
      cityCached: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      latitudeCached: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true,
      },
      longitudeCached: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true,
      },
      // Engagement counters
      viewCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      // Timestamps
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Add indexes
    await queryInterface.addIndex('RestaurantUpdates', ['restaurantId']);
    await queryInterface.addIndex('RestaurantUpdates', ['category']);
    await queryInterface.addIndex('RestaurantUpdates', ['status', 'expiresAt'], {
      name: 'restaurant_updates_status_expires_idx',
    });
    await queryInterface.addIndex('RestaurantUpdates', ['cityCached']);
    await queryInterface.addIndex('RestaurantUpdates', ['status', 'category'], {
      name: 'restaurant_updates_status_category_idx',
    });
    await queryInterface.addIndex('RestaurantUpdates', ['createdAt']);
    await queryInterface.addIndex(
      'RestaurantUpdates',
      ['restaurantId', 'createdAt'],
      {
        name: 'restaurant_updates_rate_limit_idx',
      }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('RestaurantUpdates');
  },
};
