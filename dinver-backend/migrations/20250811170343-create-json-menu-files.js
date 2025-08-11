'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('json_menu_files', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      restaurantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      filename: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      jsonContent: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      menuType: {
        type: Sequelize.ENUM('food', 'drink'),
        allowNull: false,
        defaultValue: 'food',
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    // Add indexes
    await queryInterface.addIndex('json_menu_files', ['restaurantId']);
    await queryInterface.addIndex('json_menu_files', ['filename']);
    await queryInterface.addIndex('json_menu_files', ['menuType']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('json_menu_files');
  },
};
