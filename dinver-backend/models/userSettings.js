'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserSettings extends Model {
    static associate(models) {
      UserSettings.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }

  UserSettings.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      language: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'en',
      },
      pushNotifications: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      emailNotifications: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      smsNotifications: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
      passwordResetToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      passwordResetExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      emailVerificationExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'UserSettings',
      tableName: 'UserSettings',
    },
  );

  return UserSettings;
};
