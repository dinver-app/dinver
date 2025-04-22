'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserPoints extends Model {
    static associate(models) {
      UserPoints.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
    }

    // Helper metoda za dodavanje bodova i ažuriranje levela
    async addPoints(points) {
      this.total_points += points;

      // Ažuriraj level bazirano na ukupnim bodovima
      if (this.total_points >= 1000) this.level = 5;
      else if (this.total_points >= 500) this.level = 4;
      else if (this.total_points >= 250) this.level = 3;
      else if (this.total_points >= 100) this.level = 2;
      else this.level = 1;

      await this.save();
    }

    // Helper metoda za dohvaćanje naziva levela
    getLevelName() {
      const levelNames = {
        1: 'Bronze',
        2: 'Silver',
        3: 'Gold',
        4: 'Platinum',
        5: 'Diamond',
      };
      return levelNames[this.level] || 'Unknown';
    }
  }

  UserPoints.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      total_points: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      level_name: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.getLevelName();
        },
      },
    },
    {
      sequelize,
      modelName: 'UserPoints',
      tableName: 'UserPoints',
      freezeTableName: true,
      underscored: true,
    },
  );

  return UserPoints;
};
