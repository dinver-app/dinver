const {
  VisitValidation,
  Restaurant,
  Reservation,
  UserRestaurantVisit,
  UserAchievement,
} = require('../../models');
const jwt = require('jsonwebtoken');
const PointsService = require('../../utils/pointsService');
const {
  updateReliableGuestProgress,
  updateFoodExplorerProgress,
} = require('./achievementController');
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

    // Create validation token with JWT
    const tokenPayload = {
      restaurantId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes expiration
    };

    const validationToken = jwt.sign(tokenPayload, process.env.JWT_SECRET);

    // Create visit validation record
    await VisitValidation.create({
      restaurantId,
      userId: adminId,
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

    // Find validation record
    const validation = await VisitValidation.findOne({
      where: {
        validationToken: token,
        isUsed: false,
        expiresAt: {
          [Op.gt]: new Date(),
        },
      },
    });

    if (!validation) {
      return res.status(400).json({ error: 'token_expired_or_used' });
    }

    // Provjeri zadnji posjet ovom restoranu u zadnjih 30 dana
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const lastVisit = await VisitValidation.findOne({
      where: {
        restaurantId: decodedToken.restaurantId,
        userId,
        isUsed: true,
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
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      reservation = await Reservation.findOne({
        where: {
          id: reservationId,
          userId,
          restaurantId: decodedToken.restaurantId,
          status: 'confirmed', // Only confirmed reservations can be validated
          date: today.toISOString().split('T')[0], // Must be today's date
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

      // Update RELIABLE_GUEST achievement progress
      await updateReliableGuestProgress(userId, reservationId);

      // Send thank you email with review invitation
      await sendReservationEmail({
        to: reservation.user.email,
        type: 'visit_completed',
        reservation: {
          ...reservation.toJSON(),
          restaurant: reservation.restaurant,
        },
      });
    } else if (lastVisit) {
      // Ako nema rezervacije i bio je u zadnjih 30 dana, ne dopusti validaciju
      const nextValidDate = new Date(lastVisit.usedAt);
      nextValidDate.setDate(nextValidDate.getDate() + 30);
      return res.status(400).json({
        error: 'visit_too_soon',
        nextValidDate: nextValidDate,
      });
    }

    // Update validation record
    const reviewExpiration = new Date();
    reviewExpiration.setDate(reviewExpiration.getDate() + 14); // 14 days to leave a review

    await validation.update({
      userId,
      isUsed: true,
      usedAt: new Date(),
      canLeaveReviewUntil: reviewExpiration,
      reservationId: isReservationValid ? reservationId : null,
    });

    // Dohvati restoran za place podatak
    const restaurant = await Restaurant.findByPk(validation.restaurantId);

    // Zabilježi posjet za FOOD_EXPLORER achievement
    const uniqueRestaurants = await UserAchievement.trackProgress(
      userId,
      'FOOD_EXPLORER',
      validation.restaurantId,
    );

    // Ako je restoran u novom gradu, zabilježi za CITY_HOPPER achievement
    if (restaurant?.place) {
      await UserAchievement.trackProgress(
        userId,
        'CITY_HOPPER',
        restaurant.place,
      );
    }

    // Award points through PointsService
    await PointsService.addVisitPoints(
      userId,
      validation.restaurantId,
      isReservationValid,
    );

    res.json({
      message: 'visit_validated',
      canLeaveReviewUntil: reviewExpiration,
      wasReservation: isReservationValid,
      uniqueRestaurants,
    });
  } catch (error) {
    console.error('Error validating visit:', error);
    res.status(500).json({ error: 'Failed to validate visit' });
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
        isUsed: true,
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
  getValidationStatus,
};
