'use strict';

const { UserPointsHistory, UserPoints } = require('../models');
const { Op } = require('sequelize');

// Definicija bodova za različite akcije
const POINTS_CONFIG = {
  REVIEW_ADD: 10, // Osnovna recenzija
  REVIEW_LONG: 10, // Dodatni bodovi za dugu recenziju (>120 znakova)
  REVIEW_WITH_PHOTO: 10, // Dodatni bodovi za sliku
  VISIT_QR: 30, // Skeniranje QR koda u restoranu
  RESERVATION_CREATED: 5, // Kreirana rezervacija
  RESERVATION_ATTENDED: 10, // Odrađena rezervacija
  PROFILE_VERIFY: 20, // Verifikacija profila
  FIRST_FAVORITE: 5, // Prvi favorit
  NEW_CUISINE_TYPE: 5, // Nova vrsta kuhinje
  ACHIEVEMENT_UNLOCKED: 10, // Otključano postignuće
};

// Definicija tipova akcija (mora odgovarati ENUM vrijednostima u bazi)
const ACTION_TYPES = {
  REVIEW_ADD: 'review_add',
  REVIEW_LONG: 'review_long',
  REVIEW_WITH_PHOTO: 'review_with_photo',
  VISIT_QR: 'visit_qr',
  RESERVATION_CREATED: 'reservation_created',
  RESERVATION_ATTENDED: 'reservation_attended',
  RESERVATION_CANCELLED: 'reservation_cancelled_by_user',
  PROFILE_VERIFY: 'profile_verify',
  FIRST_FAVORITE: 'first_favorite',
  NEW_CUISINE_TYPE: 'new_cuisine_type',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
};

class PointsService {
  // Dodavanje bodova za recenziju
  static async addReviewPoints(
    userId,
    reviewId,
    text,
    hasPhoto = false,
    restaurantId,
  ) {
    // Prvo dodaj osnovne bodove za recenziju
    await UserPointsHistory.logPoints({
      userId,
      actionType: ACTION_TYPES.REVIEW_ADD,
      points: POINTS_CONFIG.REVIEW_ADD,
      referenceId: reviewId,
      restaurantId,
      description: 'Dodana nova recenzija',
    });

    // Ako je recenzija duža od 120 znakova, dodaj bonus
    if (text && text.length > 120) {
      await UserPointsHistory.logPoints({
        userId,
        actionType: ACTION_TYPES.REVIEW_LONG,
        points: POINTS_CONFIG.REVIEW_LONG,
        referenceId: reviewId,
        restaurantId,
        description: 'Bonus za detaljnu recenziju',
      });
    }

    // Ako recenzija ima sliku, dodaj dodatne bodove
    if (hasPhoto) {
      await UserPointsHistory.logPoints({
        userId,
        actionType: ACTION_TYPES.REVIEW_WITH_PHOTO,
        points: POINTS_CONFIG.REVIEW_WITH_PHOTO,
        referenceId: reviewId,
        restaurantId,
        description: 'Dodana slika uz recenziju',
      });
    }
  }

  // Dodavanje bodova za QR sken posjete
  static async addVisitPoints(userId, restaurantId) {
    // Provjeri je li korisnik već danas skenirao QR kod ovog restorana
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingScan = await UserPointsHistory.findOne({
      where: {
        userId,
        restaurantId,
        actionType: ACTION_TYPES.VISIT_QR,
        createdAt: {
          [Op.gte]: today,
        },
      },
    });

    if (existingScan) {
      throw new Error('Već ste danas skenirali QR kod ovog restorana');
    }

    await UserPointsHistory.logPoints({
      userId,
      actionType: ACTION_TYPES.VISIT_QR,
      points: POINTS_CONFIG.VISIT_QR,
      referenceId: restaurantId,
      restaurantId,
      description: 'Potvrđen dolazak u restoran',
    });
  }

  // Dodavanje bodova za rezervaciju
  static async addReservationPoints(userId, reservationId, restaurantId, type) {
    const actionType =
      type === 'created'
        ? ACTION_TYPES.RESERVATION_CREATED
        : ACTION_TYPES.RESERVATION_ATTENDED;

    const points =
      type === 'created'
        ? POINTS_CONFIG.RESERVATION_CREATED
        : POINTS_CONFIG.RESERVATION_ATTENDED;

    const description =
      type === 'created' ? 'Kreirana nova rezervacija' : 'Odrađena rezervacija';

    await UserPointsHistory.logPoints({
      userId,
      actionType,
      points,
      referenceId: reservationId,
      restaurantId,
      description,
    });
  }

  // Dodavanje bodova za verifikaciju profila
  static async addProfileVerificationPoints(userId) {
    await UserPointsHistory.logPoints({
      userId,
      actionType: ACTION_TYPES.PROFILE_VERIFY,
      points: POINTS_CONFIG.PROFILE_VERIFY,
      description: 'Verifikacija profila',
    });
  }

  // Dodavanje bodova za prvi favorit
  static async addFirstFavoritePoints(userId, restaurantId) {
    await UserPointsHistory.logPoints({
      userId,
      actionType: ACTION_TYPES.FIRST_FAVORITE,
      points: POINTS_CONFIG.FIRST_FAVORITE,
      referenceId: restaurantId,
      restaurantId,
      description: 'Prvi favorit dodan',
    });
  }

  // Dodavanje bodova za novu vrstu kuhinje
  static async addNewCuisineTypePoints(userId, restaurantId) {
    await UserPointsHistory.logPoints({
      userId,
      actionType: ACTION_TYPES.NEW_CUISINE_TYPE,
      points: POINTS_CONFIG.NEW_CUISINE_TYPE,
      referenceId: restaurantId,
      restaurantId,
      description: 'Isprobana nova vrsta kuhinje',
    });
  }

  // Dodavanje bodova za otključano postignuće
  static async addAchievementPoints(userId, achievementId, achievementName) {
    await UserPointsHistory.logPoints({
      userId,
      actionType: ACTION_TYPES.ACHIEVEMENT_UNLOCKED,
      points: POINTS_CONFIG.ACHIEVEMENT_UNLOCKED,
      referenceId: achievementId,
      description: `Otključano postignuće: ${achievementName}`,
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
