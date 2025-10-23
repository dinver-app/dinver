'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LeaderboardCycleParticipant extends Model {
    static associate(models) {
      // Participant belongs to a cycle
      LeaderboardCycleParticipant.belongsTo(models.LeaderboardCycle, {
        foreignKey: 'cycleId',
        as: 'cycle',
      });

      // Participant belongs to a user
      LeaderboardCycleParticipant.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }

    // Add points to participant's total
    async addPoints(points) {
      // Convert to numbers and round to 2 decimal places
      const currentPoints = parseFloat(this.totalPoints) || 0;
      const pointsToAdd = parseFloat(points) || 0;
      this.totalPoints = Math.round((currentPoints + pointsToAdd) * 100) / 100;

      await this.save();
    }

    // Check if participant has any points
    hasPoints() {
      return this.totalPoints > 0;
    }

    // Get points as formatted string
    getFormattedPoints() {
      return this.totalPoints.toLocaleString();
    }
  }

  LeaderboardCycleParticipant.init(
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
        comment: 'Reference to the user',
      },
      totalPoints: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Cached total points for this cycle',
      },
      rank: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Computed rank based on points',
      },
    },
    {
      sequelize,
      modelName: 'LeaderboardCycleParticipant',
      tableName: 'LeaderboardCycleParticipants',
      freezeTableName: true,
      indexes: [
        {
          unique: true,
          fields: ['cycleId', 'userId'],
          name: 'unique_cycle_participant',
        },
      ],
    },
  );

  return LeaderboardCycleParticipant;
};
