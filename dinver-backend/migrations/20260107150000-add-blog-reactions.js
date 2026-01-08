'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if columns already exist before adding
    const blogsTable = await queryInterface.describeTable('Blogs');

    if (!blogsTable.likesCount) {
      await queryInterface.addColumn('Blogs', 'likesCount', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      });
    }

    if (!blogsTable.dislikesCount) {
      await queryInterface.addColumn('Blogs', 'dislikesCount', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      });
    }

    // Check if BlogReactions table exists
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('BlogReactions')) {
      await queryInterface.createTable('BlogReactions', {
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
          type: Sequelize.STRING(64),
          allowNull: false,
        },
        reactionType: {
          type: Sequelize.ENUM('like', 'dislike'),
          allowNull: false,
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

      // Add unique constraint - one reaction per session per blog
      await queryInterface.addIndex('BlogReactions', ['blogId', 'sessionId'], {
        unique: true,
        name: 'blog_reactions_blog_session_unique',
      });

      // Add index for faster lookups
      await queryInterface.addIndex('BlogReactions', ['blogId'], {
        name: 'blog_reactions_blog_id_idx',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('BlogReactions')) {
      await queryInterface.dropTable('BlogReactions');
    }

    const blogsTable = await queryInterface.describeTable('Blogs');
    if (blogsTable.likesCount) {
      await queryInterface.removeColumn('Blogs', 'likesCount');
    }
    if (blogsTable.dislikesCount) {
      await queryInterface.removeColumn('Blogs', 'dislikesCount');
    }
  },
};
