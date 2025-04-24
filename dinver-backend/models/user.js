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
      User.hasMany(models.Review, {
        foreignKey: 'userId',
        as: 'reviews',
      });
      User.belongsToMany(models.Restaurant, {
        through: 'UserFavorites',
        foreignKey: 'userId',
        otherKey: 'restaurantId',
        as: 'favoriteRestaurants',
      });
      User.belongsToMany(models.Restaurant, {
        through: 'UserAdmins',
        foreignKey: 'userId',
        otherKey: 'restaurantId',
        as: 'adminRestaurants',
      });
      User.hasOne(models.UserPoints, {
        foreignKey: 'userId',
        as: 'points',
      });
      User.hasMany(models.UserPointsHistory, {
        foreignKey: 'userId',
        as: 'pointsHistory',
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
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      googleId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      isEmailVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isPhoneVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      emailVerificationToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phoneVerificationCode: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phoneVerificationExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'Users',
    },
  );
  return User;
};
