'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create ReferralCodes table
    await queryInterface.createTable('ReferralCodes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      code: {
        type: Sequelize.STRING(8),
        allowNull: false,
        unique: true,
        comment: 'Unique referral code (8 characters)',
      },
      totalReferrals: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total number of successful referrals',
      },
      totalRewards: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: 'Total rewards earned from referrals',
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether the referral code is active',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Create Referrals table
    await queryInterface.createTable('Referrals', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      referrerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'User who made the referral',
      },
      referredUserId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'User who was referred',
      },
      referralCodeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'ReferralCodes',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM(
          'PENDING',
          'REGISTERED',
          'FIRST_VISIT',
          'COMPLETED',
        ),
        allowNull: false,
        defaultValue: 'PENDING',
        comment:
          'PENDING -> REGISTERED (account created) -> FIRST_VISIT (visited restaurant) -> COMPLETED (reward earned)',
      },
      registeredAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the referred user completed registration',
      },
      firstVisitAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the referred user made their first restaurant visit',
      },
      firstVisitRestaurantId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Restaurant where the first visit occurred',
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the referral was completed and rewards were given',
      },
      rewardAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Reward amount given to referrer',
      },
      rewardType: {
        type: Sequelize.ENUM('POINTS', 'COUPON', 'CASH'),
        allowNull: true,
        comment: 'Type of reward given',
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional metadata (e.g., coupon details, campaign info)',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Create ReferralRewards table
    await queryInterface.createTable('ReferralRewards', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      referralId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Referrals',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'User who received the reward',
      },
      rewardType: {
        type: Sequelize.ENUM('POINTS', 'COUPON', 'CASH'),
        allowNull: false,
        comment: 'Type of reward',
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Reward amount (for POINTS or CASH)',
      },
      couponId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Coupons',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Coupon given as reward',
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'CLAIMED', 'EXPIRED'),
        allowNull: false,
        defaultValue: 'PENDING',
        comment: 'Status of the reward',
      },
      claimedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the reward was claimed',
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the reward expires',
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional reward metadata',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex('ReferralCodes', ['userId']);
    await queryInterface.addIndex('ReferralCodes', ['code']);
    await queryInterface.addIndex('Referrals', ['referrerId']);
    await queryInterface.addIndex('Referrals', ['referredUserId']);
    await queryInterface.addIndex('Referrals', ['status']);
    await queryInterface.addIndex('Referrals', ['referralCodeId']);
    await queryInterface.addIndex('ReferralRewards', ['referralId']);
    await queryInterface.addIndex('ReferralRewards', ['userId']);
    await queryInterface.addIndex('ReferralRewards', ['status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ReferralRewards');
    await queryInterface.dropTable('Referrals');
    await queryInterface.dropTable('ReferralCodes');
  },
};
