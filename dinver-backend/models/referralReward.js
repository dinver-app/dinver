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

    // Helper method to claim the reward
    async claim() {
      if (this.status !== 'PENDING') {
        throw new Error('Reward already claimed or expired');
      }

      const now = new Date();
      if (this.expiresAt && now > this.expiresAt) {
        await this.update({ status: 'EXPIRED' });
        throw new Error('Reward has expired');
      }

      await this.update({
        status: 'CLAIMED',
        claimedAt: now,
      });

      return this;
    }

    // Helper method to check if reward is expired
    isExpired() {
      return this.expiresAt && new Date() > this.expiresAt;
    }

    // Helper method to get reward display information
    getDisplayInfo() {
      const info = {
        type: this.rewardType,
        status: this.status,
        isExpired: this.isExpired(),
      };

      switch (this.rewardType) {
        case 'POINTS':
          info.title = `${this.amount} bodova`;
          info.description = 'Bodovi su dodani na vaš račun';
          info.icon = '⭐';
          break;
        case 'COUPON':
          info.title = 'Kupon nagrada';
          info.description = 'Ekskluzivni kupon je dodan u vaše kupone';
          info.icon = '🎫';
          break;
        case 'CASH':
          info.title = `${this.amount}€`;
          info.description = 'Novčana nagrada';
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
        type: DataTypes.ENUM('PENDING', 'CLAIMED', 'EXPIRED'),
        allowNull: false,
        defaultValue: 'PENDING',
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
