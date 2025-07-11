const {
  SpecialOffer,
  MenuItem,
  MenuItemTranslation,
  Restaurant,
  User,
  UserPoints,
} = require('../../models');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');
const { getMediaUrl } = require('../../config/cdn');
const { Op, literal } = require('sequelize');

// Get all special offers for a specific restaurant (admin view)
const getSpecialOffersByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const specialOffers = await SpecialOffer.findAll({
      where: { restaurantId },
      order: [['position', 'ASC']],
      include: [
        {
          model: MenuItem,
          as: 'menuItem',
          include: [
            {
              model: MenuItemTranslation,
              as: 'translations',
            },
          ],
        },
      ],
    });

    const formattedOffers = specialOffers.map((offer) => {
      const offerData = offer.toJSON();
      const menuItem = offerData.menuItem;

      if (!menuItem) {
        return {
          ...offerData,
          menuItem: null,
        };
      }

      return {
        ...offerData,
        menuItem: {
          ...menuItem,
          translations: menuItem.translations,
          price: parseFloat(menuItem.price).toFixed(2),
          imageUrl: menuItem.imageUrl
            ? getMediaUrl(menuItem.imageUrl, 'image')
            : null,
        },
      };
    });

    res.json(formattedOffers);
  } catch (error) {
    console.error('Error fetching special offers:', error);
    res.status(500).json({ error: 'Failed to fetch special offers' });
  }
};

// Get all active special offers for customers (public view) - grouped by restaurant
const getActiveSpecialOffers = async (req, res) => {
  try {
    const { city, restaurantId } = req.query;
    const now = new Date();

    let whereClause = {
      isActive: true,
      [Op.or]: [{ validFrom: null }, { validFrom: { [Op.lte]: now } }],
      [Op.or]: [{ validUntil: null }, { validUntil: { [Op.gte]: now } }],
      [Op.or]: [
        { maxRedemptions: null },
        {
          [Op.and]: [
            { maxRedemptions: { [Op.ne]: null } },
            literal('"currentRedemptions" < "maxRedemptions"'),
          ],
        },
      ],
    };

    if (restaurantId) {
      whereClause.restaurantId = restaurantId;
    }

    const includeClause = [
      {
        model: MenuItem,
        as: 'menuItem',
        include: [
          {
            model: MenuItemTranslation,
            as: 'translations',
          },
        ],
      },
      {
        model: Restaurant,
        as: 'restaurant',
        attributes: ['id', 'name', 'address', 'place', 'thumbnailUrl'],
      },
    ];

    if (city) {
      includeClause[1].where = { place: city };
    }

    const specialOffers = await SpecialOffer.findAll({
      where: whereClause,
      order: [['position', 'ASC']],
      include: includeClause,
    });

    // Group offers by restaurant
    const groupedOffers = {};

    specialOffers.forEach((offer) => {
      const offerData = offer.toJSON();
      const menuItem = offerData.menuItem;
      const restaurant = offerData.restaurant;

      if (!menuItem || !restaurant) {
        return;
      }

      const formattedOffer = {
        id: offerData.id,
        pointsRequired: offerData.pointsRequired,
        maxRedemptions: offerData.maxRedemptions,
        currentRedemptions: offerData.currentRedemptions,
        validFrom: offerData.validFrom,
        validUntil: offerData.validUntil,
        menuItem: {
          id: menuItem.id,
          translations: menuItem.translations,
          price: parseFloat(menuItem.price).toFixed(2),
          imageUrl: menuItem.imageUrl
            ? getMediaUrl(menuItem.imageUrl, 'image')
            : null,
        },
      };

      // Group by restaurant
      if (!groupedOffers[restaurant.id]) {
        groupedOffers[restaurant.id] = {
          restaurant: {
            id: restaurant.id,
            name: restaurant.name,
            address: restaurant.address,
            place: restaurant.place,
            thumbnailUrl: restaurant.thumbnailUrl
              ? getMediaUrl(restaurant.thumbnailUrl, 'image')
              : null,
          },
          offers: [],
        };
      }

      groupedOffers[restaurant.id].offers.push(formattedOffer);
    });

    // Convert to array and sort by restaurant name
    const result = Object.values(groupedOffers).sort((a, b) =>
      a.restaurant.name.localeCompare(b.restaurant.name),
    );

    res.json(result);
  } catch (error) {
    console.error('Error fetching active special offers:', error);
    res.status(500).json({ error: 'Failed to fetch special offers' });
  }
};

// Create a new special offer
const createSpecialOffer = async (req, res) => {
  try {
    const {
      restaurantId,
      menuItemId,
      pointsRequired,
      maxRedemptions,
      validFrom,
      validUntil,
    } = req.body;

    // Validate that menu item belongs to the restaurant
    const menuItem = await MenuItem.findOne({
      where: { id: menuItemId, restaurantId },
    });

    if (!menuItem) {
      return res.status(400).json({
        error: 'Menu item not found or does not belong to this restaurant',
      });
    }

    // Check if this menu item is already a special offer
    const existingOffer = await SpecialOffer.findOne({
      where: { restaurantId, menuItemId, isActive: true },
    });

    if (existingOffer) {
      return res.status(400).json({
        error: 'This menu item is already a special offer',
      });
    }

    // Get last position
    const existingOffers = await SpecialOffer.findAll({
      where: { restaurantId },
      order: [['position', 'DESC']],
    });

    const lastPosition = existingOffers[0]?.position ?? -1;
    const newPosition = lastPosition + 1;

    // Create special offer
    const specialOffer = await SpecialOffer.create({
      restaurantId,
      menuItemId,
      pointsRequired: parseInt(pointsRequired),
      maxRedemptions: maxRedemptions ? parseInt(maxRedemptions) : null,
      validFrom: validFrom || null,
      validUntil: validUntil || null,
      position: newPosition,
    });

    // Fetch created offer with menu item details
    const createdOffer = await SpecialOffer.findByPk(specialOffer.id, {
      include: [
        {
          model: MenuItem,
          as: 'menuItem',
          include: [
            {
              model: MenuItemTranslation,
              as: 'translations',
            },
          ],
        },
      ],
    });

    const result = {
      ...createdOffer.get(),
      menuItem: {
        ...createdOffer.menuItem.get(),
        translations: createdOffer.menuItem.translations,
        price: parseFloat(createdOffer.menuItem.price).toFixed(2),
        imageUrl: createdOffer.menuItem.imageUrl
          ? getMediaUrl(createdOffer.menuItem.imageUrl, 'image')
          : null,
      },
    };

    await logAudit({
      userId: req.user ? req.user.id : null,
      action: ActionTypes.CREATE,
      entity: Entities.SPECIAL_OFFER,
      entityId: result.id,
      restaurantId: restaurantId,
      changes: { new: result },
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating special offer:', error);
    res.status(500).json({ error: 'Failed to create special offer' });
  }
};

// Update an existing special offer
const updateSpecialOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { pointsRequired, maxRedemptions, validFrom, validUntil, isActive } =
      req.body;

    const specialOffer = await SpecialOffer.findByPk(id);
    if (!specialOffer) {
      return res.status(404).json({ error: 'Special offer not found' });
    }

    // Update special offer
    await specialOffer.update({
      pointsRequired:
        pointsRequired !== undefined
          ? parseInt(pointsRequired)
          : specialOffer.pointsRequired,
      maxRedemptions:
        maxRedemptions !== undefined
          ? maxRedemptions
            ? parseInt(maxRedemptions)
            : null
          : specialOffer.maxRedemptions,
      validFrom:
        validFrom !== undefined ? validFrom || null : specialOffer.validFrom,
      validUntil:
        validUntil !== undefined ? validUntil || null : specialOffer.validUntil,
      isActive: isActive !== undefined ? isActive : specialOffer.isActive,
    });

    // Fetch updated offer
    const updatedOffer = await SpecialOffer.findByPk(id, {
      include: [
        {
          model: MenuItem,
          as: 'menuItem',
          include: [
            {
              model: MenuItemTranslation,
              as: 'translations',
            },
          ],
        },
      ],
    });

    const result = {
      ...updatedOffer.get(),
      menuItem: {
        ...updatedOffer.menuItem.get(),
        translations: updatedOffer.menuItem.translations,
        price: parseFloat(updatedOffer.menuItem.price).toFixed(2),
        imageUrl: updatedOffer.menuItem.imageUrl
          ? getMediaUrl(updatedOffer.menuItem.imageUrl, 'image')
          : null,
      },
    };

    res.json(result);
  } catch (error) {
    console.error('Error updating special offer:', error);
    res.status(500).json({ error: 'Failed to update special offer' });
  }
};

// Delete a special offer
const deleteSpecialOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const specialOffer = await SpecialOffer.findByPk(id);

    if (!specialOffer) {
      return res.status(404).json({ error: 'Special offer not found' });
    }

    await logAudit({
      userId: req.user ? req.user.id : null,
      action: ActionTypes.DELETE,
      entity: Entities.SPECIAL_OFFER,
      entityId: specialOffer.id,
      restaurantId: specialOffer.restaurantId,
      changes: { old: specialOffer.get() },
    });

    await specialOffer.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting special offer:', error);
    res.status(500).json({ error: 'Failed to delete special offer' });
  }
};

// Update special offer order
const updateSpecialOfferOrder = async (req, res) => {
  try {
    const { order } = req.body;
    for (let i = 0; i < order.length; i++) {
      await SpecialOffer.update({ position: i }, { where: { id: order[i] } });
    }
    res
      .status(200)
      .json({ message: 'Special offer order updated successfully' });
  } catch (error) {
    console.error('Error updating special offer order:', error);
    res.status(500).json({ error: 'Failed to update special offer order' });
  }
};

// Get points distribution for a restaurant (for admin to decide pricing)
const getPointsDistribution = async (req, res) => {
  try {
    // Fetch all users with their points
    const users = await User.findAll({
      attributes: ['id'],
      include: [
        {
          model: require('../../models').UserPoints,
          as: 'points',
          attributes: ['totalPoints'],
        },
      ],
    });

    // Map points (default to 0 if missing)
    const pointsArray = users.map((u) => (u.points ? u.points.totalPoints : 0));

    const pointsDistribution = {
      totalUsers: users.length,
      averagePoints:
        users.length > 0
          ? Math.round(
              pointsArray.reduce((sum, p) => sum + p, 0) / users.length,
            )
          : 0,
      pointsRanges: {
        0: pointsArray.filter((p) => p === 0).length,
        '1-50': pointsArray.filter((p) => p >= 1 && p <= 50).length,
        '51-100': pointsArray.filter((p) => p >= 51 && p <= 100).length,
        '101-200': pointsArray.filter((p) => p >= 101 && p <= 200).length,
        '201-500': pointsArray.filter((p) => p >= 201 && p <= 500).length,
        '500+': pointsArray.filter((p) => p > 500).length,
      },
      maxPoints: pointsArray.length > 0 ? Math.max(...pointsArray) : 0,
      minPoints: pointsArray.length > 0 ? Math.min(...pointsArray) : 0,
    };

    res.json(pointsDistribution);
  } catch (error) {
    console.error('Error fetching points distribution:', error);
    res.status(500).json({ error: 'Failed to fetch points distribution' });
  }
};

// Redeem a special offer (multiple methods)
const redeemSpecialOffer = async (req, res) => {
  try {
    const { specialOfferId, userId, redemptionMethod = 'qr_scan' } = req.body;

    const specialOffer = await SpecialOffer.findByPk(specialOfferId, {
      include: [
        {
          model: MenuItem,
          as: 'menuItem',
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name'],
        },
      ],
    });

    if (!specialOffer) {
      return res.status(404).json({ error: 'Special offer not found' });
    }

    if (!specialOffer.isActive) {
      return res.status(400).json({ error: 'Special offer is not active' });
    }

    // Check validity dates
    const now = new Date();
    if (specialOffer.validFrom && now < specialOffer.validFrom) {
      return res.status(400).json({ error: 'Special offer is not yet valid' });
    }
    if (specialOffer.validUntil && now > specialOffer.validUntil) {
      return res.status(400).json({ error: 'Special offer has expired' });
    }

    // Check redemption limits
    if (
      specialOffer.maxRedemptions &&
      specialOffer.currentRedemptions >= specialOffer.maxRedemptions
    ) {
      return res
        .status(400)
        .json({ error: 'Special offer redemption limit reached' });
    }

    // Get user and check points
    const userPoints = await UserPoints.findOne({
      where: { userId },
    });

    if (!userPoints) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userPoints.totalPoints < specialOffer.pointsRequired) {
      return res.status(400).json({
        error: 'Insufficient points',
        required: specialOffer.pointsRequired,
        available: userPoints.totalPoints,
      });
    }

    // Basic validation - user can only redeem once per offer
    // Rate limiting can be added later if needed

    // Deduct points and increment redemptions
    await userPoints.update({
      totalPoints: userPoints.totalPoints - specialOffer.pointsRequired,
    });

    await specialOffer.update({
      currentRedemptions: specialOffer.currentRedemptions + 1,
    });

    // Log the redemption with method
    await logAudit({
      userId: userId,
      action: ActionTypes.REDEEM,
      entity: Entities.SPECIAL_OFFER,
      entityId: specialOffer.id,
      restaurantId: specialOffer.restaurantId,
      changes: {
        pointsDeducted: specialOffer.pointsRequired,
        newUserPoints: userPoints.totalPoints - specialOffer.pointsRequired,
        redemptionMethod: redemptionMethod,
        redeemedAt: now,
      },
    });

    // Rate limiting removed for simplicity
    // Can be added later if needed

    res.json({
      success: true,
      message: 'Special offer redeemed successfully',
      pointsDeducted: specialOffer.pointsRequired,
      remainingPoints: userPoints.totalPoints - specialOffer.pointsRequired,
      redemptionMethod: redemptionMethod,
      redeemedAt: now,
      menuItem: {
        id: specialOffer.menuItem.id,
        name: specialOffer.menuItem.name,
        price: parseFloat(specialOffer.menuItem.price).toFixed(2),
      },
      restaurant: {
        id: specialOffer.restaurant.id,
        name: specialOffer.restaurant.name,
      },
    });
  } catch (error) {
    console.error('Error redeeming special offer:', error);
    res.status(500).json({ error: 'Failed to redeem special offer' });
  }
};

// Get redemption details for special offer (for customer preview)
const getRedemptionDetails = async (req, res) => {
  try {
    const { specialOfferId } = req.params;
    const userId = req.user.id;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const specialOffer = await SpecialOffer.findByPk(specialOfferId, {
      include: [
        {
          model: MenuItem,
          as: 'menuItem',
          include: [
            {
              model: MenuItemTranslation,
              as: 'translations',
            },
          ],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address', 'place'],
        },
      ],
    });

    if (!specialOffer) {
      return res.status(404).json({ error: 'Special offer not found' });
    }

    if (!specialOffer.isActive) {
      return res.status(400).json({ error: 'Special offer is not active' });
    }

    // Check validity dates
    const now = new Date();
    if (specialOffer.validFrom && now < specialOffer.validFrom) {
      return res.status(400).json({ error: 'Special offer is not yet valid' });
    }
    if (specialOffer.validUntil && now > specialOffer.validUntil) {
      return res.status(400).json({ error: 'Special offer has expired' });
    }

    // Check redemption limits
    if (
      specialOffer.maxRedemptions &&
      specialOffer.currentRedemptions >= specialOffer.maxRedemptions
    ) {
      return res
        .status(400)
        .json({ error: 'Special offer redemption limit reached' });
    }

    const userPoints = await UserPoints.findOne({
      where: { userId },
    });

    if (!userPoints) {
      return res.status(404).json({ error: 'User not found' });
    }

    const canRedeem = userPoints.totalPoints >= specialOffer.pointsRequired;
    const pointsAfterRedemption =
      userPoints.totalPoints - specialOffer.pointsRequired;

    const result = {
      specialOffer: {
        id: specialOffer.id,
        pointsRequired: specialOffer.pointsRequired,
        maxRedemptions: specialOffer.maxRedemptions,
        currentRedemptions: specialOffer.currentRedemptions,
        validFrom: specialOffer.validFrom,
        validUntil: specialOffer.validUntil,
        menuItem: {
          id: specialOffer.menuItem.id,
          translations: specialOffer.menuItem.translations,
          price: parseFloat(specialOffer.menuItem.price).toFixed(2),
          imageUrl: specialOffer.menuItem.imageUrl
            ? getMediaUrl(specialOffer.menuItem.imageUrl, 'image')
            : null,
        },
        restaurant: {
          id: specialOffer.restaurant.id,
          name: specialOffer.restaurant.name,
          address: specialOffer.restaurant.address,
          place: specialOffer.restaurant.place,
        },
      },
      userPoints: {
        current: userPoints.totalPoints,
        afterRedemption: pointsAfterRedemption,
        canRedeem: canRedeem,
      },
      redemptionSummary: {
        pointsToDeduct: specialOffer.pointsRequired,
        pointsRemaining: pointsAfterRedemption,
        savings: parseFloat(specialOffer.menuItem.price).toFixed(2),
      },
    };

    res.json(result);
  } catch (error) {
    console.error('Error fetching redemption details:', error);
    res.status(500).json({ error: 'Failed to fetch redemption details' });
  }
};

// Generate QR code for special offer
const generateSpecialOfferQR = async (req, res) => {
  try {
    const { specialOfferId } = req.params;
    const { userId } = req.query;

    const specialOffer = await SpecialOffer.findByPk(specialOfferId, {
      include: [
        {
          model: MenuItem,
          as: 'menuItem',
          include: [
            {
              model: MenuItemTranslation,
              as: 'translations',
            },
          ],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name'],
        },
      ],
    });

    if (!specialOffer) {
      return res.status(404).json({ error: 'Special offer not found' });
    }

    if (!specialOffer.isActive) {
      return res.status(400).json({ error: 'Special offer is not active' });
    }

    // Check validity dates
    const now = new Date();
    if (specialOffer.validFrom && now < specialOffer.validFrom) {
      return res.status(400).json({ error: 'Special offer is not yet valid' });
    }
    if (specialOffer.validUntil && now > specialOffer.validUntil) {
      return res.status(400).json({ error: 'Special offer has expired' });
    }

    // Check redemption limits
    if (
      specialOffer.maxRedemptions &&
      specialOffer.currentRedemptions >= specialOffer.maxRedemptions
    ) {
      return res
        .status(400)
        .json({ error: 'Special offer redemption limit reached' });
    }

    // If userId provided, check if user has enough points
    if (userId) {
      const userPoints = await UserPoints.findOne({
        where: { userId },
      });
      if (!userPoints) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (userPoints.totalPoints < specialOffer.pointsRequired) {
        return res.status(400).json({
          error: 'Insufficient points',
          required: specialOffer.pointsRequired,
          available: userPoints.totalPoints,
        });
      }
    }

    // Generate QR code data
    const qrData = {
      type: 'special_offer_redemption',
      specialOfferId: specialOffer.id,
      restaurantId: specialOffer.restaurantId,
      pointsRequired: specialOffer.pointsRequired,
      timestamp: now.getTime(),
      // Add a simple hash for basic security
      hash: require('crypto')
        .createHash('md5')
        .update(
          `${specialOffer.id}-${specialOffer.restaurantId}-${now.getTime()}`,
        )
        .digest('hex')
        .substring(0, 8),
    };

    res.json({
      qrData: JSON.stringify(qrData),
      specialOffer: {
        id: specialOffer.id,
        pointsRequired: specialOffer.pointsRequired,
        menuItem: {
          id: specialOffer.menuItem.id,
          translations: specialOffer.menuItem.translations,
          price: parseFloat(specialOffer.menuItem.price).toFixed(2),
        },
        restaurant: {
          id: specialOffer.restaurant.id,
          name: specialOffer.restaurant.name,
        },
      },
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
};

module.exports = {
  getSpecialOffersByRestaurant,
  getActiveSpecialOffers,
  createSpecialOffer,
  updateSpecialOffer,
  deleteSpecialOffer,
  updateSpecialOfferOrder,
  getPointsDistribution,
  redeemSpecialOffer,
  generateSpecialOfferQR,
  getRedemptionDetails,
};
