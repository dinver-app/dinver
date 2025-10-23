const {
  VisitValidation,
  Restaurant,
  Reservation,
  User,
  sequelize,
} = require('../../models');
const jwt = require('jsonwebtoken');
const PointsService = require('../utils/pointsService');
const { sendReservationEmail } = require('../../utils/emailService');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

// User generates own short-lived QR token
const generateUserVisitToken = async (req, res) => {
  try {
    const userId = req.user.id;

    const tokenPayload = {
      userId,
      jti: uuidv4(),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3 * 60 * 1000), // 3 minutes
    };

    const validationToken = jwt.sign(tokenPayload, process.env.JWT_SECRET);

    // Invalidate any previous pending tokens for this user
    await VisitValidation.update(
      { expiresAt: new Date(Date.now() - 1000) },
      {
        where: {
          userId,
          restaurantId: null,
          usedAt: null,
          expiresAt: { [Op.gt]: new Date() },
        },
      },
    );

    await VisitValidation.create({
      userId,
      validationToken,
      expiresAt: tokenPayload.expiresAt,
    });

    res.json({
      token: validationToken,
      expiresAt: tokenPayload.expiresAt,
    });
  } catch (error) {
    console.error('Error generating user visit token:', error);
    res.status(500).json({ error: 'Failed to generate user visit token' });
  }
};

// Admin scans user's QR to validate visit
const adminScanUserToken = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { token } = req.body;
    const adminId = req.user.id;

    // Basic restaurant existence check
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'restaurant_not_found' });
    }

    // Verify token format
    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(400).json({ error: 'invalid_token' });
    }

    // Find pending user token
    const pending = await VisitValidation.findOne({
      where: {
        validationToken: token,
        userId: { [Op.ne]: null },
        restaurantId: null,
        expiresAt: { [Op.gt]: new Date() },
      },
    });

    if (!pending) {
      return res.status(400).json({ error: 'token_expired_or_invalid' });
    }

    const userId = pending.userId;

    // Check last visit within 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const lastVisit = await VisitValidation.findOne({
      where: {
        restaurantId,
        userId,
        usedAt: { [Op.gte]: thirtyDaysAgo },
      },
      order: [['usedAt', 'DESC']],
    });

    // Detect reservation for today
    let isReservationValid = false;
    let reservation = null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaysDate =
      today.getFullYear() +
      '-' +
      String(today.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(today.getDate()).padStart(2, '0');

    reservation = await Reservation.findOne({
      where: {
        userId,
        restaurantId,
        status: 'confirmed',
        date: todaysDate,
      },
      order: [['time', 'DESC']],
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address', 'place', 'phone'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
        },
      ],
    });

    if (reservation) {
      isReservationValid = true;
      await reservation.update({
        status: 'completed',
        updatedAt: new Date(),
      });

      await sendReservationEmail({
        to: reservation.user.email,
        type: 'visit_completed',
        reservation: {
          ...reservation.toJSON(),
          restaurant: reservation.restaurant,
        },
      });
    } else {
      if (lastVisit) {
        const nextValidDate = new Date(lastVisit.usedAt);
        nextValidDate.setDate(nextValidDate.getDate() + 30);
        return res.status(400).json({
          error: 'visit_too_soon',
          nextValidDate: nextValidDate,
        });
      }
    }

    // Create visit record
    const reviewExpiration = new Date();
    reviewExpiration.setDate(reviewExpiration.getDate() + 14);

    await VisitValidation.create({
      restaurantId,
      userId,
      validationToken: token,
      expiresAt: pending.expiresAt,
      usedAt: new Date(),
      canLeaveReviewUntil: reviewExpiration,
      reservationId: isReservationValid ? reservation.id : null,
      generatedBy: adminId,
    });

    // Invalidate pending token
    await pending.update({
      expiresAt: new Date(Date.now() - 1000),
    });

    // Note: Visit points removed as per points system overhaul
    // QR visits no longer award points

    // Referral first visit
    try {
      const { handleFirstVisit } = require('./referralController');
      await handleFirstVisit(userId, restaurantId);
    } catch (referralError) {
      console.error('Referral error during visit validation:', referralError);
    }

    res.json({
      message: 'visit_validated',
      canLeaveReviewUntil: reviewExpiration,
      wasReservation: isReservationValid,
    });
  } catch (error) {
    console.error('Error scanning user token:', error);
    res.status(500).json({ error: 'Failed to validate visit' });
  }
};

// Removed: close QR code flow is deprecated in new model

// Get validation status for a restaurant
const getValidationStatus = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const userId = req.user.id;

    const validation = await VisitValidation.findOne({
      where: {
        restaurantId,
        userId,
        canLeaveReviewUntil: {
          [Op.gt]: new Date(),
        },
      },
      order: [['usedAt', 'DESC']],
    });

    res.json({
      canLeaveReview: !!validation,
      validUntil: validation ? validation.canLeaveReviewUntil : null,
      wasReservation: validation ? !!validation.reservationId : false,
    });
  } catch (error) {
    console.error('Error getting validation status:', error);
    res.status(500).json({ error: 'Failed to get validation status' });
  }
};

module.exports = {
  generateUserVisitToken,
  adminScanUserToken,
  getValidationStatus,
};
