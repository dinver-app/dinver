'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop existing foreign key constraints
    await queryInterface.removeConstraint('PostViews', 'PostViews_postId_fkey');
    await queryInterface.removeConstraint(
      'PostInteractions',
      'PostInteractions_postId_fkey',
    );

    // Add new foreign key constraints with CASCADE delete
    await queryInterface.addConstraint('PostViews', {
      fields: ['postId'],
      type: 'foreign key',
      name: 'PostViews_postId_fkey',
      references: {
        table: 'RestaurantPosts',
        field: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addConstraint('PostInteractions', {
      fields: ['postId'],
      type: 'foreign key',
      name: 'PostInteractions_postId_fkey',
      references: {
        table: 'RestaurantPosts',
        field: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop CASCADE constraints
    await queryInterface.removeConstraint('PostViews', 'PostViews_postId_fkey');
    await queryInterface.removeConstraint(
      'PostInteractions',
      'PostInteractions_postId_fkey',
    );

    // Add back original constraints without CASCADE
    await queryInterface.addConstraint('PostViews', {
      fields: ['postId'],
      type: 'foreign key',
      name: 'PostViews_postId_fkey',
      references: {
        table: 'RestaurantPosts',
        field: 'id',
      },
    });

    await queryInterface.addConstraint('PostInteractions', {
      fields: ['postId'],
      type: 'foreign key',
      name: 'PostInteractions_postId_fkey',
      references: {
        table: 'RestaurantPosts',
        field: 'id',
      },
    });
  },
};
