'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      User.belongsToMany(models.Organization, {
        through: 'UserOrganizations',
        foreignKey: 'userId',
        as: 'organizations',
      });

      User.belongsToMany(models.Restaurant, {
        through: 'UserAdmins',
        foreignKey: 'userId',
        as: 'restaurants',
      });

      User.belongsToMany(models.Restaurant, {
        through: 'UserFavorites',
        foreignKey: 'userId',
        as: 'favoriteRestaurants',
      });
    }
  }
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      firstName: DataTypes.STRING,
      lastName: DataTypes.STRING,
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: DataTypes.STRING,
      googleId: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'user',
      },
      language: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'hr',
      },
      banned: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'User',
    },
  );
  return User;
};
