'use strict';

/** @type {import('sequelize-cli').Migration} */
// UP: Rename snake_case to camelCase for UserOrganizations and onwards
module.exports = {
  async up(queryInterface, Sequelize) {
    // UserOrganization
    await queryInterface.renameColumn('UserOrganizations', 'user_id', 'userId');
    await queryInterface.renameColumn(
      'UserOrganizations',
      'organization_id',
      'organizationId',
    );
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

    // UserPoints
    await queryInterface.renameColumn('UserPoints', 'user_id', 'userId');
    await queryInterface.renameColumn(
      'UserPoints',
      'total_points',
      'totalPoints',
    );
    await queryInterface.renameColumn('UserPoints', 'created_at', 'createdAt');
    await queryInterface.renameColumn('UserPoints', 'updated_at', 'updatedAt');

    // UserPointsHistory
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
    await queryInterface.renameColumn(
      'UserPointsHistory',
      'restaurant_id',
      'restaurantId',
    );

    // Users
    await queryInterface.renameColumn('Users', 'first_name', 'firstName');
    await queryInterface.renameColumn('Users', 'last_name', 'lastName');
    await queryInterface.renameColumn('Users', 'google_id', 'googleId');
    await queryInterface.renameColumn('Users', 'created_at', 'createdAt');
    await queryInterface.renameColumn('Users', 'updated_at', 'updatedAt');
    await queryInterface.renameColumn(
      'Users',
      'is_email_verified',
      'isEmailVerified',
    );
    await queryInterface.renameColumn(
      'Users',
      'is_phone_verified',
      'isPhoneVerified',
    );
    await queryInterface.renameColumn(
      'Users',
      'email_verification_token',
      'emailVerificationToken',
    );
    await queryInterface.renameColumn(
      'Users',
      'phone_verification_code',
      'phoneVerificationCode',
    );
    await queryInterface.renameColumn(
      'Users',
      'phone_verification_expires_at',
      'phoneVerificationExpiresAt',
    );
  },

  async down(queryInterface, Sequelize) {
    // UserOrganization
    await queryInterface.renameColumn('UserOrganizations', 'userId', 'user_id');
    await queryInterface.renameColumn(
      'UserOrganizations',
      'organizationId',
      'organization_id',
    );
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

    // UserPoints
    await queryInterface.renameColumn('UserPoints', 'userId', 'user_id');
    await queryInterface.renameColumn(
      'UserPoints',
      'totalPoints',
      'total_points',
    );
    await queryInterface.renameColumn('UserPoints', 'createdAt', 'created_at');
    await queryInterface.renameColumn('UserPoints', 'updatedAt', 'updated_at');

    // UserPointsHistory
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
    await queryInterface.renameColumn(
      'UserPointsHistory',
      'restaurantId',
      'restaurant_id',
    );

    // Users
    await queryInterface.renameColumn('Users', 'firstName', 'first_name');
    await queryInterface.renameColumn('Users', 'lastName', 'last_name');
    await queryInterface.renameColumn('Users', 'googleId', 'google_id');
    await queryInterface.renameColumn('Users', 'createdAt', 'created_at');
    await queryInterface.renameColumn('Users', 'updatedAt', 'updated_at');
    await queryInterface.renameColumn(
      'Users',
      'isEmailVerified',
      'is_email_verified',
    );
    await queryInterface.renameColumn(
      'Users',
      'isPhoneVerified',
      'is_phone_verified',
    );
    await queryInterface.renameColumn(
      'Users',
      'emailVerificationToken',
      'email_verification_token',
    );
    await queryInterface.renameColumn(
      'Users',
      'phoneVerificationCode',
      'phone_verification_code',
    );
    await queryInterface.renameColumn(
      'Users',
      'phoneVerificationExpiresAt',
      'phone_verification_expires_at',
    );
  },
};
