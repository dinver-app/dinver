'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ReferralCode extends Model {
    static associate(models) {
      // A user has one referral code
      ReferralCode.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      // A referral code has many referrals
      ReferralCode.hasMany(models.Referral, {
        foreignKey: 'referralCodeId',
        as: 'referrals',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }

    // Helper method to generate unique referral code
    static async generateUniqueCode() {
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code;
      let isUnique = false;

      while (!isUnique) {
        code = '';
        for (let i = 0; i < 8; i++) {
          code += characters.charAt(
            Math.floor(Math.random() * characters.length),
          );
        }

        // Check if code already exists
        const existingCode = await ReferralCode.findOne({ where: { code } });
        if (!existingCode) {
          isUnique = true;
        }
      }

      return code;
    }

    // Helper method to get referral statistics (two-phase model)
    async getStatistics() {
      const referrals = await this.getReferrals({
        include: [
          {
            model: sequelize.models.User,
            as: 'referredUser',
            attributes: ['firstName', 'lastName', 'email'],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      const stats = {
        total: referrals.length,
        registered: 0,
        completed: 0,
        totalRewards: parseFloat(this.totalRewards) || 0,
      };

      referrals.forEach((referral) => {
        switch (referral.status) {
          case 'REGISTERED':
            stats.registered++;
            break;
          case 'COMPLETED':
            stats.completed++;
            break;
        }
      });

      return { stats, referrals };
    }
  }

  ReferralCode.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      code: {
        type: DataTypes.STRING(8),
        allowNull: false,
        unique: true,
        comment: 'Unique referral code (8 characters)',
      },
      totalReferrals: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total number of successful referrals',
      },
      totalRewards: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: 'Total rewards earned from referrals',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether the referral code is active',
      },
    },
    {
      sequelize,
      modelName: 'ReferralCode',
      tableName: 'ReferralCodes',
      freezeTableName: true,
    },
  );

  return ReferralCode;
};
