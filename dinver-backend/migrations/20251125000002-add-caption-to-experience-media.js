'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add caption field for "Što je na slici?" answer
    await queryInterface.addColumn('ExperienceMedia', 'caption', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'User description of what is in the image',
    });

    // Add menuItemId for linking to menu items
    await queryInterface.addColumn('ExperienceMedia', 'menuItemId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'MenuItems',
        key: 'id',
      },
      onDelete: 'SET NULL',
      comment: 'Link to menu item if user selected from menu',
    });

    // Add index for menuItemId
    await queryInterface.addIndex('ExperienceMedia', ['menuItemId'], {
      name: 'idx_experience_media_menu_item',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      'ExperienceMedia',
      'idx_experience_media_menu_item'
    );
    await queryInterface.removeColumn('ExperienceMedia', 'menuItemId');
    await queryInterface.removeColumn('ExperienceMedia', 'caption');
  },
};
