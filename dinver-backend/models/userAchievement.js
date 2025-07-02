'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserAchievement extends Model {
    static associate(models) {
      UserAchievement.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      UserAchievement.belongsTo(models.Achievement, {
        foreignKey: 'achievementId',
        as: 'achievement',
      });
    }

    // Helper metoda za praćenje progresa s tagovima
    static async trackProgress(userId, category, tagId) {
      // Nađi achievement za ovu kategoriju
      const achievement = await sequelize.models.Achievement.findOne({
        where: { category },
      });

      if (!achievement) return;

      // Provjeri postoji li već zapis za ovaj tag
      const existingProgress = await this.findOne({
        where: {
          userId,
          achievementId: achievement.id,
          tagId,
        },
      });

      // Ako ne postoji, kreiraj novi
      if (!existingProgress) {
        await this.create({
          userId,
          achievementId: achievement.id,
          tagId,
          progress: 1,
          achieved: false,
        });

        // Dohvati ukupan broj jedinstvenih tagova za ovu kategoriju
        const uniqueCount = await this.count({
          where: {
            userId,
            achievementId: achievement.id,
          },
          distinct: true,
          col: 'tagId',
        });

        // Ažuriraj glavni progress record
        const [mainProgress] = await this.findOrCreate({
          where: {
            userId,
            achievementId: achievement.id,
            tagId: null, // glavni record nema tag
          },
          defaults: {
            progress: 1,
            achieved: false,
          },
        });

        if (!mainProgress.isNewRecord) {
          await mainProgress.update({
            progress: uniqueCount,
          });
        }

        return uniqueCount;
      }

      return null; // ako tag već postoji, ne računamo ga ponovno
    }
  }

  UserAchievement.init(
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
      achievementId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Achievements',
          key: 'id',
        },
      },
      tagId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      progress: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      achieved: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      achievedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'UserAchievement',
      indexes: [
        {
          fields: ['userId', 'achievementId', 'tagId'],
          name: 'user_achievement_tag_idx',
        },
      ],
    },
  );

  return UserAchievement;
};
