const {
  SpecialOffer,
  MenuItem,
  MenuItemTranslation,
  Restaurant,
  User,
} = require('../../models');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');
const { getMediaUrl } = require('../../config/cdn');

// Helper function to get user language
const getUserLanguage = (req) => {
  return req.user?.language || 'hr';
};

// Get all special offers for a specific restaurant (admin view)
const getSpecialOffersByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const language = getUserLanguage(req);

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

      const userTranslation = menuItem.translations.find(
        (t) => t.language === language,
      );
      const anyTranslation = menuItem.translations[0];

      return {
        ...offerData,
        menuItem: {
          ...menuItem,
          name: (userTranslation || anyTranslation)?.name || '',
          description: (userTranslation || anyTranslation)?.description || '',
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
    const language = getUserLanguage(req);
    const now = new Date();

    let whereClause = {
      isActive: true,
    };

    // Add date validation
    whereClause = {
      ...whereClause,
      [require('sequelize').Op.or]: [
        { validFrom: null },
        { validFrom: { [require('sequelize').Op.lte]: now } },
      ],
      [require('sequelize').Op.or]: [
        { validUntil: null },
        { validUntil: { [require('sequelize').Op.gte]: now } },
      ],
    };

    // Add redemption limit validation
    whereClause = {
      ...whereClause,
      [require('sequelize').Op.or]: [
        { maxRedemptions: null },
        {
          [require('sequelize').Op.and]: [
            { maxRedemptions: { [require('sequelize').Op.ne]: null } },
            {
              [require('sequelize').Op.literal]:
                'currentRedemptions < maxRedemptions',
            },
          ],
        },
      ],
    };

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

    if (restaurantId) {
      whereClause.restaurantId = restaurantId;
    }

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

      const userTranslation = menuItem.translations.find(
        (t) => t.language === language,
      );
      const anyTranslation = menuItem.translations[0];

      const formattedOffer = {
        id: offerData.id,
        pointsRequired: offerData.pointsRequired,
        maxRedemptions: offerData.maxRedemptions,
        currentRedemptions: offerData.currentRedemptions,
        validFrom: offerData.validFrom,
        validUntil: offerData.validUntil,
        menuItem: {
          id: menuItem.id,
          name: (userTranslation || anyTranslation)?.name || '',
          description: (userTranslation || anyTranslation)?.description || '',
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

    const language = getUserLanguage(req);
    const userTranslation = createdOffer.menuItem.translations.find(
      (t) => t.language === language,
    );
    const anyTranslation = createdOffer.menuItem.translations[0];

    const result = {
      ...createdOffer.get(),
      menuItem: {
        ...createdOffer.menuItem.get(),
        name: (userTranslation || anyTranslation)?.name || '',
        description: (userTranslation || anyTranslation)?.description || '',
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

    const language = getUserLanguage(req);
    const userTranslation = updatedOffer.menuItem.translations.find(
      (t) => t.language === language,
    );
    const anyTranslation = updatedOffer.menuItem.translations[0];

    const result = {
      ...updatedOffer.get(),
      menuItem: {
        ...updatedOffer.menuItem.get(),
        name: (userTranslation || anyTranslation)?.name || '',
        description: (userTranslation || anyTranslation)?.description || '',
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
    const { restaurantId } = req.params;

    // Get all users who have visited this restaurant
    const users = await User.findAll({
      attributes: ['id', 'points'],
      include: [
        {
          model: Restaurant,
          as: 'favoriteRestaurants',
          where: { id: restaurantId },
          attributes: [],
        },
      ],
    });

    const pointsDistribution = {
      totalUsers: users.length,
      averagePoints:
        users.length > 0
          ? Math.round(
              users.reduce((sum, user) => sum + user.points, 0) / users.length,
            )
          : 0,
      pointsRanges: {
        '0-50': users.filter((u) => u.points >= 0 && u.points <= 50).length,
        '51-100': users.filter((u) => u.points >= 51 && u.points <= 100).length,
        '101-200': users.filter((u) => u.points >= 101 && u.points <= 200)
          .length,
        '201-500': users.filter((u) => u.points >= 201 && u.points <= 500)
          .length,
        '500+': users.filter((u) => u.points > 500).length,
      },
      maxPoints: users.length > 0 ? Math.max(...users.map((u) => u.points)) : 0,
      minPoints: users.length > 0 ? Math.min(...users.map((u) => u.points)) : 0,
    };

    res.json(pointsDistribution);
  } catch (error) {
    console.error('Error fetching points distribution:', error);
    res.status(500).json({ error: 'Failed to fetch points distribution' });
  }
};

// Redeem a special offer (QR code scanning)
const redeemSpecialOffer = async (req, res) => {
  try {
    const { specialOfferId, userId } = req.body;

    const specialOffer = await SpecialOffer.findByPk(specialOfferId, {
      include: [
        {
          model: MenuItem,
          as: 'menuItem',
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
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.points < specialOffer.pointsRequired) {
      return res.status(400).json({
        error: 'Insufficient points',
        required: specialOffer.pointsRequired,
        available: user.points,
      });
    }

    // Deduct points and increment redemptions
    await user.update({
      points: user.points - specialOffer.pointsRequired,
    });

    await specialOffer.update({
      currentRedemptions: specialOffer.currentRedemptions + 1,
    });

    // Log the redemption
    await logAudit({
      userId: userId,
      action: ActionTypes.REDEEM,
      entity: Entities.SPECIAL_OFFER,
      entityId: specialOffer.id,
      restaurantId: specialOffer.restaurantId,
      changes: {
        pointsDeducted: specialOffer.pointsRequired,
        newUserPoints: user.points - specialOffer.pointsRequired,
      },
    });

    res.json({
      success: true,
      message: 'Special offer redeemed successfully',
      pointsDeducted: specialOffer.pointsRequired,
      remainingPoints: user.points - specialOffer.pointsRequired,
      menuItem: {
        id: specialOffer.menuItem.id,
        name: specialOffer.menuItem.name,
        price: parseFloat(specialOffer.menuItem.price).toFixed(2),
      },
    });
  } catch (error) {
    console.error('Error redeeming special offer:', error);
    res.status(500).json({ error: 'Failed to redeem special offer' });
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
};
