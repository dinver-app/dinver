'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('BlogViews', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      blogId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Blogs',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      sessionId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      ipAddress: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      userAgent: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      viewedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add unique constraint for blogId + sessionId
    await queryInterface.addIndex('BlogViews', ['blogId', 'sessionId'], {
      unique: true,
      name: 'blog_view_unique_session',
    });

    // Add index for blogId
    await queryInterface.addIndex('BlogViews', ['blogId'], {
      name: 'blog_view_blog_id',
    });

    // Add index for viewedAt
    await queryInterface.addIndex('BlogViews', ['viewedAt'], {
      name: 'blog_view_viewed_at',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('BlogViews');
  },
};
