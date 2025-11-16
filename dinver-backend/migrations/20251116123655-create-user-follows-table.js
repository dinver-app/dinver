'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('UserFollows', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      followerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      followingId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('ACTIVE', 'BLOCKED'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add unique constraint to prevent duplicate follows
    await queryInterface.addConstraint('UserFollows', {
      fields: ['followerId', 'followingId'],
      type: 'unique',
      name: 'unique_follower_following',
    });

    // Add check constraint to prevent self-following
    await queryInterface.addConstraint('UserFollows', {
      fields: ['followerId', 'followingId'],
      type: 'check',
      where: {
        followerId: { [Sequelize.Op.ne]: Sequelize.col('followingId') },
      },
      name: 'prevent_self_follow',
    });

    // Add indexes for performance
    await queryInterface.addIndex('UserFollows', ['followerId'], {
      name: 'idx_user_follows_follower',
    });

    await queryInterface.addIndex('UserFollows', ['followingId'], {
      name: 'idx_user_follows_following',
    });

    await queryInterface.addIndex('UserFollows', ['status'], {
      name: 'idx_user_follows_status',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('UserFollows', 'idx_user_follows_follower');
    await queryInterface.removeIndex('UserFollows', 'idx_user_follows_following');
    await queryInterface.removeIndex('UserFollows', 'idx_user_follows_status');

    // Remove constraints
    await queryInterface.removeConstraint(
      'UserFollows',
      'unique_follower_following',
    );
    await queryInterface.removeConstraint('UserFollows', 'prevent_self_follow');

    // Drop table
    await queryInterface.dropTable('UserFollows');
  },
};
