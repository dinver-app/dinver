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
      is_email_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_phone_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      email_verification_token: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phone_verification_code: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phone_verification_expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'User',
    },
  );
  return User;
};
