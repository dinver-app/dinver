'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, delete all existing establishment perks
    await queryInterface.bulkDelete('EstablishmentPerks', null, {}); // TODO - remove after revision

    // Then, insert the new establishment perks
    return queryInterface.bulkInsert('EstablishmentPerks', [
      {
        name_en: 'Rooftop View',
        name_hr: 'Pogled s krova',
        icon: '🏞',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Outdoor Seating',
        name_hr: 'Vanjsko sjedenje',
        icon: '🌳',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Beachfront',
        name_hr: 'Pogled na more',
        icon: '🏖',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Garden Seating',
        name_hr: 'Vrtno sjedenje',
        icon: '🌳',
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
        name_hr: 'Parkirno mjesto dostupno',
        icon: '🚗',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Close to Public Transport',
        name_hr: 'Blizu javnog prijevoza',
        icon: '🚉',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Open Late-Night',
        name_hr: 'Otvoreno noću',
        icon: '🚀',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: '24/7 Open',
        name_hr: 'Otvoreno 24/7',
        icon: '🕒',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Reservations Recommended',
        name_hr: 'Preporučuje rezervacije',
        icon: '🍽',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Accepts Credit Cards',
        name_hr: 'Prihvaća kreditne kartice',
        icon: '💳',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Free Wi-Fi',
        name_hr: 'Besplatni Wi-Fi',
        icon: '📶',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Takeaway Available',
        name_hr: 'Dostupno za odvoz',
        icon: '🏪',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Quick Bites',
        name_hr: 'Brzi obroci',
        icon: '🚀',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Play Areas',
        name_hr: 'Igre',
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
        name_hr: 'Prijateljski za pse',
        icon: '🐶',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Camping / Picnic Area',
        name_hr: 'Kampiranje / Piknik zona',
        icon: '🏕',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Live Music',
        name_hr: 'Živa glazba',
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
        name_hr: 'Ljubitelji kvalitetne hrane',
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
        name_hr: 'Desserti poznate kuharice',
        icon: '🍰',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Michelin-Starred Restaurant',
        name_hr: 'Restoran s Michelinskom zvijezdom',
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
