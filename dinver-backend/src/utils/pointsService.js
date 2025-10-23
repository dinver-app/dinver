// Definicija bodova za različite akcije
const POINTS_CONFIG = {
  REVIEW_ADD: 3, // Osnovna recenzija
  REVIEW_ELITE: 3, // Bonus bodovi za elite recenziju (označena od strane sysadmina)
  REFERRAL_VERIFICATION_REFERRER: 2, // Referrer dobije bodove kada se prijatelj verificira
  REFERRAL_VERIFICATION_REFERRED: 2, // Novi korisnik dobije bodove kada se verificira preko koda
  REFERRAL_FIRST_RECEIPT_REFERRER: 2, // Referrer dobije bodove kada prijatelj odobri prvi račun
  RECEIPT_APPROVED: 1, // 10€ = 1 point, calculated dynamically
};

// Definicija tipova akcija (mora odgovarati ENUM vrijednostima u bazi)
const ACTION_TYPES = {
  REVIEW_ADD: 'review_add',
  REVIEW_ELITE: 'review_elite',
  REFERRAL_VERIFICATION_REFERRER: 'referral_verification_referrer',
  REFERRAL_VERIFICATION_REFERRED: 'referral_verification_referred',
  REFERRAL_FIRST_RECEIPT_REFERRER: 'referral_first_receipt_referrer',
  RECEIPT_APPROVED: 'receipt_approved',
};

class PointsService {
  constructor(sequelize) {
    this.sequelize = sequelize;
    this.UserPointsHistory = sequelize.models.UserPointsHistory;
    this.UserPoints = sequelize.models.UserPoints;
  }

  // Dodavanje bodova za recenziju
  async addReviewPoints(userId, reviewId, restaurantId) {
    await this.UserPointsHistory.logPoints({
      userId,
      actionType: ACTION_TYPES.REVIEW_ADD,
      points: POINTS_CONFIG.REVIEW_ADD,
      referenceId: reviewId,
      restaurantId,
      description: 'Napisana recenzija',
    });
  }

  // Dodavanje bodova za elite recenziju (označena od strane sysadmina)
  async addEliteReviewPoints(userId, reviewId, restaurantId) {
    await this.UserPointsHistory.logPoints({
      userId,
      actionType: ACTION_TYPES.REVIEW_ELITE,
      points: POINTS_CONFIG.REVIEW_ELITE,
      referenceId: reviewId,
      restaurantId,
      description: 'Elite recenzija - označena kao izuzetna',
    });
  }

  // Dodavanje bodova za verifikaciju preko referral koda (obje strane)
  async addReferralVerificationPoints(referrerId, referredUserId, referralId) {
    try {
      // Referrer dobije bodove
      await this.UserPointsHistory.logPoints({
        userId: referrerId,
        actionType: ACTION_TYPES.REFERRAL_VERIFICATION_REFERRER,
        points: POINTS_CONFIG.REFERRAL_VERIFICATION_REFERRER,
        referenceId: referralId,
        description: 'Referral: bonus bodovi za verifikaciju prijatelja',
      });

      // Referred user dobije bodove
      await this.UserPointsHistory.logPoints({
        userId: referredUserId,
        actionType: ACTION_TYPES.REFERRAL_VERIFICATION_REFERRED,
        points: POINTS_CONFIG.REFERRAL_VERIFICATION_REFERRED,
        referenceId: referralId,
        description: 'Referral: verifikacija preko koda (bonus bodovi)',
      });
    } catch (error) {
      console.error('Error in addReferralVerificationPoints:', error);
      throw error;
    }
  }

  // Dodavanje bodova za prvi račun (referrer dobije bodove)
  async addReferralFirstReceiptBonus(
    referrerId,
    referredUserId,
    referralId,
    restaurantId,
  ) {
    try {
      await this.UserPointsHistory.logPoints({
        userId: referrerId,
        actionType: ACTION_TYPES.REFERRAL_FIRST_RECEIPT_REFERRER,
        points: POINTS_CONFIG.REFERRAL_FIRST_RECEIPT_REFERRER,
        referenceId: referralId,
        restaurantId,
        description:
          'Referral: bonus bodovi za prvi račun prijatelja (odobren)',
      });
    } catch (error) {
      console.error('Error in addReferralFirstReceiptBonus:', error);
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
