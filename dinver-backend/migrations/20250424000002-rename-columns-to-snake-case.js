'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // UserPoints tablica
    await queryInterface.renameColumn('UserPoints', 'userId', 'user_id');
    await queryInterface.renameColumn(
      'UserPoints',
      'totalPoints',
      'total_points',
    );

    // UserPointsHistory tablica
    await queryInterface.renameColumn('UserPointsHistory', 'userId', 'user_id');
    await queryInterface.renameColumn(
      'UserPointsHistory',
      'actionType',
      'action_type',
    );
    await queryInterface.renameColumn(
      'UserPointsHistory',
      'referenceId',
      'reference_id',
    );

    // User tablica
    await queryInterface.renameColumn('Users', 'firstName', 'first_name');
    await queryInterface.renameColumn('Users', 'lastName', 'last_name');
    await queryInterface.renameColumn('Users', 'googleId', 'google_id');

    // UserOrganizations tablica
    await queryInterface.renameColumn('UserOrganizations', 'userId', 'user_id');
    await queryInterface.renameColumn(
      'UserOrganizations',
      'organizationId',
      'organization_id',
    );

    // UserAdmins tablica
    await queryInterface.renameColumn('UserAdmins', 'userId', 'user_id');
    await queryInterface.renameColumn(
      'UserAdmins',
      'restaurantId',
      'restaurant_id',
    );

    // UserFavorites tablica
    await queryInterface.renameColumn('UserFavorites', 'userId', 'user_id');
    await queryInterface.renameColumn(
      'UserFavorites',
      'restaurantId',
      'restaurant_id',
    );
  },

  down: async (queryInterface, Sequelize) => {
    // UserPoints tablica
    await queryInterface.renameColumn('UserPoints', 'user_id', 'userId');
    await queryInterface.renameColumn(
      'UserPoints',
      'total_points',
      'totalPoints',
    );

    // UserPointsHistory tablica
    await queryInterface.renameColumn('UserPointsHistory', 'user_id', 'userId');
    await queryInterface.renameColumn(
      'UserPointsHistory',
      'action_type',
      'actionType',
    );
    await queryInterface.renameColumn(
      'UserPointsHistory',
      'reference_id',
      'referenceId',
    );

    // User tablica
    await queryInterface.renameColumn('Users', 'first_name', 'firstName');
    await queryInterface.renameColumn('Users', 'last_name', 'lastName');
    await queryInterface.renameColumn('Users', 'google_id', 'googleId');

    // UserOrganizations tablica
    await queryInterface.renameColumn('UserOrganizations', 'user_id', 'userId');
    await queryInterface.renameColumn(
      'UserOrganizations',
      'organization_id',
      'organizationId',
    );

    // UserAdmins tablica
    await queryInterface.renameColumn('UserAdmins', 'user_id', 'userId');
    await queryInterface.renameColumn(
      'UserAdmins',
      'restaurant_id',
      'restaurantId',
    );

    // UserFavorites tablica
    await queryInterface.renameColumn('UserFavorites', 'user_id', 'userId');
    await queryInterface.renameColumn(
      'UserFavorites',
      'restaurant_id',
      'restaurantId',
    );
  },
};
