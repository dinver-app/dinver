'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Referral extends Model {
    static associate(models) {
      // A referral belongs to a referrer (user who made the referral)
      Referral.belongsTo(models.User, {
        foreignKey: 'referrerId',
        as: 'referrer',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      // A referral belongs to a referred user
      Referral.belongsTo(models.User, {
        foreignKey: 'referredUserId',
        as: 'referredUser',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      // A referral belongs to a referral code
      Referral.belongsTo(models.ReferralCode, {
        foreignKey: 'referralCodeId',
        as: 'referralCode',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      // A referral belongs to a restaurant (for first visit)
      Referral.belongsTo(models.Restaurant, {
        foreignKey: 'firstVisitRestaurantId',
        as: 'firstVisitRestaurant',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });

      // A referral has many rewards
      Referral.hasMany(models.ReferralReward, {
        foreignKey: 'referralId',
        as: 'rewards',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }

    // Helper method to update referral status
    async updateStatus(newStatus, additionalData = {}) {
      const updateData = { status: newStatus };
      const now = new Date();

      switch (newStatus) {
        case 'REGISTERED':
          updateData.registeredAt = now;
          break;
        case 'COMPLETED':
          updateData.completedAt = now;
          if (additionalData.rewardAmount) {
            updateData.rewardAmount = additionalData.rewardAmount;
          }
          if (additionalData.rewardType) {
            updateData.rewardType = additionalData.rewardType;
          }
          break;
      }

      return await this.update(updateData);
    }

    // Helper method to get progress information (i18n-ready, no hardcoded text)
    getProgress() {
      const totalSteps = 2;
      if (this.status === 'COMPLETED') {
        return {
          status: 'COMPLETED',
          step: 2,
          totalSteps,
          completedSteps: 2,
          percentComplete: 100,
          stepCode: 'completed',
          nextStepCode: null,
        };
      }
      // Default: REGISTERED
      return {
        status: 'REGISTERED',
        step: 1,
        totalSteps,
        completedSteps: 1,
        percentComplete: 50,
        stepCode: 'registered',
        nextStepCode: 'first_visit',
      };
    }

    // Helper method to format timeline (i18n-ready, codes only)
    getTimeline() {
      const timeline = [];

      // Registration event (we create referral on registration, so always present)
      timeline.push({
        code: 'registered',
        date: this.registeredAt || this.createdAt,
        completed: !!(this.registeredAt || this.createdAt),
      });

      // Completion event (first visit confirmed and rewards granted)
      if (this.completedAt) {
        timeline.push({
          code: 'completed',
          date: this.completedAt,
          completed: true,
          restaurantId: this.firstVisitRestaurantId || null,
        });
      }

      return timeline;
    }
  }

  Referral.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      referrerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      referredUserId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      referralCodeId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('REGISTERED', 'COMPLETED'),
        allowNull: false,
        defaultValue: 'REGISTERED',
      },
      registeredAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      firstVisitAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      firstVisitRestaurantId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      rewardAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      rewardType: {
        type: DataTypes.ENUM('POINTS', 'COUPON', 'CASH'),
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
    },
    {
      sequelize,
      modelName: 'Referral',
      tableName: 'Referrals',
      freezeTableName: true,
    },
  );

  return Referral;
};
