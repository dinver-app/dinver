const { Op } = require('sequelize');

// Definicija bodova za različite akcije
const POINTS_CONFIG = {
  REVIEW_ADD: 10, // Osnovna recenzija
  REVIEW_LONG: 5, // Dodatni bodovi za dugu recenziju
  REVIEW_WITH_PHOTO: 5, // Dodatni bodovi za sliku
  VISIT_QR: 20, // Skeniranje QR koda u restoranu
  RESERVATION_VISIT: 5, // Bonus bodovi za dolazak preko rezervacije
  ACHIEVEMENT_UNLOCKED: 5, // Otključano postignuće
  REFERRAL_REGISTRATION_REFERRER: 10, // Referrer dobije bodove kada se prijatelj registrira preko koda
  REFERRAL_REGISTRATION_REFERRED: 10, // Novi korisnik dobije bodove jer se registrirao preko koda
  REFERRAL_FIRST_VISIT_REFERRER: 10, // Referrer dobije bodove kada prijatelj potvrdi prvu posjetu
  POINTS_SPENT_COUPON: -1, // Zamjenska vrijednost; stvarni iznos potrošenih bodova je dinamičan (negativan)
};

// Definicija tipova akcija (mora odgovarati ENUM vrijednostima u bazi)
const ACTION_TYPES = {
  REVIEW_ADD: 'review_add',
  REVIEW_LONG: 'review_long',
  REVIEW_WITH_PHOTO: 'review_with_photo',
  VISIT_QR: 'visit_qr',
  RESERVATION_VISIT: 'reservation_visit',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  REFERRAL_REGISTRATION_REFERRER: 'referral_registration_referrer',
  REFERRAL_REGISTRATION_REFERRED: 'referral_registration_referred',
  REFERRAL_FIRST_VISIT_REFERRER: 'referral_visit_referrer',
  POINTS_SPENT_COUPON: 'points_spent_coupon',
};

class PointsService {
  constructor(sequelize) {
    this.sequelize = sequelize;
    this.UserPointsHistory = sequelize.models.UserPointsHistory;
    this.UserPoints = sequelize.models.UserPoints;
  }

  // Dodavanje bodova za recenziju
  async addReviewPoints(
    userId,
    reviewId,
    restaurantId,
    hasPhoto,
    isLongReview,
  ) {
    // Dodaj osnovne bodove za recenziju
    await this.UserPointsHistory.logPoints({
      userId,
      actionType: ACTION_TYPES.REVIEW_ADD,
      points: POINTS_CONFIG.REVIEW_ADD,
      referenceId: reviewId,
      restaurantId,
      description: 'Napisana recenzija',
    });

    // Ako recenzija ima sliku, dodaj bonus bodove
    if (hasPhoto) {
      await this.UserPointsHistory.logPoints({
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
      await this.UserPointsHistory.logPoints({
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
  async addVisitPoints(userId, restaurantId, isReservationVisit = false) {
    try {
      // Provjeri zadnji posjet ovom restoranu u zadnjih 30 dana
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Koristi model za findOne
      const lastVisit = await this.UserPointsHistory.findOne({
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
        await this.UserPointsHistory.logPoints({
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
        await this.UserPointsHistory.logPoints({
          userId,
          actionType: ACTION_TYPES.RESERVATION_VISIT,
          points: POINTS_CONFIG.RESERVATION_VISIT,
          referenceId: restaurantId,
          restaurantId,
          description: 'Bonus bodovi za dolazak preko rezervacije',
        });
      }
    } catch (error) {
      console.error('Error in addVisitPoints:', error);
      throw error;
    }
  }

  // Dodavanje bodova za registraciju preko referral koda (obje strane)
  async addReferralRegistrationPoints(referrerId, referredUserId, referralId) {
    try {
      // Referrer dobije bodove
      await this.UserPointsHistory.logPoints({
        userId: referrerId,
        actionType: ACTION_TYPES.REFERRAL_REGISTRATION_REFERRER,
        points: POINTS_CONFIG.REFERRAL_REGISTRATION_REFERRER,
        referenceId: referralId,
        description: 'Referral: bonus bodovi za registraciju prijatelja',
      });

      // Referred user dobije bodove
      await this.UserPointsHistory.logPoints({
        userId: referredUserId,
        actionType: ACTION_TYPES.REFERRAL_REGISTRATION_REFERRED,
        points: POINTS_CONFIG.REFERRAL_REGISTRATION_REFERRED,
        referenceId: referralId,
        description: 'Referral: registracija preko koda (bonus bodovi)',
      });
    } catch (error) {
      console.error('Error in addReferralRegistrationPoints:', error);
      throw error;
    }
  }

  // Dodavanje bodova za prvu posjetu (referrer dobije bodove)
  async addReferralFirstVisitBonus(
    referrerId,
    referredUserId,
    referralId,
    restaurantId,
  ) {
    try {
      await this.UserPointsHistory.logPoints({
        userId: referrerId,
        actionType: ACTION_TYPES.REFERRAL_FIRST_VISIT_REFERRER,
        points: POINTS_CONFIG.REFERRAL_FIRST_VISIT_REFERRER,
        referenceId: referralId,
        restaurantId,
        description:
          'Referral: bonus bodovi za prvu posjetu prijatelja (potvrđena dolaznost)',
      });
    } catch (error) {
      console.error('Error in addReferralFirstVisitBonus:', error);
      throw error;
    }
  }

  // Dodavanje bodova za postignuće
  async addAchievementPoints(userId, achievementId, achievementName) {
    try {
      await this.UserPointsHistory.logPoints({
        userId,
        actionType: ACTION_TYPES.ACHIEVEMENT_UNLOCKED,
        points: POINTS_CONFIG.ACHIEVEMENT_UNLOCKED,
        referenceId: achievementId,
        description: `Otključano novo postignuće: ${achievementName}`,
      });
    } catch (error) {
      console.error('Error adding achievement points:', error);
      // Don't throw the error - we don't want to break achievement unlocking if points fail
    }
  }

  // Oduzimanje bodova za "kupnju" kupona (bilježi transakciju)
  async spendPointsForCoupon(userId, couponId, pointsToSpend, restaurantId) {
    try {
      if (!Number.isInteger(pointsToSpend) || pointsToSpend <= 0) {
        throw new Error('pointsToSpend must be positive integer');
      }

      // Log as negative points in history; UserPoints.logPoints will handle updating total
      await this.UserPointsHistory.logPoints({
        userId,
        actionType: ACTION_TYPES.POINTS_SPENT_COUPON,
        points: -pointsToSpend,
        referenceId: couponId,
        restaurantId: restaurantId || null,
        description: `Potrošeno ${pointsToSpend} bodova za kupon`,
      });
    } catch (error) {
      console.error('Error in spendPointsForCoupon:', error);
      throw error;
    }
  }

  // Dohvati ukupan broj bodova korisnika
  async getUserPoints(userId) {
    const userPoints = await this.UserPoints.findOne({
      where: { userId },
    });
    return userPoints ? userPoints.totalPoints : 0;
  }
}

module.exports = PointsService;
