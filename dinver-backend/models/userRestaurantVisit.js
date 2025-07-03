'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserRestaurantVisit extends Model {
    static associate(models) {
      UserRestaurantVisit.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      UserRestaurantVisit.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
      });
    }

    // Helper metoda za ažuriranje ili kreiranje posjeta
    static async recordVisit(userId, restaurantId) {
      const now = new Date();
      const [visit, created] = await this.findOrCreate({
        where: { userId, restaurantId },
        defaults: {
          firstVisitAt: now,
          lastVisitAt: now,
          visitCount: 1,
        },
      });

      if (!created) {
        await visit.update({
          lastVisitAt: now,
          visitCount: visit.visitCount + 1,
        });
      }

      // Vrati je li ovo prvi posjet ovom restoranu
      return created;
    }

    // Helper metoda za brojanje jedinstvenih restorana
    static async getUniqueRestaurantsCount(userId) {
      return await this.count({
        where: { userId },
        distinct: true,
        col: 'restaurantId',
      });
    }
  }

  UserRestaurantVisit.init(
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
      restaurantId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
      },
      firstVisitAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      lastVisitAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      visitCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
    },
    {
      sequelize,
      modelName: 'UserRestaurantVisit',
      indexes: [
        {
          unique: true,
          fields: ['userId', 'restaurantId'],
        },
      ],
    },
  );

  return UserRestaurantVisit;
};
