'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ExperienceLike extends Model {
    static associate(models) {
      ExperienceLike.belongsTo(models.Experience, {
        foreignKey: 'experienceId',
        as: 'experience',
      });

      ExperienceLike.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }

  ExperienceLike.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      experienceId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Experiences',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
    },
    {
      sequelize,
      modelName: 'ExperienceLike',
      tableName: 'ExperienceLikes',
      indexes: [
        {
          fields: ['experienceId'],
        },
        {
          fields: ['userId'],
        },
        {
          // One like per user per experience
          unique: true,
          fields: ['experienceId', 'userId'],
          name: 'unique_experience_like',
        },
        {
          fields: ['createdAt'],
        },
      ],
    },
  );

  return ExperienceLike;
};
