'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add likesCount and dislikesCount to Blogs table
    await queryInterface.addColumn('Blogs', 'likesCount', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
    });

    await queryInterface.addColumn('Blogs', 'dislikesCount', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
    });

    // Create BlogReactions table
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('BlogReactions');
    await queryInterface.removeColumn('Blogs', 'likesCount');
    await queryInterface.removeColumn('Blogs', 'dislikesCount');
  },
};
