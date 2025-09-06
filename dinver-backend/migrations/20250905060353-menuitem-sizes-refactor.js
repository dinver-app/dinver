'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1) Make price nullable (for items with sizes only)
    await queryInterface.changeColumn('MenuItems', 'price', {
      type: Sequelize.DECIMAL,
      allowNull: true,
    });

    // 2) Add defaultSizeId to point to the default size key
    await queryInterface.addColumn('MenuItems', 'defaultSizeId', {
      type: Sequelize.UUID,
      allowNull: true,
    });

    // 3) Remove legacy columns related to sizes naming on base item
    const table = await queryInterface.describeTable('MenuItems');
    if (table.hasSizes) {
      await queryInterface.removeColumn('MenuItems', 'hasSizes');
    }
    if (table.defaultSizeName) {
      await queryInterface.removeColumn('MenuItems', 'defaultSizeName');
    }
  },

  async down(queryInterface, Sequelize) {
    // 1) Revert price to NOT NULL
    await queryInterface.changeColumn('MenuItems', 'price', {
      type: Sequelize.DECIMAL,
      allowNull: false,
    });

    // 2) Remove defaultSizeId
    const table = await queryInterface.describeTable('MenuItems');
    if (table.defaultSizeId) {
      await queryInterface.removeColumn('MenuItems', 'defaultSizeId');
    }

    // 3) Restore legacy columns
    if (!table.hasSizes) {
      await queryInterface.addColumn('MenuItems', 'hasSizes', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
    if (!table.defaultSizeName) {
      await queryInterface.addColumn('MenuItems', 'defaultSizeName', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },
};
