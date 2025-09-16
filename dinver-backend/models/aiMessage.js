'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AiMessage extends Model {
    static associate(models) {
      AiMessage.belongsTo(models.AiThread, {
        foreignKey: 'threadId',
        as: 'thread',
      });
    }
  }
  AiMessage.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      threadId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('user', 'assistant'),
        allowNull: false,
      },
      text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      reply: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Full reply object with text, restaurants, items, etc.',
      },
    },
    { sequelize, modelName: 'AiMessage', tableName: 'AiMessages' },
  );
  return AiMessage;
};
