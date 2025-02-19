'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove the existing foreign key constraint
    await queryInterface.removeConstraint(
      'MenuItems',
      'MenuItems_categoryId_fkey',
    );

    // Add a new foreign key constraint with ON DELETE CASCADE
    await queryInterface.addConstraint('MenuItems', {
      fields: ['categoryId'],
      type: 'foreign key',
      name: 'MenuItems_categoryId_fkey',
      references: {
        table: 'MenuCategories',
        field: 'id',
      },
      onDelete: 'CASCADE',
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert the foreign key constraint to its original state
    await queryInterface.removeConstraint(
      'MenuItems',
      'MenuItems_categoryId_fkey',
    );
    await queryInterface.addConstraint('MenuItems', {
      fields: ['categoryId'],
      type: 'foreign key',
      name: 'MenuItems_categoryId_fkey',
      references: {
        table: 'MenuCategories',
        field: 'id',
      },
      onDelete: 'SET NULL', // or 'NO ACTION' based on your preference
    });
  },
};
