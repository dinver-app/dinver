'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, delete all existing establishment perks
    // await queryInterface.bulkDelete('EstablishmentPerks', null, {}); // TODO - remove after revision

    // Then, insert the new establishment perks
    return queryInterface.bulkInsert('EstablishmentPerks', [
      {
        name_en: 'Rooftop View',
        name_hr: 'Krovna terasa s pogledom',
        icon: '🏞',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Outdoor Seating',
        name_hr: 'Vanjska terasa',
        icon: '🌳',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Beachfront',
        name_hr: 'Prvi red do mora',
        icon: '🏖',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Themed Establishment',
        name_hr: 'Tematski objekt',
        icon: '🎭',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Parking Available',
        name_hr: 'Dostupan parking',
        icon: '🚗',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Close to Public Transport',
        name_hr: 'U blizini javnog prijevoza',
        icon: '🚉',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Open Late-Night',
        name_hr: 'Otvoreno do kasno u noć',
        icon: '🚀',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: '24/7 Open',
        name_hr: 'Otvoreno 0-24',
        icon: '🕒',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Reservations Recommended',
        name_hr: 'Preporučeno rezervirati',
        icon: '🍽',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Accepts Credit Cards',
        name_hr: 'Mogućnost plaćanja kreditnom karticom',
        icon: '💳',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Free Wi-Fi',
        name_hr: 'Besplatan Wi-Fi',
        icon: '📶',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Takeaway Available',
        name_hr: 'Dostupna hrana za van',
        icon: '🏪',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Coffee To Go Available',
        name_hr: 'Dostupna kava za van',
        icon: '☕',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Quick Bites',
        name_hr: 'Brzi zalogaji',
        icon: '🚀',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Play Areas',
        name_hr: 'Igrališta',
        icon: '🎢',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Childrens Menu',
        name_hr: 'Jelovnik za djecu',
        icon: '👶',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'High Chairs Available',
        name_hr: 'Dostupne visoke stolice',
        icon: '🍼',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Pet-Friendly',
        name_hr: 'Pogodno za kućne ljubimce',
        icon: '🐶',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Live Music',
        name_hr: 'Glazba uživo',
        icon: '🎶',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Karaoke',
        name_hr: 'Karaoke',
        icon: '🎤',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Sports Bar',
        name_hr: 'Sportski bar',
        icon: '🎥',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Spicy Food Lovers',
        name_hr: 'Za ljubitelje ljute hrane',
        icon: '🌶',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'All-You-Can-Eat Buffet',
        name_hr: 'All-You-Can-Eat Buffet',
        icon: '🍱',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Signature Desserts',
        name_hr: 'Prepoznatljivi deserti',
        icon: '🍰',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Michelin-Starred Restaurant',
        name_hr: 'Restoran s Michelinovom zvjezdicom',
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
