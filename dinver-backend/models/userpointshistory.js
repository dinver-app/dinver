'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserPointsHistory extends Model {
    static associate(models) {
      UserPointsHistory.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      UserPointsHistory.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
      });
    }

    // Helper metoda za kreiranje zapisa o bodovima
    static async logPoints({
      userId,
      actionType,
      points,
      referenceId = null,
      restaurantId = null,
      description,
    }) {
      // Round points to 2 decimal places
      const roundedPoints = Math.round(parseFloat(points) * 100) / 100;

      const history = await this.create({
        userId,
        actionType,
        points: roundedPoints,
        referenceId,
        restaurantId,
        description,
      });

      // Ažuriraj ukupne bodove korisnika
      const userPoints = await this.sequelize.models.UserPoints.findOne({
        where: { userId },
      });

      if (userPoints) {
        await userPoints.addPoints(roundedPoints);
      } else {
        // Ako korisnik nema zapis o bodovima, kreiraj novi
        await this.sequelize.models.UserPoints.create({
          userId,
          totalPoints: roundedPoints,
        });
      }

      // Update active leaderboard cycle participant points
      try {
        const activeLeaderboardCycle =
          await this.sequelize.models.LeaderboardCycle.findOne({
            where: { status: 'active' },
          });

        if (activeLeaderboardCycle) {
          const [participant, created] =
            await this.sequelize.models.LeaderboardCycleParticipant.findOrCreate(
              {
                where: { cycleId: activeLeaderboardCycle.id, userId },
                defaults: { totalPoints: 0 },
              },
            );

          await participant.addPoints(roundedPoints);

          // Recalculate ranks for this cycle after points update
          try {
            const participants =
              await this.sequelize.models.LeaderboardCycleParticipant.findAll({
                where: { cycleId: activeLeaderboardCycle.id },
                order: [['totalPoints', 'DESC']],
              });

            let currentRank = 1;
            for (const p of participants) {
              const pts = parseFloat(p.totalPoints) || 0;
              const newRank = pts > 0 ? currentRank++ : null;
              if (p.rank !== newRank) {
                await p.update({ rank: newRank });
              }
            }
          } catch (rankErr) {
            console.error(
              'Error recalculating ranks after points update:',
              rankErr,
            );
          }
        }
      } catch (error) {
        console.error(
          'Error updating leaderboard cycle participant points:',
          error,
        );
        // Don't throw error - we don't want to break points awarding if cycle update fails
      }

      return history;
    }
  }

  UserPointsHistory.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      restaurantId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      actionType: {
        type: DataTypes.ENUM(
          'review_add',
          'review_elite',
          'review_long',
          'review_with_photo',
          'visit_qr',
          'reservation_visit',
          'achievement_unlocked',
          // Referral-related action types
          'referral_registration_referrer',
          'referral_registration_referred',
          'referral_visit_referrer',
          'referral_verification_referrer',
          'referral_verification_referred',
          'referral_first_receipt_referrer',
          // Points deduction (spending)
          'points_spent_coupon',
          // Receipt validation
          'receipt_upload',
          'receipt_approved',
          'receipt_approved_buddy', // Points awarded to tagged buddies when receipt is approved
        ),
        allowNull: false,
      },
      points: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      referenceId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'UserPointsHistory',
      tableName: 'UserPointsHistory',
      freezeTableName: true,
    },
  );

  return UserPointsHistory;
};
