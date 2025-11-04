'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ExperienceModerationQueue extends Model {
    static associate(models) {
      ExperienceModerationQueue.belongsTo(models.Experience, {
        foreignKey: 'experienceId',
        as: 'experience',
      });

      ExperienceModerationQueue.belongsTo(models.User, {
        foreignKey: 'assignedTo',
        as: 'moderator',
      });

      ExperienceModerationQueue.belongsTo(models.User, {
        foreignKey: 'decidedBy',
        as: 'decisionMaker',
      });
    }
  }

  ExperienceModerationQueue.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      experienceId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'Experiences',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      state: {
        type: DataTypes.ENUM('PENDING', 'IN_REVIEW', 'DECIDED', 'ESCALATED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      priority: {
        type: DataTypes.ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT'),
        allowNull: false,
        defaultValue: 'NORMAL',
        comment:
          'Priority based on user trust score, NSFW score, report count',
      },
      assignedTo: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      assignedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      decidedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      decidedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      decision: {
        type: DataTypes.ENUM('APPROVED', 'REJECTED'),
        allowNull: true,
      },
      rejectionReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // AI/ML flags
      autoFlags: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment:
          'Automated flags: {nsfw: bool, violentContent: bool, spam: bool}',
      },
      // Moderation notes
      moderatorNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // SLA tracking
      slaDeadline: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When this item must be reviewed (24h SLA)',
      },
      slaViolated: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'ExperienceModerationQueue',
      tableName: 'ExperienceModerationQueues',
      indexes: [
        {
          fields: ['experienceId'],
          unique: true,
        },
        {
          fields: ['state'],
        },
        {
          fields: ['priority'],
        },
        {
          fields: ['assignedTo'],
        },
        {
          fields: ['state', 'priority', 'createdAt'],
        },
        {
          fields: ['slaDeadline'],
        },
        {
          fields: ['slaViolated'],
        },
      ],
    },
  );

  return ExperienceModerationQueue;
};
