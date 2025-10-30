'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LeaderboardCycleWinner extends Model {
    static associate(models) {
      // Winner belongs to a cycle
      LeaderboardCycleWinner.belongsTo(models.LeaderboardCycle, {
        foreignKey: 'cycleId',
        as: 'cycle',
      });

      // Winner belongs to a user
      LeaderboardCycleWinner.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }

    // Check if winner has been notified
    isNotified() {
      return this.notified;
    }

    // Mark as notified
    async markAsNotified() {
      this.notified = true;
      await this.save();
    }

    // Get rank as ordinal string (1st, 2nd, 3rd, etc.)
    getRankOrdinal() {
      const suffixes = ['th', 'st', 'nd', 'rd'];
      const v = this.rank % 100;
      return (
        this.rank + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0])
      );
    }

    // Get formatted points
    getFormattedPoints() {
      return this.pointsAtSelection.toLocaleString();
    }
  }

  LeaderboardCycleWinner.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      cycleId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'LeaderboardCycles',
          key: 'id',
        },
        comment: 'Reference to the cycle',
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        comment: 'Reference to the winner user',
      },
      rank: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'What rank they were (1st, 2nd, random, etc)',
      },
      isGuaranteedWinner: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'True if 1st place guaranteed',
      },
      pointsAtSelection: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'How many points they had when selected',
      },
      selectedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'When they were selected as winner',
      },
      notified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether winner has been notified',
      },
    },
    {
      sequelize,
      modelName: 'LeaderboardCycleWinner',
      tableName: 'LeaderboardCycleWinners',
      freezeTableName: true,
    },
  );

  return LeaderboardCycleWinner;
};
