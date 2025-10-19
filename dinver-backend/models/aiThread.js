'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AiThread extends Model {
    static associate(models) {
      AiThread.hasMany(models.AiMessage, {
        foreignKey: 'threadId',
        as: 'messages',
        onDelete: 'CASCADE',
      });
      AiThread.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
      });
      AiThread.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }
  AiThread.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      restaurantId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      isReadOnly: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      messageCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      lastMessageAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    { sequelize, modelName: 'AiThread', tableName: 'AiThreads' },
  );
  return AiThread;
};
