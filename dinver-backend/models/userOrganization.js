'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserOrganization extends Model {
    static associate() {}
  }
  UserOrganization.init(
    {
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      organizationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Organizations',
          key: 'id',
        },
      },
    },
    {
      sequelize,
      modelName: 'UserOrganization',
    },
  );
  return UserOrganization;
};
