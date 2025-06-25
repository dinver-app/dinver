'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new columns to RestaurantPosts
    await queryInterface.addColumn('RestaurantPosts', 'viewCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('RestaurantPosts', 'shareCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('RestaurantPosts', 'saveCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('RestaurantPosts', 'avgWatchTime', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });

    await queryInterface.addColumn('RestaurantPosts', 'completionRate', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });

    await queryInterface.addColumn('RestaurantPosts', 'engagementScore', {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('RestaurantPosts', 'viralScore', {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('RestaurantPosts', 'trendingScore', {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('RestaurantPosts', 'peakHours', {
      type: Sequelize.JSONB,
      allowNull: true,
    });

    // Create PostViews table
    await queryInterface.createTable('PostViews', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      postId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'RestaurantPosts',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      watchTime: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      completionRate: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      deviceType: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      location: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      timeOfDay: {
        type: Sequelize.TIME,
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

    // Create PostInteractions table
    await queryInterface.createTable('PostInteractions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      postId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'RestaurantPosts',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      interactionType: {
        type: Sequelize.ENUM(
          'share',
          'save',
          'click_profile',
          'click_restaurant',
          'report',
        ),
        allowNull: false,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      timeSpentBefore: {
        type: Sequelize.FLOAT,
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

    // Add indexes
    await queryInterface.addIndex(
      'RestaurantPosts',
      ['engagementScore', 'createdAt'],
      {
        name: 'posts_engagement_idx',
      },
    );

    await queryInterface.addIndex(
      'RestaurantPosts',
      ['viralScore', 'createdAt'],
      {
        name: 'posts_viral_idx',
      },
    );

    await queryInterface.addIndex(
      'RestaurantPosts',
      ['trendingScore', 'createdAt'],
      {
        name: 'posts_trending_idx',
      },
    );

    await queryInterface.addIndex('PostViews', ['postId', 'createdAt']);
    await queryInterface.addIndex('PostViews', ['userId', 'postId']);
    await queryInterface.addIndex('PostInteractions', [
      'postId',
      'interactionType',
      'createdAt',
    ]);
    await queryInterface.addIndex('PostInteractions', [
      'userId',
      'interactionType',
    ]);
  },

  async down(queryInterface, Sequelize) {
    // Remove columns from RestaurantPosts
    await queryInterface.removeColumn('RestaurantPosts', 'viewCount');
    await queryInterface.removeColumn('RestaurantPosts', 'shareCount');
    await queryInterface.removeColumn('RestaurantPosts', 'saveCount');
    await queryInterface.removeColumn('RestaurantPosts', 'avgWatchTime');
    await queryInterface.removeColumn('RestaurantPosts', 'completionRate');
    await queryInterface.removeColumn('RestaurantPosts', 'engagementScore');
    await queryInterface.removeColumn('RestaurantPosts', 'viralScore');
    await queryInterface.removeColumn('RestaurantPosts', 'trendingScore');
    await queryInterface.removeColumn('RestaurantPosts', 'peakHours');

    // Remove indexes
    await queryInterface.removeIndex('RestaurantPosts', 'posts_engagement_idx');
    await queryInterface.removeIndex('RestaurantPosts', 'posts_viral_idx');
    await queryInterface.removeIndex('RestaurantPosts', 'posts_trending_idx');

    // Drop tables
    await queryInterface.dropTable('PostViews');
    await queryInterface.dropTable('PostInteractions');
  },
};
