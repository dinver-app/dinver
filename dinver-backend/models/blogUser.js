'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BlogUser extends Model {
    static associate(models) {
      BlogUser.hasMany(models.Blog, {
        foreignKey: 'authorId',
        as: 'blogs',
      });
    }
  }

  BlogUser.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [2, 50],
        },
      },
      profileImage: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isUrl: true,
        },
      },
    },
    {
      sequelize,
      modelName: 'BlogUser',
      tableName: 'BlogUsers',
      paranoid: true, // Enables soft deletes
    },
  );

  return BlogUser;
};
