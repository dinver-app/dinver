'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, delete all existing entries in the VenuePerks table
    await queryInterface.bulkDelete('VenuePerks', null, {});

    // Then, insert the new venue perks
    return queryInterface.bulkInsert('VenuePerks', [
      {
        name: 'Pub / Beer Bar',
        icon: '🍺',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Wine Bar',
        icon: '🍷',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Cocktail Bar',
        icon: '🍹',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Nightclub',
        icon: '🕺',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Fine Dining',
        icon: '🍽',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Hotel Restaurant',
        icon: '🏨',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Beach Restaurant',
        icon: '🏖',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Rooftop Restaurant',
        icon: '🏞',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Outdoor Seating',
        icon: '🌳',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Beachfront Location',
        icon: '🏖',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Historical / Unique Interior',
        icon: '🏰',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Garden Seating',
        icon: '🌳',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Themed Restaurant',
        icon: '🎭',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Parking Available',
        icon: '🚗',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Close to Public Transport',
        icon: '🚉',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Open Late-Night',
        icon: '🚀',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: '24/7 Open',
        icon: '🕒',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Reservations Recommended',
        icon: '🍽',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Accepts Credit Cards',
        icon: '💳',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Free Wi-Fi',
        icon: '📶',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Takeaway Available',
        icon: '🏪',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Home Delivery',
        icon: '🏡',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Express Service (Quick Bites)',
        icon: '🚀',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Family & Pets',
        icon: '🏡',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Kid-Friendly',
        icon: '👶',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'High Chairs Available',
        icon: '🍼',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Pet-Friendly',
        icon: '🐶',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Camping / Picnic Area',
        icon: '🏕',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Live Music',
        icon: '🎶',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Karaoke',
        icon: '🎤',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Sports Bar',
        icon: '🎥',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Serves Alcohol',
        icon: '🍷',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Vegan Menu Available',
        icon: '🥑',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Gluten-Free Options',
        icon: '🌾',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Spicy Food Lovers',
        icon: '🔥',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Premium Meat Cuts',
        icon: '🥩',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'All-You-Can-Eat Buffet',
        icon: '🍱',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Signature Desserts',
        icon: '🍰',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Michelin-Starred Restaurant',
        icon: '🏆',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete('VenuePerks', null, {});
  },
};
