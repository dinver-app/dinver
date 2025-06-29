'use strict';

const { UserPointsHistory, UserPoints } = require('../models');
const { Op } = require('sequelize');

// Definicija bodova za različite akcije
const POINTS_CONFIG = {
  REVIEW_ADD: 10, // Osnovna recenzija (<120 znakova)
  REVIEW_LONG: 10, // Dodatni bodovi za dugu recenziju (>120 znakova)
  REVIEW_WITH_PHOTO: 10, // Dodatni bodovi za sliku
  VISIT_QR: 30, // Skeniranje QR koda u restoranu
  RESERVATION_BONUS: 5, // Bonus za potvrđenu rezervaciju
  EMAIL_VERIFICATION: 20, // Bodovi za verifikaciju emaila
  PHONE_VERIFICATION: 20, // Bodovi za verifikaciju telefona
};

// Definicija tipova akcija (mora odgovarati ENUM vrijednostima u bazi)
const ACTION_TYPES = {
  REVIEW_ADD: 'review_add',
  REVIEW_LONG: 'review_long',
  REVIEW_WITH_PHOTO: 'review_with_photo',
  VISIT_QR: 'visit_qr',
  RESERVATION_BONUS: 'reservation_bonus',
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

  // Dodavanje bonus bodova za rezervaciju
  static async addReservationBonus(userId, reservationId, restaurantId) {
    await UserPointsHistory.logPoints({
      userId,
      actionType: ACTION_TYPES.RESERVATION_BONUS,
      points: POINTS_CONFIG.RESERVATION_BONUS,
      referenceId: reservationId,
      restaurantId,
      description: 'Bonus za potvrđenu rezervaciju',
    });
  }

  // Dodavanje bodova za verifikaciju profila
  static async addProfileVerificationPoints(userId, type) {
    // Using RESERVATION_BONUS as this is a valid enum value
    const actionType = ACTION_TYPES.RESERVATION_BONUS;
    const description =
      type === 'email'
        ? 'Verifikacija email adrese'
        : 'Verifikacija telefonskog broja';

    await UserPointsHistory.logPoints({
      userId,
      actionType,
      points:
        type === 'email'
          ? POINTS_CONFIG.EMAIL_VERIFICATION
          : POINTS_CONFIG.PHONE_VERIFICATION,
      description,
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
