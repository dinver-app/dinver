const { VisitValidation, Restaurant } = require('../../models');
const jwt = require('jsonwebtoken');
const PointsService = require('../../utils/pointsService');
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
    const { token } = req.body;
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

    // Check if user has already validated a visit for this restaurant today
    const existingValidation = await VisitValidation.findOne({
      where: {
        restaurantId: decodedToken.restaurantId,
        userId,
        isUsed: true,
        usedAt: {
          [Op.gte]: new Date().setHours(0, 0, 0, 0),
        },
      },
    });

    if (existingValidation) {
      return res.status(400).json({ error: 'already_validated_today' });
    }

    // Update validation record
    const reviewExpiration = new Date();
    reviewExpiration.setDate(reviewExpiration.getDate() + 14); // 14 days to leave a review

    await validation.update({
      userId,
      isUsed: true,
      usedAt: new Date(),
      canLeaveReviewUntil: reviewExpiration,
    });

    // Award points through PointsService
    await PointsService.addVisitPoints(userId, validation.restaurantId);

    res.json({
      message: 'visit_validated',
      canLeaveReviewUntil: reviewExpiration,
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
