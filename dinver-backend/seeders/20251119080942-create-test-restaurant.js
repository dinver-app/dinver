'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const testRestaurantId = uuidv4();

    await queryInterface.bulkInsert(
      'Restaurants',
      [
        {
          id: testRestaurantId,
          name: '[TEST] Dinver Test Restaurant',
          description:
            'Testni restoran za development i testing. Vidi se samo whitelisted userima.',
          address: 'Obala Hrvatskog narodnog preporoda 10',
          place: 'Split',
          country: 'Croatia',
          latitude: 43.5081,
          longitude: 16.4402,
          phone: '+385 21 123 456',
          rating: 4.5,
          foodQuality: 4.6,
          service: 4.4,
          atmosphere: 4.5,
          priceLevel: 2,
          openingHours: JSON.stringify({
            monday: [{ open: '10:00', close: '22:00' }],
            tuesday: [{ open: '10:00', close: '22:00' }],
            wednesday: [{ open: '10:00', close: '22:00' }],
            thursday: [{ open: '10:00', close: '22:00' }],
            friday: [{ open: '10:00', close: '23:00' }],
            saturday: [{ open: '10:00', close: '23:00' }],
            sunday: [{ open: '11:00', close: '21:00' }],
          }),
          userRatingsTotal: 150,
          dinverRating: 4.5,
          dinverReviewsCount: 25,
          isOpenNow: true,
          businessStatus: 'OPERATIONAL',
          slug: 'test-dinver-test-restaurant-split',
          websiteUrl: 'https://test.dinver.com',
          email: 'test@dinver.com',
          isClaimed: true,
          isTest: true,
          subdomain: 'test-restaurant',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    );

    console.log(
      `✅ Test restaurant created with ID: ${testRestaurantId}`,
    );
    console.log(
      '   Visible only to: ivankikic49@gmail.com, mbaivic23@student.foi.hr',
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Restaurants', {
      isTest: true,
      name: '[TEST] Dinver Test Restaurant',
    });
  },
};
