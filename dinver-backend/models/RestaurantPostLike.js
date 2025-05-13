'use strict';

module.exports = (sequelize, DataTypes) => {
  const RestaurantPostLike = sequelize.define(
    'RestaurantPostLike',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      postId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      tableName: 'RestaurantPostLikes',
    },
  );

  RestaurantPostLike.associate = (models) => {
    RestaurantPostLike.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
    RestaurantPostLike.belongsTo(models.RestaurantPost, {
      foreignKey: 'postId',
      as: 'post',
    });
  };

  return RestaurantPostLike;
};
