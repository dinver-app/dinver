'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      'ALTER TABLE "Reviews" ALTER COLUMN "photos" TYPE text[] USING "photos"::text[]',
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      'ALTER TABLE "Reviews" ALTER COLUMN "photos" TYPE varchar(255)[] USING "photos"::varchar(255)[]',
    );
  },
};
