'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserFollow extends Model {
    static associate(models) {
      // User who is following
      UserFollow.belongsTo(models.User, {
        foreignKey: 'followerId',
        as: 'follower',
      });

      // User being followed
      UserFollow.belongsTo(models.User, {
        foreignKey: 'followingId',
        as: 'following',
      });
    }

    // Helper method to check if two users are buddies (mutual following)
    static async areBuddies(userId1, userId2) {
      const follow1 = await UserFollow.findOne({
        where: {
          followerId: userId1,
          followingId: userId2,
          status: 'ACTIVE',
        },
      });

      const follow2 = await UserFollow.findOne({
        where: {
          followerId: userId2,
          followingId: userId1,
          status: 'ACTIVE',
        },
      });

      return !!(follow1 && follow2);
    }

    // Helper method to get follow status between two users
    static async getFollowStatus(currentUserId, targetUserId) {
      const [isFollowing, isFollowedBy] = await Promise.all([
        UserFollow.findOne({
          where: {
            followerId: currentUserId,
            followingId: targetUserId,
            status: 'ACTIVE',
          },
        }),
        UserFollow.findOne({
          where: {
            followerId: targetUserId,
            followingId: currentUserId,
            status: 'ACTIVE',
          },
        }),
      ]);

      return {
        isFollowing: !!isFollowing,
        isFollowedBy: !!isFollowedBy,
        isBuddy: !!(isFollowing && isFollowedBy),
        followedAt: isFollowing?.createdAt || null,
        followerSince: isFollowedBy?.createdAt || null,
      };
    }
  }

  UserFollow.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      followerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      followingId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      status: {
        type: DataTypes.ENUM('ACTIVE', 'BLOCKED'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
    },
    {
      sequelize,
      modelName: 'UserFollow',
      tableName: 'UserFollows',
      indexes: [
        {
          unique: true,
          fields: ['followerId', 'followingId'],
        },
        {
          fields: ['followerId'],
        },
        {
          fields: ['followingId'],
        },
        {
          fields: ['status'],
        },
      ],
      validate: {
        cannotFollowSelf() {
          if (this.followerId === this.followingId) {
            throw new Error('Users cannot follow themselves');
          }
        },
      },
    },
  );

  return UserFollow;
};
