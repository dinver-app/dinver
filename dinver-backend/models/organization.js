'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Organization extends Model {
    static associate(models) {
      // Organizacija može imati više restorana
      Organization.hasMany(models.Restaurant, {
        foreignKey: 'organizationId',
        as: 'restaurants',
      });

      // Organizacija može imati više korisnika
      Organization.belongsToMany(models.User, {
        through: 'UserOrganizations',
        foreignKey: 'organizationId',
        as: 'users',
      });

      Organization.hasMany(models.UserOrganization, {
        foreignKey: 'organizationId',
        as: 'userOrganizations',
      });
    }
  }
  Organization.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      logo: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      website: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      country: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      postalCode: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Organization',
      tableName: 'Organizations',
    },
  );
  return Organization;
};
