'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Change the column to TEXT temporarily
    await queryInterface.changeColumn('UserAdmins', 'role', {
      type: Sequelize.TEXT,
      allowNull: false,
    });

    // Update the values
    await queryInterface.sequelize.query(`
      UPDATE "UserAdmins" SET role = 'worker' WHERE role = 'helper';
    `);

    // Change it back to ENUM with new values
    await queryInterface.changeColumn('UserAdmins', 'role', {
      type: Sequelize.ENUM('owner', 'admin', 'worker'),
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Change the column to TEXT temporarily
    await queryInterface.changeColumn('UserAdmins', 'role', {
      type: Sequelize.TEXT,
      allowNull: false,
    });

    // Update the values back
    await queryInterface.sequelize.query(`
      UPDATE "UserAdmins" SET role = 'helper' WHERE role = 'worker';
    `);

    // Change it back to ENUM with old values
    await queryInterface.changeColumn('UserAdmins', 'role', {
      type: Sequelize.ENUM('owner', 'admin', 'helper'),
      allowNull: false,
    });
  },
};
