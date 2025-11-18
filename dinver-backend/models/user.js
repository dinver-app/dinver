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
      User.hasOne(models.UserSettings, {
        foreignKey: 'userId',
        as: 'settings',
      });

      // Referral associations
      User.hasMany(models.User, {
        foreignKey: 'referredBy',
        as: 'referrals',
      });

      User.belongsTo(models.User, {
        foreignKey: 'referredBy',
        as: 'referredByUser',
      });

      // New referral system associations
      User.hasOne(models.ReferralCode, {
        foreignKey: 'userId',
        as: 'referralCodeModel',
      });

      User.hasMany(models.Referral, {
        foreignKey: 'referrerId',
        as: 'sentReferrals',
      });

      User.hasMany(models.Referral, {
        foreignKey: 'referredUserId',
        as: 'receivedReferrals',
      });

      User.hasMany(models.ReferralReward, {
        foreignKey: 'userId',
        as: 'referralRewards',
      });

      // Following system associations
      // Users that this user is following
      User.hasMany(models.UserFollow, {
        foreignKey: 'followerId',
        as: 'following',
      });

      // Users that follow this user
      User.hasMany(models.UserFollow, {
        foreignKey: 'followingId',
        as: 'followers',
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
      name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      gender: {
        type: DataTypes.ENUM('male', 'female', 'other', 'undefined'),
        allowNull: false,
        defaultValue: 'undefined',
      },
      bio: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      instagramUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      tiktokUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      streetAddress: {
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
      birthDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      profileImage: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      banned: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      pushToken: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      referralCode: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      referredBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      usernameLastChanged: {
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
