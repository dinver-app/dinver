'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserSysadmin extends Model {
    static associate(models) {
      UserSysadmin.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }
  UserSysadmin.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
    },
    {
      sequelize,
      modelName: 'UserSysadmin',
    },
  );
  return UserSysadmin;
};
