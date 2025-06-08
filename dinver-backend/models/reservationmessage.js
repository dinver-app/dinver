'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ReservationMessage extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      ReservationMessage.belongsTo(models.Reservation, {
        foreignKey: 'reservationId',
        as: 'reservation',
      });
      ReservationMessage.belongsTo(models.User, {
        foreignKey: 'senderId',
        as: 'sender',
      });
    }
  }
  ReservationMessage.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      reservationId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      senderId: {
        type: DataTypes.UUID,
        allowNull: true, // null for system messages
      },
      messageType: {
        type: DataTypes.ENUM('system', 'user', 'suggestion'),
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      metadata: {
        type: DataTypes.JSONB,
        defaultValue: {},
      },
      readAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'ReservationMessage',
    },
  );
  return ReservationMessage;
};
