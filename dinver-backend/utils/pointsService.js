'use strict';

const { UserPointsHistory, UserPoints } = require('../models');
const { Op } = require('sequelize');

// Definicija bodova za različite akcije
const POINTS_CONFIG = {
  review_add: 10, // Osnovna recenzija (<120 znakova)
  review_long: 10, // Dodatni bodovi za dugu recenziju (>120 znakova)
  review_with_photo: 10, // Dodatni bodovi za sliku
  visit_qr: 30, // Skeniranje QR koda u restoranu
  reservation_bonus: 5, // Bonus za potvrđenu rezervaciju
  email_verification: 20, // Bodovi za verifikaciju emaila
  phone_verification: 20, // Bodovi za verifikaciju telefona
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
      actionType: 'review_add',
      points: POINTS_CONFIG.review_add,
      referenceId: reviewId,
      restaurantId,
      description: 'Dodana nova recenzija',
    });

    // Ako je recenzija duža od 120 znakova, dodaj bonus
    if (text && text.length > 120) {
      await UserPointsHistory.logPoints({
        userId,
        actionType: 'review_long',
        points: POINTS_CONFIG.review_long,
        referenceId: reviewId,
        restaurantId,
        description: 'Bonus za detaljnu recenziju',
      });
    }

    // Ako recenzija ima sliku, dodaj dodatne bodove
    if (hasPhoto) {
      await UserPointsHistory.logPoints({
        userId,
        actionType: 'review_with_photo',
        points: POINTS_CONFIG.review_with_photo,
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
        actionType: 'visit_qr',
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
      actionType: 'visit_qr',
      points: POINTS_CONFIG.visit_qr,
      referenceId: restaurantId,
      restaurantId,
      description: 'Potvrđen dolazak u restoran',
    });
  }

  // Dodavanje bonus bodova za rezervaciju
  static async addReservationBonus(userId, reservationId, restaurantId) {
    await UserPointsHistory.logPoints({
      userId,
      actionType: 'reservation_bonus',
      points: POINTS_CONFIG.reservation_bonus,
      referenceId: reservationId,
      restaurantId,
      description: 'Bonus za potvrđenu rezervaciju',
    });
  }

  // Dodavanje bodova za verifikaciju profila
  static async addProfileVerificationPoints(userId, type) {
    // Using 'reservation_bonus' as this is a valid enum value
    const actionType = 'reservation_bonus';
    const description =
      type === 'email'
        ? 'Verifikacija email adrese'
        : 'Verifikacija telefonskog broja';

    await UserPointsHistory.logPoints({
      userId,
      actionType,
      points:
        type === 'email'
          ? POINTS_CONFIG.email_verification
          : POINTS_CONFIG.phone_verification,
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
