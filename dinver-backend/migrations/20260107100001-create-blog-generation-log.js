'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('BlogGenerationLogs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      blogTopicId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'BlogTopics',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      stage: {
        type: Sequelize.ENUM(
          'research',
          'outline',
          'draft_hr',
          'draft_en',
          'edit',
          'seo',
          'image',
          'linkedin_hr',
          'linkedin_en'
        ),
        allowNull: false,
      },
      agentName: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      inputData: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      outputData: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      promptTokens: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      completionTokens: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      totalTokens: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      durationMs: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      modelUsed: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('started', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'started',
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      startedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      completedAt: {
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
    await queryInterface.addIndex('BlogGenerationLogs', ['blogTopicId', 'stage'], {
      name: 'blog_generation_logs_topic_stage_idx',
    });
    await queryInterface.addIndex('BlogGenerationLogs', ['status'], {
      name: 'blog_generation_logs_status_idx',
    });
    await queryInterface.addIndex('BlogGenerationLogs', ['createdAt'], {
      name: 'blog_generation_logs_created_at_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('BlogGenerationLogs');
  },
};
