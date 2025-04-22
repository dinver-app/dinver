'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Nema potrebe za SQL naredbom jer se radi o validaciji na razini modela
    // Validacija će se automatski ažurirati kada se aplikacija ponovno pokrene
    return Promise.resolve();
  },

  async down(queryInterface, Sequelize) {
    // Nema potrebe za SQL naredbom jer se radi o validaciji na razini modela
    return Promise.resolve();
  },
};
