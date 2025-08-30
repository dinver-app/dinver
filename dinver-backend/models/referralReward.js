'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ReferralReward extends Model {
    static associate(models) {
      // A reward belongs to a referral
      ReferralReward.belongsTo(models.Referral, {
        foreignKey: 'referralId',
        as: 'referral',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      // A reward belongs to a user
      ReferralReward.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      // No coupon linkage for referral rewards (POINTS only)
    }

    // Claim flow removed as rewards are auto-claimed in current design
    async claim() {
      return this;
    }

    // Helper method to check if reward is expired
    isExpired() {
      return this.expiresAt && new Date() > this.expiresAt;
    }

    // Helper method to get reward display information (i18n-ready codes)
    getDisplayInfo() {
      const info = {
        type: this.rewardType,
        status: this.status,
        isExpired: this.isExpired(),
      };

      // Only POINTS are supported for referral rewards
      info.titleCode = 'points_reward';
      info.descriptionCode = 'points_added_to_account';
      info.icon = '⭐';

      return info;
    }
  }

  ReferralReward.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      referralId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      rewardType: {
        type: DataTypes.ENUM('POINTS'),
        allowNull: false,
        defaultValue: 'POINTS',
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      // couponId removed – referral rewards are POINTS only
      status: {
        type: DataTypes.ENUM('CLAIMED'),
        allowNull: false,
        defaultValue: 'CLAIMED',
      },
      claimedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      expiresAt: {
        type: DataTypes.DATE,
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
      modelName: 'ReferralReward',
      tableName: 'ReferralRewards',
      freezeTableName: true,
    },
  );

  return ReferralReward;
};
