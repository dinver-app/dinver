'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BlogView extends Model {
    static associate(models) {
      BlogView.belongsTo(models.Blog, {
        foreignKey: 'blogId',
        as: 'blog',
      });
    }
  }

  BlogView.init(
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
        type: DataTypes.STRING,
        allowNull: false,
      },
      ipAddress: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      userAgent: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      viewedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'BlogView',
      tableName: 'BlogViews',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['blogId', 'sessionId'],
          name: 'blog_view_unique_session',
        },
        {
          fields: ['blogId'],
          name: 'blog_view_blog_id',
        },
        {
          fields: ['viewedAt'],
          name: 'blog_view_viewed_at',
        },
      ],
    }
  );

  return BlogView;
};
