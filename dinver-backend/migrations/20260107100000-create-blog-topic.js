'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('BlogTopics', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      topicType: {
        type: Sequelize.ENUM(
          'restaurant_guide',
          'food_trend',
          'seasonal',
          'cuisine_spotlight',
          'neighborhood_guide',
          'tips',
          'industry_news',
          'dinver_feature'
        ),
        allowNull: false,
        defaultValue: 'restaurant_guide',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      targetKeywords: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        defaultValue: [],
      },
      targetAudience: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      primaryLanguage: {
        type: Sequelize.ENUM('hr-HR', 'en-US'),
        allowNull: false,
        defaultValue: 'hr-HR',
      },
      generateBothLanguages: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      scheduledFor: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      priority: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5,
        validate: {
          min: 1,
          max: 10,
        },
      },
      status: {
        type: Sequelize.ENUM(
          'queued',
          'processing',
          'research',
          'outline',
          'writing',
          'editing',
          'seo',
          'image',
          'linkedin',
          'review_ready',
          'approved',
          'published',
          'failed',
          'cancelled'
        ),
        allowNull: false,
        defaultValue: 'queued',
      },
      currentStage: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      blogIdHr: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Blogs',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      blogIdEn: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Blogs',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      linkedInPostHr: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      linkedInPostEn: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      lastError: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      retryCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      maxRetries: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3,
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'UserSysadmins',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      approvedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'UserSysadmins',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      approvedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex('BlogTopics', ['status', 'scheduledFor'], {
      name: 'blog_topics_status_scheduled_idx',
    });
    await queryInterface.addIndex('BlogTopics', ['status', 'priority'], {
      name: 'blog_topics_status_priority_idx',
    });
    await queryInterface.addIndex('BlogTopics', ['createdBy'], {
      name: 'blog_topics_created_by_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('BlogTopics');
  },
};
