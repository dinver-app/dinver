'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SearchHistory extends Model {
    static associate(models) {
      SearchHistory.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }

  SearchHistory.init(
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
      searchTerm: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'SearchHistory',
      tableName: 'SearchHistory',
    },
  );

  return SearchHistory;
};
