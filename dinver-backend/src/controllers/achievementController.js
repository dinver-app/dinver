const {
  Achievement,
  UserAchievement,
  Restaurant,
  VisitValidation,
  Review,
  Reservation,
  sequelize,
} = require('../../models');
const { Op } = require('sequelize');
const PointsService = require('../utils/pointsService');

const getUserAchievements = async (req, res) => {
  try {
    const userId = req.user.id;

    const achievements = await Achievement.findAll({
      include: [
        {
          model: UserAchievement,
          where: { userId },
          required: false,
        },
      ],
      order: [['threshold', 'ASC']],
    });

    // Group achievements by category
    const achievementsByCategory = achievements.reduce((acc, achievement) => {
      if (!acc[achievement.category]) {
        acc[achievement.category] = [];
      }
      acc[achievement.category].push(achievement);
      return acc;
    }, {});

    const categorySummary = {};
    let totalAchieved = 0;

    // Process each category
    for (const [category, categoryAchievements] of Object.entries(
      achievementsByCategory,
    )) {
      let currentLevel = 0;
      let currentTitle = null;
      let progress = 0;

      // Calculate current progress based on achievement type
      switch (category) {
        case 'FOOD_EXPLORER':
          progress = await Restaurant.count({
            distinct: true,
            include: [
              {
                model: VisitValidation,
                where: {
                  userId,
                  usedAt: { [Op.ne]: null },
                },
                required: true,
              },
            ],
          });
          break;

        case 'CITY_HOPPER':
          progress = await Restaurant.count({
            distinct: true,
            col: 'place',
            include: [
              {
                model: VisitValidation,
                where: {
                  userId,
                  usedAt: { [Op.ne]: null },
                },
                required: true,
              },
            ],
          });
          break;

        case 'ELITE_REVIEWER':
          progress = await Review.count({
            where: {
              userId,
              rating: { [Op.gte]: 4 },
              text: { [Op.not]: null },
              [Op.and]: [
                sequelize.where(sequelize.fn('LENGTH', sequelize.col('text')), {
                  [Op.gte]: 100,
                }),
              ],
            },
          });
          break;

        case 'RELIABLE_GUEST':
          progress = await Reservation.count({
            where: {
              userId,
              status: 'completed',
            },
          });
          break;
      }

      // Find current level and next achievement
      for (const achievement of categoryAchievements) {
        if (progress >= achievement.threshold) {
          currentLevel++;
          currentTitle = {
            en: achievement.nameEn,
            hr: achievement.nameHr,
          };

          // If user hasn't unlocked this achievement yet, unlock it
          const userAchievement = achievement.UserAchievements?.[0];
          if (!userAchievement && progress >= achievement.threshold) {
            const pointsService = new PointsService(sequelize);
            await pointsService.addAchievementPoints(
              userId,
              achievement.id,
              achievement.nameEn,
            );

            await UserAchievement.create({
              userId,
              achievementId: achievement.id,
              unlockedAt: new Date(),
            });
          }
        }
      }

      totalAchieved += currentLevel;

      // Get next level achievement if available
      const nextAchievement = categoryAchievements[currentLevel];

      categorySummary[category] = {
        totalLevels: categoryAchievements.length,
        currentLevel,
        currentTitle: currentTitle,
        nextLevel: nextAchievement
          ? {
              en: nextAchievement.nameEn,
              hr: nextAchievement.nameHr,
              progress,
              threshold: nextAchievement.threshold,
            }
          : null,
      };
    }

    res.json({
      categorySummary,
      totalAchieved,
    });
  } catch (error) {
    console.error('Error getting user achievements:', error);
    res.status(500).json({ error: 'Failed to get achievements' });
  }
};

module.exports = {
  getUserAchievements,
};
