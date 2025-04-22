'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const achievements = [
      // Food Explorer achievements
      ...Array.from({ length: 10 }, (_, i) => {
        const levels = [
          { en: 'Table Tourist', hr: 'Stolni Turist', threshold: 3 },
          { en: 'Fork Finder', hr: 'Lovac na Vilice', threshold: 10 },
          { en: 'Taster', hr: 'Kušač', threshold: 20 },
          { en: 'Restaurant Regular', hr: 'Redoviti Gost', threshold: 35 },
          { en: 'Gourmet Hunter', hr: 'Lovac na Okuse', threshold: 50 },
          { en: 'Culinary Nomad', hr: 'Kulinarski Nomad', threshold: 75 },
          { en: 'Food Explorer', hr: 'Istraživač Okusa', threshold: 100 },
          { en: 'Taste Collector', hr: 'Sakupljač Okusa', threshold: 150 },
          { en: 'Dining Veteran', hr: 'Iskusni Gurman', threshold: 200 },
          { en: 'Master of Menus', hr: 'Majstor Jelovnika', threshold: 300 },
        ];
        return {
          id: uuidv4(),
          category: 'FOOD_EXPLORER',
          level: i + 1,
          nameEn: levels[i].en,
          nameHr: levels[i].hr,
          threshold: levels[i].threshold,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }),

      // City Hopper achievements
      ...Array.from({ length: 7 }, (_, i) => {
        const levels = [
          { en: 'Local Foodie', hr: 'Lokalni Gurman', threshold: 1 },
          { en: 'Weekend Wanderer', hr: 'Vikend Istraživač', threshold: 3 },
          { en: 'Snackpacker', hr: 'Grickalica u Pokretu', threshold: 5 },
          { en: 'Urban Explorer', hr: 'Urbani Istraživač', threshold: 8 },
          { en: 'City Hopper', hr: 'Skakač po Gradovima', threshold: 12 },
          { en: 'Culture Biter', hr: 'Gricnuti Kulturnjak', threshold: 16 },
          { en: 'World Palate', hr: 'Svjetsko Nepce', threshold: 20 },
        ];
        return {
          id: uuidv4(),
          category: 'CITY_HOPPER',
          level: i + 1,
          nameEn: levels[i].en,
          nameHr: levels[i].hr,
          threshold: levels[i].threshold,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }),

      // Elite Reviewer achievements
      ...Array.from({ length: 7 }, (_, i) => {
        const levels = [
          { en: 'Commenter', hr: 'Komentator', threshold: 3 },
          { en: 'Opinion Giver', hr: 'Davač Mišljenja', threshold: 8 },
          { en: 'Plate Critic', hr: 'Kritičar Tanjura', threshold: 15 },
          { en: 'Taste Judge', hr: 'Sudac Okusa', threshold: 25 },
          { en: 'Elite Reviewer', hr: 'Elitni Recenzent', threshold: 50 },
          { en: 'Gourmet Critic', hr: 'Gurmanski Kritičar', threshold: 75 },
          {
            en: 'Culinary Journalist',
            hr: 'Kulinarski Novinar',
            threshold: 100,
          },
        ];
        return {
          id: uuidv4(),
          category: 'ELITE_REVIEWER',
          level: i + 1,
          nameEn: levels[i].en,
          nameHr: levels[i].hr,
          threshold: levels[i].threshold,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }),

      // World Cuisine achievements
      ...Array.from({ length: 7 }, (_, i) => {
        const levels = [
          { en: 'Single Taste', hr: 'Jedan Okus', threshold: 1 },
          { en: 'Dual Bites', hr: 'Dvostruki Zalogaji', threshold: 2 },
          { en: 'Flavor Scout', hr: 'Istraživač Okusa', threshold: 4 },
          { en: 'Palate Traveler', hr: 'Putnik po Nepcu', threshold: 6 },
          { en: 'Cuisine Collector', hr: 'Skupljač Kuhinja', threshold: 8 },
          { en: 'World Cuisine', hr: 'Svjetske Kuhinje', threshold: 12 },
          { en: 'Master of Flavors', hr: 'Majstor Okusa', threshold: 20 },
        ];
        return {
          id: uuidv4(),
          category: 'WORLD_CUISINE',
          level: i + 1,
          nameEn: levels[i].en,
          nameHr: levels[i].hr,
          threshold: levels[i].threshold,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }),
    ];

    await queryInterface.bulkInsert('Achievements', achievements, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Achievements', null, {});
  },
};
