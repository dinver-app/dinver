'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ExperienceSave extends Model {
    static associate(models) {
      ExperienceSave.belongsTo(models.Experience, {
        foreignKey: 'experienceId',
        as: 'experience',
      });

      ExperienceSave.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });

      ExperienceSave.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
      });

      ExperienceSave.belongsTo(models.LeaderboardCycle, {
        foreignKey: 'cycleId',
        as: 'cycle',
      });
    }
  }

  ExperienceSave.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      experienceId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Experiences',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      restaurantId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'Denormalized for My Map feature',
      },
      cycleId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'LeaderboardCycles',
          key: 'id',
        },
        comment: 'Points are awarded per cycle to prevent duplicate points',
      },
      // Anti-fraud fields
      deviceId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Device identifier for fraud detection',
      },
      ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'IP address for fraud detection',
      },
    },
    {
      sequelize,
      modelName: 'ExperienceSave',
      tableName: 'ExperienceSaves',
      indexes: [
        {
          fields: ['experienceId'],
        },
        {
          fields: ['userId'],
        },
        {
          fields: ['restaurantId'],
        },
        {
          fields: ['cycleId'],
        },
        {
          // Ensure one save per user per restaurant (regardless of which experience)
          unique: true,
          fields: ['userId', 'restaurantId'],
          name: 'unique_save_per_user_restaurant',
        },
        {
          // Track saves per cycle for points
          fields: ['experienceId', 'userId', 'cycleId'],
          name: 'save_per_cycle_index',
        },
        {
          fields: ['createdAt'],
        },
      ],
    },
  );

  return ExperienceSave;
};
