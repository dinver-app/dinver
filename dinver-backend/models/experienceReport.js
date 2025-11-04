'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ExperienceReport extends Model {
    static associate(models) {
      ExperienceReport.belongsTo(models.Experience, {
        foreignKey: 'experienceId',
        as: 'experience',
      });

      ExperienceReport.belongsTo(models.User, {
        foreignKey: 'reporterId',
        as: 'reporter',
      });

      ExperienceReport.belongsTo(models.User, {
        foreignKey: 'reviewedBy',
        as: 'reviewer',
      });
    }
  }

  ExperienceReport.init(
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
      reporterId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      reasonCode: {
        type: DataTypes.ENUM(
          'SPAM',
          'INAPPROPRIATE_CONTENT',
          'MISLEADING',
          'VIOLENCE',
          'HARASSMENT',
          'COPYRIGHT',
          'FAKE_LOCATION',
          'OTHER',
        ),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      state: {
        type: DataTypes.ENUM('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'),
        allowNull: false,
        defaultValue: 'OPEN',
      },
      reviewedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      reviewedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      resolution: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Action taken or reason for dismissal',
      },
      actionTaken: {
        type: DataTypes.ENUM(
          'NONE',
          'CONTENT_REMOVED',
          'USER_WARNED',
          'USER_SUSPENDED',
          'FALSE_REPORT',
        ),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'ExperienceReport',
      tableName: 'ExperienceReports',
      indexes: [
        {
          fields: ['experienceId'],
        },
        {
          fields: ['reporterId'],
        },
        {
          fields: ['state'],
        },
        {
          fields: ['reasonCode'],
        },
        {
          fields: ['createdAt'],
        },
      ],
    },
  );

  return ExperienceReport;
};
