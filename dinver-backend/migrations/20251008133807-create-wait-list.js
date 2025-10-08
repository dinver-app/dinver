'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('WaitList', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      city: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      restaurantName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      type: {
        type: Sequelize.ENUM('user', 'restaurant'),
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add unique constraint for email
    await queryInterface.addIndex('WaitList', ['email'], {
      unique: true,
      name: 'waitlist_email_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('WaitList');
  },
};
