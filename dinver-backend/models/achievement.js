'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Achievement extends Model {
    static associate(models) {
      Achievement.belongsToMany(models.User, {
        through: 'UserAchievements',
        foreignKey: 'achievementId',
        as: 'users',
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
            ['FOOD_EXPLORER', 'CITY_HOPPER', 'ELITE_REVIEWER', 'WORLD_CUISINE'],
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
