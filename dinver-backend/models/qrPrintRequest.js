'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class QRPrintRequest extends Model {
    static associate(models) {
      QRPrintRequest.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      QRPrintRequest.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
      });
    }
  }
  QRPrintRequest.init(
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
      restaurantId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      showDinverLogo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      showRestaurantName: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      showScanText: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      textPosition: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      qrTextColor: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      qrBackgroundColor: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      qrBorderColor: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      qrBorderWidth: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      padding: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'printed', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
    },
    {
      sequelize,
      modelName: 'QRPrintRequest',
      tableName: 'QRPrintRequests',
    },
  );
  return QRPrintRequest;
};
