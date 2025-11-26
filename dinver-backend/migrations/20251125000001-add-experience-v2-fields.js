'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new rating fields with decimal (1.0-10.0)
    await queryInterface.addColumn('Experiences', 'foodRating', {
      type: Sequelize.DECIMAL(3, 1),
      allowNull: true,
      comment: 'Food rating 1.0-10.0 with one decimal',
    });

    await queryInterface.addColumn('Experiences', 'overallRating', {
      type: Sequelize.DECIMAL(3, 1),
      allowNull: true,
      comment: 'Overall rating - average of food, ambience, service',
    });

    // Add party size and meal type
    await queryInterface.addColumn('Experiences', 'partySize', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 2,
      comment: 'Number of people in the group (1, 2, 3, etc.)',
    });

    await queryInterface.addColumn('Experiences', 'mealType', {
      type: Sequelize.ENUM(
        'breakfast',
        'brunch',
        'lunch',
        'dinner',
        'coffee',
        'snack'
      ),
      allowNull: true,
      comment: 'Type of meal',
    });

    // Rename existing rating columns and change type to DECIMAL
    // First add new columns
    await queryInterface.addColumn('Experiences', 'ambienceRating', {
      type: Sequelize.DECIMAL(3, 1),
      allowNull: true,
      comment: 'Ambience rating 1.0-10.0 with one decimal',
    });

    await queryInterface.addColumn('Experiences', 'serviceRating', {
      type: Sequelize.DECIMAL(3, 1),
      allowNull: true,
      comment: 'Service rating 1.0-10.0 with one decimal',
    });

    // Copy data from old columns to new columns (if any data exists)
    // Multiply by 2 to convert from 1-5 scale to 2-10 scale
    await queryInterface.sequelize.query(`
      UPDATE "Experiences"
      SET "ambienceRating" = "ratingAmbience" * 2,
          "serviceRating" = "ratingService" * 2
      WHERE "ratingAmbience" IS NOT NULL OR "ratingService" IS NOT NULL
    `);

    // Add publishedAt field if not exists
    const tableInfo = await queryInterface.describeTable('Experiences');
    if (!tableInfo.publishedAt) {
      await queryInterface.addColumn('Experiences', 'publishedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the experience was published (became visible)',
      });
    }

    // Add index for feed queries
    await queryInterface.addIndex('Experiences', ['status', 'publishedAt'], {
      name: 'idx_experiences_feed',
    });

    await queryInterface.addIndex('Experiences', ['mealType'], {
      name: 'idx_experiences_meal_type',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('Experiences', 'idx_experiences_feed');
    await queryInterface.removeIndex('Experiences', 'idx_experiences_meal_type');

    // Remove new columns
    await queryInterface.removeColumn('Experiences', 'foodRating');
    await queryInterface.removeColumn('Experiences', 'overallRating');
    await queryInterface.removeColumn('Experiences', 'partySize');
    await queryInterface.removeColumn('Experiences', 'ambienceRating');
    await queryInterface.removeColumn('Experiences', 'serviceRating');

    // Remove mealType enum
    await queryInterface.removeColumn('Experiences', 'mealType');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Experiences_mealType";'
    );

    // Remove publishedAt if it was added
    const tableInfo = await queryInterface.describeTable('Experiences');
    if (tableInfo.publishedAt) {
      await queryInterface.removeColumn('Experiences', 'publishedAt');
    }
  },
};
