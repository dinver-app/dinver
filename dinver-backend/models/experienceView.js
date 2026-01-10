'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ExperienceView extends Model {
    static associate(models) {
      ExperienceView.belongsTo(models.Experience, {
        foreignKey: 'experienceId',
        as: 'experience',
      });

      ExperienceView.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }

  ExperienceView.init(
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
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'ExperienceView',
      tableName: 'ExperienceViews',
      // View records are immutable; only creation timestamp is needed
      updatedAt: false,
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
          fields: ['experienceId', 'ipAddress', 'createdAt'],
          name: 'experience_views_ip_rate_limit_idx',
        },
        {
          // One view per user per experience (for logged-in users)
          unique: true,
          fields: ['experienceId', 'userId'],
          where: {
            userId: {
              [require('sequelize').Op.ne]: null,
            },
          },
          name: 'experience_views_unique_user_idx',
        },
      ],
    },
  );

  return ExperienceView;
};
