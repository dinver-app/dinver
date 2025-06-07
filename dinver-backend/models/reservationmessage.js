'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ReservationMessage extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  ReservationMessage.init({
    id: DataTypes.UUID,
    reservationId: DataTypes.UUID,
    senderId: DataTypes.UUID,
    messageType: DataTypes.ENUM,
    content: DataTypes.TEXT,
    metadata: DataTypes.JSONB,
    readAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'ReservationMessage',
  });
  return ReservationMessage;
};