'use strict';

module.exports = (sequelize, DataTypes) => {
  const PostView = sequelize.define(
    'PostView',
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
        allowNull: true, // Može biti null za nelogirane korisnike
      },
      deviceId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      isAnonymous: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      watchTime: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      completionRate: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      deviceType: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      location: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      timeOfDay: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 0,
          max: 23,
        },
      },
    },
    {
      tableName: 'PostViews',
      indexes: [
        {
          fields: ['postId', 'createdAt'],
        },
        {
          fields: ['userId', 'postId'],
        },
        {
          fields: ['timeOfDay'],
        },
        {
          fields: ['deviceId', 'postId', 'createdAt'],
        },
      ],
    },
  );

  PostView.associate = (models) => {
    PostView.belongsTo(models.RestaurantPost, {
      foreignKey: 'postId',
      as: 'post',
      onDelete: 'CASCADE',
    });
    PostView.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  };

  return PostView;
};
