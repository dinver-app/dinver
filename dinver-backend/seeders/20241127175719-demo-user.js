'use strict';

const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const hashedPassword = await bcrypt.hash('password', 10);
    return queryInterface.bulkInsert(
      'Users',
      [
        {
          name: 'Demo User',
          username: 'demouser',
          email: 'demo_user@example.com',
          password: hashedPassword,
          gender: 'undefined',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    );
  },

  async down(queryInterface) {
    return queryInterface.bulkDelete(
      'Users',
      { email: 'demo_user@example.com' },
      {},
    );
  },
};
