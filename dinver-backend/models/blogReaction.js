'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BlogReaction extends Model {
    static associate(models) {
      BlogReaction.belongsTo(models.Blog, {
        foreignKey: 'blogId',
        as: 'blog',
      });
    }
  }

  BlogReaction.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      blogId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Blogs',
          key: 'id',
        },
      },
      sessionId: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      reactionType: {
        type: DataTypes.ENUM('like', 'dislike'),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'BlogReaction',
      tableName: 'BlogReactions',
      indexes: [
        {
          unique: true,
          fields: ['blogId', 'sessionId'],
          name: 'blog_reactions_blog_session_unique',
        },
        {
          fields: ['blogId'],
          name: 'blog_reactions_blog_id_idx',
        },
      ],
    },
  );

  return BlogReaction;
};
