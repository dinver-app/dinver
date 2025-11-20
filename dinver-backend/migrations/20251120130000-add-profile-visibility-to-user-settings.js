'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('UserSettings', 'profileVisibility', {
      type: Sequelize.ENUM('public', 'followers', 'buddies'),
      allowNull: false,
      defaultValue: 'public',
      comment: 'Who can see user profile: public (everyone), followers (only people who follow you), buddies (mutual followers only)',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('UserSettings', 'profileVisibility');

    // Remove the ENUM type
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_UserSettings_profileVisibility";'
    );
  },
};
