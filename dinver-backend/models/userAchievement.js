'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserAchievement extends Model {
    static associate(models) {
      UserAchievement.belongsTo(models.User, {
        foreignKey: 'userId',
      });
      UserAchievement.belongsTo(models.Achievement, {
        foreignKey: 'achievementId',
      });
    }
  }

  UserAchievement.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      achievementId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Achievements',
          key: 'id',
        },
      },
      unlockedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'UserAchievement',
      indexes: [
        {
          fields: ['userId', 'achievementId'],
          unique: true,
        },
      ],
    },
  );

  return UserAchievement;
};
