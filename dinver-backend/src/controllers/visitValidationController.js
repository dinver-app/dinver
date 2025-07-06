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

// Generate QR code token for a restaurant visit
const generateVisitToken = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const adminId = req.user.id;

    // Check if restaurant exists
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'restaurant_not_found' });
    }

    // Create validation token with JWT - 10 minuta
    const tokenPayload = {
      restaurantId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3 * 60 * 1000), // 3 minute
    };

    const validationToken = jwt.sign(tokenPayload, process.env.JWT_SECRET);

    // Create visit validation record (admin record - bez userId)
    await VisitValidation.create({
      restaurantId,
      generatedBy: adminId, // Tko je generirao token
      validationToken,
      expiresAt: tokenPayload.expiresAt,
    });

    res.json({
      token: validationToken,
      expiresAt: tokenPayload.expiresAt,
    });
  } catch (error) {
    console.error('Error generating visit token:', error);
    res.status(500).json({ error: 'Failed to generate visit token' });
  }
};

// Validate a visit token
const validateVisit = async (req, res) => {
  try {
    const { token, reservationId } = req.body;
    const userId = req.user.id;

    // Verify and decode token
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(400).json({ error: 'invalid_token' });
    }

    // Find validation record - samo provjeri da nije istekli
    const validation = await VisitValidation.findOne({
      where: {
        validationToken: token,
        expiresAt: {
          [Op.gt]: new Date(),
        },
        userId: null, // Mora biti admin record (nije još korišten)
      },
    });

    if (!validation) {
      return res.status(400).json({ error: 'token_expired_or_invalid' });
    }

    // Provjeri zadnji posjet ovom restoranu u zadnjih 30 dana
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const lastVisit = await VisitValidation.findOne({
      where: {
        restaurantId: decodedToken.restaurantId,
        userId,
        usedAt: {
          [Op.gte]: thirtyDaysAgo,
        },
      },
      order: [['usedAt', 'DESC']],
    });

    // If reservationId is provided, verify it exists and belongs to the user and restaurant
    let isReservationValid = false;
    let reservation = null;
    if (reservationId) {
      // Get today's date at midnight for comparison
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Format date in YYYY-MM-DD format using local time
      const todaysDate =
        today.getFullYear() +
        '-' +
        String(today.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(today.getDate()).padStart(2, '0');

      reservation = await Reservation.findOne({
        where: {
          id: reservationId,
          userId,
          restaurantId: decodedToken.restaurantId,
          status: 'confirmed', // Only confirmed reservations can be validated
          date: todaysDate, // Must be today's date
        },
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

      if (!reservation) {
        return res.status(400).json({ error: 'invalid_reservation' });
      }

      isReservationValid = true;

      // Update reservation status to completed
      await reservation.update({
        status: 'completed',
        updatedAt: new Date(), // Force update timestamp for thread expiry calculation
      });

      // Send thank you email with review invitation
      await sendReservationEmail({
        to: reservation.user.email,
        type: 'visit_completed',
        reservation: {
          ...reservation.toJSON(),
          restaurant: reservation.restaurant,
        },
      });
    } else {
      // Ako nema rezervacije, provjeri zadnji posjet u zadnjih 30 dana
      if (lastVisit) {
        const nextValidDate = new Date(lastVisit.usedAt);
        nextValidDate.setDate(nextValidDate.getDate() + 30);
        return res.status(400).json({
          error: 'visit_too_soon',
          nextValidDate: nextValidDate,
        });
      }
    }

    // Kreiraj NOVI VisitValidation record za ovog gosta
    const reviewExpiration = new Date();
    reviewExpiration.setDate(reviewExpiration.getDate() + 14); // 14 days to leave a review

    await VisitValidation.create({
      restaurantId: decodedToken.restaurantId,
      userId,
      validationToken: token, // Isti token
      expiresAt: validation.expiresAt, // Isti expiresAt
      usedAt: new Date(),
      canLeaveReviewUntil: reviewExpiration,
      reservationId: isReservationValid ? reservationId : null,
      generatedBy: validation.generatedBy, // Zadrži tko je generirao
    });

    // Award points through PointsService
    const pointsService = new PointsService(sequelize);
    await pointsService.addVisitPoints(
      userId,
      validation.restaurantId,
      isReservationValid,
    );

    res.json({
      message: 'visit_validated',
      canLeaveReviewUntil: reviewExpiration,
      wasReservation: isReservationValid,
    });
  } catch (error) {
    console.error('Error validating visit:', error);
    res.status(500).json({ error: 'Failed to validate visit' });
  }
};

// Close QR code (admin only)
const closeQRCode = async (req, res) => {
  try {
    const { token } = req.params; // Sada je token u URL-u, ne u body-ju
    const adminId = req.user.id;

    // Find and invalidate the token by setting expiresAt to past
    const validation = await VisitValidation.findOne({
      where: {
        validationToken: token,
        generatedBy: adminId, // Samo admin koji je generirao može zatvoriti
        expiresAt: {
          [Op.gt]: new Date(),
        },
        userId: null, // Mora biti admin record
      },
    });

    if (!validation) {
      return res.status(404).json({ error: 'token_not_found_or_expired' });
    }

    // Set expiresAt to past to invalidate token
    await validation.update({
      expiresAt: new Date(Date.now() - 1000), // 1 sekunda u prošlosti
    });

    res.json({
      message: 'qr_code_closed',
    });
  } catch (error) {
    console.error('Error closing QR code:', error);
    res.status(500).json({ error: 'Failed to close QR code' });
  }
};

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
  generateVisitToken,
  validateVisit,
  closeQRCode,
  getValidationStatus,
};
