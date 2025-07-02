const {
  Achievement,
  UserAchievement,
  User,
  Restaurant,
} = require('../../models');
const PointsService = require('../../utils/pointsService');

// Dohvati sve achievemente korisnika
const getUserAchievements = async (req, res) => {
  try {
    const userId = req.user.id;

    // Dohvati sve achievemente grupirane po kategorijama
    const achievements = await Achievement.findAll({
      order: [
        ['category', 'ASC'],
        ['level', 'ASC'],
      ],
    });

    // Dohvati korisnikove achievemente i progress
    const userAchievements = await UserAchievement.findAll({
      where: { userId },
    });

    // Grupiraj achievemente po kategorijama
    const achievementsByCategory = achievements.reduce((acc, achievement) => {
      const userAchievement = userAchievements.find(
        (ua) => ua.achievementId === achievement.id,
      );

      const achievementWithProgress = {
        id: achievement.id,
        category: achievement.category,
        level: achievement.level,
        nameEn: achievement.nameEn,
        nameHr: achievement.nameHr,
        threshold: achievement.threshold,
        progress: userAchievement ? userAchievement.progress : 0,
        achieved: userAchievement ? userAchievement.achieved : false,
        achievedAt: userAchievement ? userAchievement.achievedAt : null,
      };

      if (!acc[achievement.category]) {
        acc[achievement.category] = [];
      }
      acc[achievement.category].push(achievementWithProgress);
      return acc;
    }, {});

    // Kreiraj sažeti pregled po kategorijama
    const categorySummary = Object.entries(achievementsByCategory).reduce(
      (acc, [category, achievements]) => {
        // Sortiramo achievemente po levelu
        const sortedAchievements = [...achievements].sort(
          (a, b) => a.level - b.level,
        );

        // Nađemo najviši postignuti level
        const achievedLevels = sortedAchievements.filter((a) => a.achieved);
        const hasAchievements = achievedLevels.length > 0;

        // Ako ima achievementa, uzimamo zadnji postignuti, inače null
        const currentAchievement = hasAchievements
          ? achievedLevels[achievedLevels.length - 1]
          : null;

        // Sljedeći level je prvi nepostignuti
        const nextToAchieve = sortedAchievements.find((a) => !a.achieved);

        acc[category] = {
          totalLevels: achievements.length,
          currentLevel: currentAchievement ? currentAchievement.level : 0,
          currentTitle: currentAchievement
            ? {
                en: currentAchievement.nameEn,
                hr: currentAchievement.nameHr,
              }
            : null,
          nextLevel: nextToAchieve
            ? {
                en: nextToAchieve.nameEn,
                hr: nextToAchieve.nameHr,
                progress: nextToAchieve.progress,
                threshold: nextToAchieve.threshold,
              }
            : null,
        };
        return acc;
      },
      {},
    );

    res.status(200).json({
      categorySummary,
      totalAchieved: userAchievements.filter((ua) => ua.achieved).length,
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
};

// Ažuriraj progress za određenu kategoriju
const updateCategoryProgress = async (userId, category, currentValue) => {
  try {
    // Dohvati sve achievemente za kategoriju
    const achievements = await Achievement.findAll({
      where: { category },
      order: [['level', 'ASC']],
    });

    for (const achievement of achievements) {
      // Nađi ili kreiraj UserAchievement
      let [userAchievement] = await UserAchievement.findOrCreate({
        where: { userId, achievementId: achievement.id },
        defaults: {
          progress: 0,
          achieved: false,
        },
      });

      // Ako nije achieved, ažuriraj progress
      if (!userAchievement.achieved) {
        const achieved = currentValue >= achievement.threshold;
        await userAchievement.update({
          progress: Math.min(currentValue, achievement.threshold),
          achieved,
          achievedAt: achieved ? new Date() : null,
        });

        // If achievement was just unlocked, award points
        if (achieved) {
          await PointsService.addAchievementPoints(
            userId,
            achievement.id,
            achievement.nameHr,
          );
        }
      }
    }
  } catch (error) {
    console.error(`Error updating ${category} progress:`, error);
  }
};

// Pomoćne funkcije za ažuriranje različitih kategorija
const updateFoodExplorerProgress = async (userId, restaurantCount) => {
  await updateCategoryProgress(userId, 'FOOD_EXPLORER', restaurantCount);
};

const updateCityHopperProgress = async (userId, cityCount) => {
  await updateCategoryProgress(userId, 'CITY_HOPPER', cityCount);
};

const updateEliteReviewerProgress = async (userId, reviewCount) => {
  await updateCategoryProgress(userId, 'ELITE_REVIEWER', reviewCount);
};

// Update RELIABLE_GUEST achievement progress
const updateReliableGuestProgress = async (userId, reservationId) => {
  try {
    // Track this specific reservation
    await UserAchievement.trackProgress(
      userId,
      'RELIABLE_GUEST',
      reservationId, // Use reservation ID as tag
    );
  } catch (error) {
    console.error('Error updating RELIABLE_GUEST achievement:', error);
    throw error;
  }
};

module.exports = {
  getUserAchievements,
  updateFoodExplorerProgress,
  updateCityHopperProgress,
  updateEliteReviewerProgress,
  updateReliableGuestProgress,
};
