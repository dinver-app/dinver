'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'referralCode', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });

    await queryInterface.addColumn('Users', 'referredBy', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // Add index for referralCode for faster lookups
    await queryInterface.addIndex('Users', ['referralCode']);
    
    // Add index for referredBy for faster lookups
    await queryInterface.addIndex('Users', ['referredBy']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'referredBy');
    await queryInterface.removeColumn('Users', 'referralCode');
  }
};
