'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add partySize to Receipts table
    await queryInterface.addColumn('Receipts', 'partySize', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: 'Number of people in the group',
    });

    // 2. Copy partySize data from Experiences to Receipts (via Visit)
    await queryInterface.sequelize.query(`
      UPDATE "Receipts" r
      SET "partySize" = e."partySize"
      FROM "Experiences" e
      JOIN "Visits" v ON e."visitId" = v.id
      WHERE r."visitId" = v.id
      AND e."partySize" IS NOT NULL;
    `);

    // 3. Convert ratings from 1-10 scale to 1-5 scale (divide by 2)
    await queryInterface.sequelize.query(`
      UPDATE "Experiences"
      SET
        "foodRating" = ROUND("foodRating" / 2, 1),
        "ambienceRating" = ROUND("ambienceRating" / 2, 1),
        "serviceRating" = ROUND("serviceRating" / 2, 1),
        "overallRating" = ROUND("overallRating" / 2, 1)
      WHERE "foodRating" IS NOT NULL
         OR "ambienceRating" IS NOT NULL
         OR "serviceRating" IS NOT NULL
         OR "overallRating" IS NOT NULL;
    `);

    // 4. Remove partySize from Experiences table
    await queryInterface.removeColumn('Experiences', 'partySize');
  },

  async down(queryInterface, Sequelize) {
    // 1. Add partySize back to Experiences table
    await queryInterface.addColumn('Experiences', 'partySize', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 2,
      comment: 'Number of people in the group',
    });

    // 2. Copy partySize data back from Receipts to Experiences (via Visit)
    await queryInterface.sequelize.query(`
      UPDATE "Experiences" e
      SET "partySize" = r."partySize"
      FROM "Receipts" r
      JOIN "Visits" v ON r."visitId" = v.id
      WHERE e."visitId" = v.id
      AND r."partySize" IS NOT NULL;
    `);

    // 3. Convert ratings back from 1-5 scale to 1-10 scale (multiply by 2)
    await queryInterface.sequelize.query(`
      UPDATE "Experiences"
      SET
        "foodRating" = ROUND("foodRating" * 2, 1),
        "ambienceRating" = ROUND("ambienceRating" * 2, 1),
        "serviceRating" = ROUND("serviceRating" * 2, 1),
        "overallRating" = ROUND("overallRating" * 2, 1)
      WHERE "foodRating" IS NOT NULL
         OR "ambienceRating" IS NOT NULL
         OR "serviceRating" IS NOT NULL
         OR "overallRating" IS NOT NULL;
    `);

    // 4. Remove partySize from Receipts table
    await queryInterface.removeColumn('Receipts', 'partySize');
  },
};
