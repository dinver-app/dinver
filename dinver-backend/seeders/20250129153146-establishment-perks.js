'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, delete all existing entries in the EstablishmentPerks table
    await queryInterface.bulkDelete('EstablishmentPerk', null, {});

    // Then, insert the new establishment perks
    return queryInterface.bulkInsert('EstablishmentPerk', [
      {
        name: 'Rooftop View',
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
        name: 'Beachfront',
        icon: '🏖',
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
        name: 'Themed Establishment',
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
        name: 'Quick Bites',
        icon: '🚀',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Play Areas',
        icon: '🎢',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Childrens Menu',
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
        name: 'Spicy Food Lovers',
        icon: '🌶',
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
    return queryInterface.bulkDelete('EstablishmentPerk', null, {});
  },
};
