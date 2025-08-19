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
        case 'FIRST_VISIT':
          updateData.firstVisitAt = now;
          if (additionalData.restaurantId) {
            updateData.firstVisitRestaurantId = additionalData.restaurantId;
          }
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

    // Helper method to get progress information
    getProgress() {
      const progress = {
        step: 1,
        stepName: 'Pending',
        nextStep: 'Registration',
        completedSteps: 0,
        totalSteps: 2,
        percentComplete: 0,
      };

      switch (this.status) {
        case 'PENDING':
          progress.step = 1;
          progress.stepName = 'Pozvan';
          progress.nextStep = 'Registracija';
          progress.completedSteps = 0;
          progress.percentComplete = 0;
          break;
        case 'REGISTERED':
          progress.step = 2;
          progress.stepName = 'Registriran';
          progress.nextStep = 'Prvi posjet restorana';
          progress.completedSteps = 1;
          progress.percentComplete = 50;
          break;
        case 'COMPLETED':
          progress.step = 2;
          progress.stepName = 'Završeno';
          progress.nextStep = null;
          progress.completedSteps = 2;
          progress.percentComplete = 100;
          break;
      }

      return progress;
    }

    // Helper method to format timeline
    getTimeline() {
      const timeline = [];

      // Referral created
      timeline.push({
        step: 1,
        title: 'Poziv poslan',
        description: 'Korisnik je pozvan',
        date: this.createdAt,
        completed: true,
        icon: '📧',
      });

      // Registration
      if (this.registeredAt) {
        timeline.push({
          step: 2,
          title: 'Registracija završena',
          description: 'Korisnik je kreirao račun',
          date: this.registeredAt,
          completed: true,
          icon: '✅',
        });
      } else {
        timeline.push({
          step: 2,
          title: 'Čeka registraciju',
          description: 'Korisnik još nije kreirao račun',
          date: null,
          completed: false,
          icon: '⏳',
        });
      }

      // First visit (now combined with completion)
      if (this.completedAt) {
        timeline.push({
          step: 2,
          title: 'Prvi posjet i nagrada',
          description: 'Korisnik je posjetio restoran i dobio nagradu',
          date: this.completedAt,
          completed: true,
          icon: '🎁',
        });
      } else if (this.registeredAt) {
        timeline.push({
          step: 2,
          title: 'Čeka posjet restorana',
          description: 'Korisnik još nije posjetio restoran',
          date: null,
          completed: false,
          icon: '⏳',
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
        type: DataTypes.ENUM('PENDING', 'REGISTERED', 'COMPLETED'),
        allowNull: false,
        defaultValue: 'PENDING',
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
