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
    },
    {
      sequelize,
      modelName: 'Organization',
    },
  );
  return Organization;
};
