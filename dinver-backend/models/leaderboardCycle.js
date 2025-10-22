'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LeaderboardCycle extends Model {
    static associate(models) {
      // Cycle belongs to sysadmin who created it
      LeaderboardCycle.belongsTo(models.UserSysadmin, {
        foreignKey: 'createdBy',
        as: 'creator',
      });

      // Cycle has many participants
      LeaderboardCycle.hasMany(models.LeaderboardCycleParticipant, {
        foreignKey: 'cycleId',
        as: 'participants',
      });

      // Cycle has many winners
      LeaderboardCycle.hasMany(models.LeaderboardCycleWinner, {
        foreignKey: 'cycleId',
        as: 'winners',
      });
    }

    // Check if cycle is currently active
    isActive() {
      return this.status === 'active';
    }

    // Check if cycle is completed
    isCompleted() {
      return this.status === 'completed';
    }

    // Check if cycle is scheduled
    isScheduled() {
      return this.status === 'scheduled';
    }

    // Check if cycle is cancelled
    isCancelled() {
      return this.status === 'cancelled';
    }

    // Check if cycle has ended (past end date)
    hasEnded() {
      return new Date() > new Date(this.endDate);
    }

    // Check if cycle should start (past start date)
    shouldStart() {
      return new Date() >= new Date(this.startDate);
    }

    // Get cycle duration in days
    getDurationInDays() {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    }

    // Get remaining days until end
    getRemainingDays() {
      const now = new Date();
      const end = new Date(this.endDate);
      const diff = end - now;
      return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    // Get cycle progress percentage (0-100)
    getProgressPercentage() {
      const now = new Date();
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);

      if (now < start) return 0;
      if (now > end) return 100;

      const total = end - start;
      const elapsed = now - start;
      return Math.round((elapsed / total) * 100);
    }
  }

  LeaderboardCycle.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Cycle name/title',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Rich text content with rules and prizes',
      },
      headerImageUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'S3 key for header image',
      },
      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Cycle start date',
      },
      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Cycle end date',
      },
      status: {
        type: DataTypes.ENUM('scheduled', 'active', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'scheduled',
        comment: 'Current cycle status',
      },
      numberOfWinners: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Number of winners to select',
      },
      guaranteeFirstPlace: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'If true, 1st place always wins + (N-1) random',
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'UserSysadmins',
          key: 'id',
        },
        comment: 'Sysadmin who created the cycle',
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When cycle was completed',
      },
    },
    {
      sequelize,
      modelName: 'LeaderboardCycle',
      tableName: 'LeaderboardCycles',
      freezeTableName: true,
    },
  );

  return LeaderboardCycle;
};
