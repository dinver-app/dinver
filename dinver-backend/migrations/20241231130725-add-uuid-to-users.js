'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'uuid', {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      allowNull: false,
    });

    // Optionally, copy existing IDs to the new UUID column if needed
    // This step is only necessary if you have a way to map existing IDs to UUIDs
    // await queryInterface.sequelize.query('UPDATE "Users" SET "uuid" = ...');

    await queryInterface.removeColumn('Users', 'id');
    await queryInterface.renameColumn('Users', 'uuid', 'id');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'id', {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    });
    await queryInterface.removeColumn('Users', 'uuid');
  },
};
