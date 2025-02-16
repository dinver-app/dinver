'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    // Remove existing constraints
    await queryInterface.removeConstraint(
      'AuditLogs',
      'AuditLogs_restaurant_id_fkey',
    );
    await queryInterface.removeConstraint(
      'AuditLogs',
      'AuditLogs_user_id_fkey',
    );

    // Add new constraints with CASCADE
    await queryInterface.addConstraint('AuditLogs', {
      fields: ['restaurantId'],
      type: 'foreign key',
      name: 'AuditLogs_restaurant_id_fkey',
      references: {
        table: 'Restaurants',
        field: 'id',
      },
      onDelete: 'CASCADE',
    });

    await queryInterface.addConstraint('AuditLogs', {
      fields: ['userId'],
      type: 'foreign key',
      name: 'AuditLogs_user_id_fkey',
      references: {
        table: 'Users',
        field: 'id',
      },
      onDelete: 'CASCADE',
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    // Remove the CASCADE constraints
    await queryInterface.removeConstraint(
      'AuditLogs',
      'AuditLogs_restaurant_id_fkey',
    );
    await queryInterface.removeConstraint(
      'AuditLogs',
      'AuditLogs_user_id_fkey',
    );

    // Re-add the original constraints (adjust onDelete as needed)
    await queryInterface.addConstraint('AuditLogs', {
      fields: ['restaurantId'],
      type: 'foreign key',
      name: 'AuditLogs_restaurant_id_fkey',
      references: {
        table: 'Restaurants',
        field: 'id',
      },
      onDelete: 'SET NULL', // or the original action
    });

    await queryInterface.addConstraint('AuditLogs', {
      fields: ['userId'],
      type: 'foreign key',
      name: 'AuditLogs_user_id_fkey',
      references: {
        table: 'Users',
        field: 'id',
      },
      onDelete: 'SET NULL', // or the original action
    });
  },
};
