'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserOrganization extends Model {
    static associate(models) {
      UserOrganization.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      UserOrganization.belongsTo(models.Organization, {
        foreignKey: 'organizationId',
        as: 'organization',
      });
    }
  }

  UserOrganization.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      organizationId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'UserOrganization',
      tableName: 'UserOrganization',
    },
  );
  return UserOrganization;
};
