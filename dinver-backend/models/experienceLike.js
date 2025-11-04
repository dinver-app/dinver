'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ExperienceLike extends Model {
    static associate(models) {
      ExperienceLike.belongsTo(models.Experience, {
        foreignKey: 'experienceId',
        as: 'experience',
      });

      ExperienceLike.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });

      ExperienceLike.belongsTo(models.LeaderboardCycle, {
        foreignKey: 'cycleId',
        as: 'cycle',
      });
    }
  }

  ExperienceLike.init(
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
      modelName: 'ExperienceLike',
      tableName: 'ExperienceLikes',
      indexes: [
        {
          fields: ['experienceId'],
        },
        {
          fields: ['userId'],
        },
        {
          fields: ['cycleId'],
        },
        {
          // Ensure one like per user per experience per cycle
          unique: true,
          fields: ['experienceId', 'userId', 'cycleId'],
          name: 'unique_like_per_cycle',
        },
        {
          fields: ['deviceId'],
        },
        {
          fields: ['createdAt'],
        },
      ],
    },
  );

  return ExperienceLike;
};
