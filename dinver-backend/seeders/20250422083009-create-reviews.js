'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, let's get a valid user ID and restaurant ID from the database
    const [users] = await queryInterface.sequelize.query(
      'SELECT id FROM "Users" LIMIT 1;',
    );
    const [restaurants] = await queryInterface.sequelize.query(
      'SELECT id FROM "Restaurants" LIMIT 2;',
    );

    if (!users.length || !restaurants.length) {
      console.log(
        'No users or restaurants found in the database. Skipping review seeding.',
      );
      return;
    }

    const userId = users[0].id;
    const [restaurant1Id, restaurant2Id] = restaurants.map((r) => r.id);

    const reviews = [
      {
        id: uuidv4(),
        userId: userId,
        restaurantId: restaurant1Id,
        rating: 5,
        text: 'Odlična hrana i usluga! Preporučujem.',
        photos: ['{}'],
        isVerifiedReviewer: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    if (restaurant2Id) {
      reviews.push({
        id: uuidv4(),
        userId: userId,
        restaurantId: restaurant2Id,
        rating: 4,
        text: 'Dobra lokacija, hrana je bila ukusna.',
        photos: ['{}'],
        isVerifiedReviewer: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await queryInterface.bulkInsert('Reviews', reviews, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Reviews', null, {});
  },
};
