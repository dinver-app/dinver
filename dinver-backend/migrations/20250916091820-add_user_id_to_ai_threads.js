'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('AiThreads', 'userId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
    await queryInterface.addIndex('AiThreads', ['userId', 'createdAt']);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('AiThreads', 'userId');
  },
};
