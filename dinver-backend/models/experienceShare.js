'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ExperienceShare extends Model {
    static associate(models) {
      ExperienceShare.belongsTo(models.Experience, {
        foreignKey: 'experienceId',
        as: 'experience',
      });

      ExperienceShare.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }

  ExperienceShare.init(
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
        allowNull: true, // Allow null for anonymous shares
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true, // For anonymous rate limiting
      },
      platform: {
        type: DataTypes.STRING(50),
        allowNull: true, // e.g., 'copy_link', 'instagram', 'whatsapp', etc.
      },
    },
    {
      sequelize,
      modelName: 'ExperienceShare',
      tableName: 'ExperienceShares',
      updatedAt: false, // We only care about when shares were created
      indexes: [
        {
          fields: ['experienceId'],
        },
        {
          fields: ['userId'],
        },
        {
          fields: ['createdAt'],
        },
        {
          // For anonymous rate limiting
          fields: ['experienceId', 'ipAddress', 'createdAt'],
          name: 'experience_shares_ip_rate_limit_idx',
        },
      ],
    },
  );

  return ExperienceShare;
};
