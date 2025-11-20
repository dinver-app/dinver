'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('UserSettings', 'profileVisibility', {
      type: Sequelize.ENUM('public', 'followers', 'buddies'),
      allowNull: false,
      defaultValue: 'public',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('UserSettings', 'profileVisibility');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_UserSettings_profileVisibility";',
      { raw: true }
    );
  },
};
