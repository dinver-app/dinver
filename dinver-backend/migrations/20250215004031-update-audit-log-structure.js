'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn('AuditLogs', 'user_id', 'userId');
    await queryInterface.renameColumn(
      'AuditLogs',
      'restaurant_id',
      'restaurantId',
    );
    await queryInterface.renameColumn('AuditLogs', 'entity_id', 'entityId');
    await queryInterface.renameColumn('AuditLogs', 'timestamp', 'createdAt');

    await queryInterface.addColumn('AuditLogs', 'updatedAt', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameColumn('AuditLogs', 'userId', 'user_id');
    await queryInterface.renameColumn(
      'AuditLogs',
      'restaurantId',
      'restaurant_id',
    );
    await queryInterface.renameColumn('AuditLogs', 'entityId', 'entity_id');
    await queryInterface.renameColumn('AuditLogs', 'createdAt', 'timestamp');

    await queryInterface.removeColumn('AuditLogs', 'updatedAt');
  },
};
