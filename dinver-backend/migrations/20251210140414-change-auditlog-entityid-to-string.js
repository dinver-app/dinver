'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Change entityId column type from UUID to VARCHAR to support both UUIDs and integers
    await queryInterface.changeColumn('AuditLogs', 'entityId', {
      type: Sequelize.STRING,
      allowNull: false,
      comment: 'ID of the entity (can be UUID, integer, or other identifier types)',
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert back to UUID type
    // Note: This might fail if there are non-UUID values in the column
    await queryInterface.changeColumn('AuditLogs', 'entityId', {
      type: Sequelize.UUID,
      allowNull: false,
    });
  },
};
