'use strict';

module.exports = (sequelize, DataTypes) => {
  const PostInteraction = sequelize.define(
    'PostInteraction',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      postId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      interactionType: {
        type: DataTypes.ENUM(
          'like',
          'share',
          'save',
          'click_profile',
          'click_restaurant',
          'report',
        ),
        allowNull: false,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      timeSpentBefore: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Time spent viewing before interaction in seconds',
      },
    },
    {
      tableName: 'PostInteractions',
      indexes: [
        {
          unique: true,
          fields: ['postId', 'userId', 'interactionType'],
          name: 'unique_user_post_interaction',
        },
        {
          fields: ['postId'],
        },
        {
          fields: ['userId'],
        },
        {
          fields: ['interactionType'],
        },
      ],
    },
  );

  PostInteraction.associate = (models) => {
    PostInteraction.belongsTo(models.RestaurantPost, {
      foreignKey: 'postId',
      as: 'post',
    });
    PostInteraction.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  };

  return PostInteraction;
};
