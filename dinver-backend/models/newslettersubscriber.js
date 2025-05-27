const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class NewsletterSubscriber extends Model {
    static associate(models) {
      // define associations here if needed in the future
    }
  }

  NewsletterSubscriber.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      status: {
        type: DataTypes.ENUM('active', 'unsubscribed'),
        defaultValue: 'active',
      },
      subscribedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      unsubscribedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      source: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'NewsletterSubscriber',
      paranoid: true, // Enables soft deletes
    },
  );

  return NewsletterSubscriber;
};
