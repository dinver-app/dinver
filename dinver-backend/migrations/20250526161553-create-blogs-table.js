'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Blogs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      content: {
        type: Sequelize.TEXT('long'),
        allowNull: false,
      },
      excerpt: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      authorId: {
        type: Sequelize.UUID,
        references: {
          model: 'Users',
          key: 'id',
        },
        allowNull: false,
      },
      featuredImage: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('draft', 'published', 'archived'),
        defaultValue: 'draft',
        allowNull: false,
      },
      publishedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      // SEO fields
      metaTitle: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      metaDescription: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      keywords: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      // Categorization
      category: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      // Reading time estimate
      readingTimeMinutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      // Social sharing and engagement
      shareCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      viewCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      // Language support
      language: {
        type: Sequelize.STRING(5), // e.g., 'en-US', 'hr-HR'
        defaultValue: 'en-US',
        allowNull: false,
      },
      // Standard timestamps
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

    // Add indexes for better performance
    await queryInterface.addIndex('Blogs', ['authorId']);
    await queryInterface.addIndex('Blogs', ['status', 'publishedAt']);
    await queryInterface.addIndex('Blogs', ['category']);
    await queryInterface.addIndex('Blogs', ['language']);
    await queryInterface.addIndex('Blogs', ['slug'], { unique: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Blogs');
  },
};
