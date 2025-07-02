'use strict';

const { UserPointsHistory, UserPoints } = require('../models');
const { Op } = require('sequelize');

// Definicija bodova za različite akcije
const POINTS_CONFIG = {
  REVIEW_ADD: 10, // Osnovna recenzija
  REVIEW_LONG: 5, // Dodatni bodovi za dugu recenziju
  REVIEW_WITH_PHOTO: 5, // Dodatni bodovi za sliku
  VISIT_QR: 20, // Skeniranje QR koda u restoranu
  RESERVATION_VISIT: 5, // Bonus bodovi za dolazak preko rezervacije
  ACHIEVEMENT_UNLOCKED: 5, // Otključano postignuće
};

// Definicija tipova akcija (mora odgovarati ENUM vrijednostima u bazi)
const ACTION_TYPES = {
  REVIEW_ADD: 'review_add',
  REVIEW_LONG: 'review_long',
  REVIEW_WITH_PHOTO: 'review_with_photo',
  VISIT_QR: 'visit_qr',
  RESERVATION_VISIT: 'reservation_visit',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
};

class PointsService {
  // Dodavanje bodova za recenziju
  static async addReviewPoints(
    userId,
    reviewId,
    restaurantId,
    hasPhoto,
    isLongReview,
  ) {
    // Dodaj osnovne bodove za recenziju
    await UserPointsHistory.logPoints({
      userId,
      actionType: ACTION_TYPES.REVIEW_ADD,
      points: POINTS_CONFIG.REVIEW_ADD,
      referenceId: reviewId,
      restaurantId,
      description: 'Napisana recenzija',
    });

    // Ako recenzija ima sliku, dodaj bonus bodove
    if (hasPhoto) {
      await UserPointsHistory.logPoints({
        userId,
        actionType: ACTION_TYPES.REVIEW_WITH_PHOTO,
        points: POINTS_CONFIG.REVIEW_WITH_PHOTO,
        referenceId: reviewId,
        restaurantId,
        description: 'Bonus bodovi za sliku u recenziji',
      });
    }

    // Ako je recenzija duga, dodaj bonus bodove
    if (isLongReview) {
      await UserPointsHistory.logPoints({
        userId,
        actionType: ACTION_TYPES.REVIEW_LONG,
        points: POINTS_CONFIG.REVIEW_LONG,
        referenceId: reviewId,
        restaurantId,
        description: 'Bonus bodovi za dugu recenziju',
      });
    }
  }

  // Dodavanje bodova za QR sken posjete
  static async addVisitPoints(
    userId,
    restaurantId,
    isReservationVisit = false,
  ) {
    // Provjeri zadnji posjet ovom restoranu u zadnjih 30 dana
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const lastVisit = await UserPointsHistory.findOne({
      where: {
        userId,
        restaurantId,
        actionType: ACTION_TYPES.VISIT_QR,
        createdAt: {
          [Op.gte]: thirtyDaysAgo,
        },
      },
      order: [['createdAt', 'DESC']],
    });

    // Ako nije bilo posjeta u zadnjih 30 dana, dodijeli bodove za posjet
    if (!lastVisit) {
      await UserPointsHistory.logPoints({
        userId,
        actionType: ACTION_TYPES.VISIT_QR,
        points: POINTS_CONFIG.VISIT_QR,
        referenceId: restaurantId,
        restaurantId,
        description: 'Potvrđen dolazak u restoran',
      });
    }

    // Ako je posjet preko rezervacije, uvijek dodaj bonus bodove (neovisno o 30 dana)
    if (isReservationVisit) {
      await UserPointsHistory.logPoints({
        userId,
        actionType: ACTION_TYPES.RESERVATION_VISIT,
        points: POINTS_CONFIG.RESERVATION_VISIT,
        referenceId: restaurantId,
        restaurantId,
        description: 'Bonus bodovi za dolazak preko rezervacije',
      });
    }
  }

  // Dodavanje bodova za postignuće
  static async addAchievementPoints(userId, achievementId, achievementName) {
    await UserPointsHistory.logPoints({
      userId,
      actionType: ACTION_TYPES.ACHIEVEMENT_UNLOCKED,
      points: POINTS_CONFIG.ACHIEVEMENT_UNLOCKED,
      referenceId: achievementId,
      description: `Otključano novo postignuće: ${achievementName}`,
    });
  }

  // Dohvati ukupan broj bodova korisnika
  static async getUserPoints(userId) {
    const userPoints = await UserPoints.findOne({
      where: { userId },
    });
    return userPoints ? userPoints.totalPoints : 0;
  }
}

module.exports = PointsService;
