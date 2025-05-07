'use strict';
module.exports = (sequelize, DataTypes) => {
  const RestaurantTranslation = sequelize.define('RestaurantTranslation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    restaurantId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    language: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  });

  RestaurantTranslation.associate = (models) => {
    RestaurantTranslation.belongsTo(models.Restaurant, {
      foreignKey: 'restaurantId',
      as: 'restaurant',
    });
  };

  return RestaurantTranslation;
};
