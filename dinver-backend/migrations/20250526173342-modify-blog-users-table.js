'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('BlogUsers', 'email');
    await queryInterface.removeColumn('BlogUsers', 'role');
    await queryInterface.removeColumn('BlogUsers', 'bio');
    await queryInterface.removeColumn('BlogUsers', 'active');
    await queryInterface.removeIndex('BlogUsers', ['email']);
    await queryInterface.removeIndex('BlogUsers', ['role']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('BlogUsers', 'email', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    });
    await queryInterface.addColumn('BlogUsers', 'role', {
      type: Sequelize.ENUM('writer', 'editor', 'admin'),
      allowNull: false,
      defaultValue: 'writer',
    });
    await queryInterface.addColumn('BlogUsers', 'bio', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('BlogUsers', 'active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
    await queryInterface.addIndex('BlogUsers', ['email'], { unique: true });
    await queryInterface.addIndex('BlogUsers', ['role']);
  },
};
