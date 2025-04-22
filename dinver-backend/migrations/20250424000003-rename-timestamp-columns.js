'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Users tablica
    await queryInterface.renameColumn('Users', 'createdAt', 'created_at');
    await queryInterface.renameColumn('Users', 'updatedAt', 'updated_at');

    // UserPoints tablica
    await queryInterface.renameColumn('UserPoints', 'createdAt', 'created_at');
    await queryInterface.renameColumn('UserPoints', 'updatedAt', 'updated_at');

    // UserPointsHistory tablica
    await queryInterface.renameColumn(
      'UserPointsHistory',
      'createdAt',
      'created_at',
    );
    await queryInterface.renameColumn(
      'UserPointsHistory',
      'updatedAt',
      'updated_at',
    );

    // UserOrganizations tablica
    await queryInterface.renameColumn(
      'UserOrganizations',
      'createdAt',
      'created_at',
    );
    await queryInterface.renameColumn(
      'UserOrganizations',
      'updatedAt',
      'updated_at',
    );

    // UserAdmins tablica
    await queryInterface.renameColumn('UserAdmins', 'createdAt', 'created_at');
    await queryInterface.renameColumn('UserAdmins', 'updatedAt', 'updated_at');

    // UserFavorites tablica
    await queryInterface.renameColumn(
      'UserFavorites',
      'createdAt',
      'created_at',
    );
    await queryInterface.renameColumn(
      'UserFavorites',
      'updatedAt',
      'updated_at',
    );
  },

  down: async (queryInterface, Sequelize) => {
    // Users tablica
    await queryInterface.renameColumn('Users', 'created_at', 'createdAt');
    await queryInterface.renameColumn('Users', 'updated_at', 'updatedAt');

    // UserPoints tablica
    await queryInterface.renameColumn('UserPoints', 'created_at', 'createdAt');
    await queryInterface.renameColumn('UserPoints', 'updated_at', 'updatedAt');

    // UserPointsHistory tablica
    await queryInterface.renameColumn(
      'UserPointsHistory',
      'created_at',
      'createdAt',
    );
    await queryInterface.renameColumn(
      'UserPointsHistory',
      'updated_at',
      'updatedAt',
    );

    // UserOrganizations tablica
    await queryInterface.renameColumn(
      'UserOrganizations',
      'created_at',
      'createdAt',
    );
    await queryInterface.renameColumn(
      'UserOrganizations',
      'updated_at',
      'updatedAt',
    );

    // UserAdmins tablica
    await queryInterface.renameColumn('UserAdmins', 'created_at', 'createdAt');
    await queryInterface.renameColumn('UserAdmins', 'updated_at', 'updatedAt');

    // UserFavorites tablica
    await queryInterface.renameColumn(
      'UserFavorites',
      'created_at',
      'createdAt',
    );
    await queryInterface.renameColumn(
      'UserFavorites',
      'updated_at',
      'updatedAt',
    );
  },
};
