'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Achievement extends Model {
    static associate(models) {
      Achievement.hasMany(models.UserAchievement, {
        foreignKey: 'achievementId',
      });

      Achievement.belongsToMany(models.User, {
        through: models.UserAchievement,
        foreignKey: 'achievementId',
        otherKey: 'userId',
      });
    }
  }

  Achievement.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: [
            [
              'FOOD_EXPLORER',
              'CITY_HOPPER',
              'ELITE_REVIEWER',
              'RELIABLE_GUEST',
            ],
          ],
        },
      },
      level: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      nameEn: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      nameHr: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      threshold: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Achievement',
    },
  );

  return Achievement;
};
