'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserAchievement extends Model {
    static associate(models) {
      UserAchievement.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      UserAchievement.belongsTo(models.Achievement, {
        foreignKey: 'achievementId',
        as: 'achievement',
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
      progress: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      achieved: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      achievedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'UserAchievement',
    },
  );

  return UserAchievement;
};
