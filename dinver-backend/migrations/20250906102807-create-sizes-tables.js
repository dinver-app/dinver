'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create Sizes table
    await queryInterface.createTable('Sizes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    // Create SizeTranslations table
    await queryInterface.createTable('SizeTranslations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      sizeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Sizes',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      language: {
        type: Sequelize.STRING(5),
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
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

    // Create MenuItemSizes table
    await queryInterface.createTable('MenuItemSizes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      menuItemId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'MenuItems',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      sizeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Sizes',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      price: {
        type: Sequelize.DECIMAL,
        allowNull: false,
      },
      isDefault: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    // Add indexes for better performance
    await queryInterface.addIndex('SizeTranslations', ['sizeId']);
    await queryInterface.addIndex('SizeTranslations', ['language']);
    await queryInterface.addIndex('MenuItemSizes', ['menuItemId']);
    await queryInterface.addIndex('MenuItemSizes', ['sizeId']);
    await queryInterface.addIndex('MenuItemSizes', ['isDefault']);
  },

  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order due to foreign key constraints
    await queryInterface.dropTable('MenuItemSizes');
    await queryInterface.dropTable('SizeTranslations');
    await queryInterface.dropTable('Sizes');
  },
};
