'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Ukloni postojeći unique index na email polju
    await queryInterface.removeIndex('WaitList', 'waitlist_email_unique');

    // Dodaj composite unique constraint na email + type
    await queryInterface.addIndex('WaitList', ['email', 'type'], {
      unique: true,
      name: 'waitlist_email_type_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    // Ukloni composite unique constraint
    await queryInterface.removeIndex('WaitList', 'waitlist_email_type_unique');

    // Vrati originalni unique constraint na email polju
    await queryInterface.addIndex('WaitList', ['email'], {
      unique: true,
      name: 'waitlist_email_unique',
    });
  },
};
