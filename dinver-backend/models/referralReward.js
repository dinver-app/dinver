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

      // A reward can be associated with a coupon
      ReferralReward.belongsTo(models.Coupon, {
        foreignKey: 'couponId',
        as: 'coupon',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
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

      switch (this.rewardType) {
        case 'POINTS':
          info.titleCode = 'points_reward';
          info.descriptionCode = 'points_added_to_account';
          info.icon = '⭐';
          break;
        case 'COUPON':
          info.titleCode = 'coupon_reward';
          info.descriptionCode = 'coupon_added_to_wallet';
          info.icon = '🎫';
          break;
        case 'CASH':
          info.titleCode = 'cash_reward';
          info.descriptionCode = 'cash_reward_received';
          info.icon = '💰';
          break;
      }

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
        type: DataTypes.ENUM('POINTS', 'COUPON', 'CASH'),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      couponId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
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
