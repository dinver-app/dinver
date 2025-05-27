'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('NewsletterSubscribers', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      status: {
        type: Sequelize.ENUM('active', 'unsubscribed'),
        defaultValue: 'active',
      },
      subscribedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      unsubscribedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      source: {
        type: Sequelize.STRING,
        allowNull: true,
        comment:
          'Where the subscription came from (e.g., landing_page, blog, etc.)',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Add index for email searches
    await queryInterface.addIndex('NewsletterSubscribers', ['email']);
    // Add index for status filtering
    await queryInterface.addIndex('NewsletterSubscribers', ['status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('NewsletterSubscribers');
  },
};
