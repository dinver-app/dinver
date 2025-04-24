'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, delete all existing establishment perks
    // await queryInterface.bulkDelete('EstablishmentPerks', null, {}); // TODO - remove after revision

    // Then, insert the new establishment perks
    return queryInterface.bulkInsert('EstablishmentPerks', [
      {
        nameEn: 'Rooftop View',
        nameHr: 'Krovna terasa s pogledom',
        icon: '🏞',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Outdoor Seating',
        nameHr: 'Vanjska terasa',
        icon: '🌳',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Beachfront',
        nameHr: 'Prvi red do mora',
        icon: '🏖',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Themed Establishment',
        nameHr: 'Tematski objekt',
        icon: '🎭',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Parking Available',
        nameHr: 'Dostupan parking',
        icon: '🚗',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Close to Public Transport',
        nameHr: 'U blizini javnog prijevoza',
        icon: '🚉',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Open Late-Night',
        nameHr: 'Otvoreno do kasno u noć',
        icon: '🚀',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: '24/7 Open',
        nameHr: 'Otvoreno 0-24',
        icon: '🕒',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Reservations Recommended',
        nameHr: 'Preporučeno rezervirati',
        icon: '🍽',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Accepts Credit Cards',
        nameHr: 'Mogućnost plaćanja kreditnom karticom',
        icon: '💳',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Free Wi-Fi',
        nameHr: 'Besplatan Wi-Fi',
        icon: '📶',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Takeaway Available',
        nameHr: 'Dostupna hrana za van',
        icon: '🏪',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Coffee To Go Available',
        nameHr: 'Dostupna kava za van',
        icon: '☕',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Quick Bites',
        nameHr: 'Brzi zalogaji',
        icon: '🚀',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Play Areas',
        nameHr: 'Igrališta',
        icon: '🎢',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Childrens Menu',
        nameHr: 'Jelovnik za djecu',
        icon: '👶',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'High Chairs Available',
        nameHr: 'Dostupne visoke stolice',
        icon: '🍼',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Pet-Friendly',
        nameHr: 'Pogodno za kućne ljubimce',
        icon: '🐶',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Live Music',
        nameHr: 'Glazba uživo',
        icon: '🎶',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Karaoke',
        nameHr: 'Karaoke',
        icon: '🎤',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Sports Bar',
        nameHr: 'Sportski bar',
        icon: '🎥',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Spicy Food Lovers',
        nameHr: 'Za ljubitelje ljute hrane',
        icon: '🌶',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'All-You-Can-Eat Buffet',
        nameHr: 'All-You-Can-Eat Buffet',
        icon: '🍱',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Signature Desserts',
        nameHr: 'Prepoznatljivi deserti',
        icon: '🍰',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Michelin-Starred Restaurant',
        nameHr: 'Restoran s Michelinovom zvjezdicom',
        icon: '🏆',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete('EstablishmentPerks', null, {});
  },
};
