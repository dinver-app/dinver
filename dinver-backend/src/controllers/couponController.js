const {
  Coupon,
  UserCoupon,
  CouponRedemption,
  MenuItem,
  MenuItemTranslation,
  MenuCategory,
  MenuCategoryTranslation,
  DrinkItem,
  DrinkItemTranslation,
  DrinkCategory,
  DrinkCategoryTranslation,
  Restaurant,
  User,
  UserPoints,
  UserRestaurantVisit,
} = require('../../models');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');
const { getMediaUrl } = require('../../config/cdn');
const { calculateDistance } = require('../../utils/distance');
const { Op, literal } = require('sequelize');
const crypto = require('crypto');

// Get all system-wide coupons (for sysadmin)
const getSystemCoupons = async (req, res) => {
  try {
    const { includeDeleted } = req.query;

    const coupons = await Coupon.findAll({
      where: { source: 'DINVER' },
      include: [
        {
          model: MenuItem,
          as: 'menuItem',
          required: false,
          include: [
            {
              model: MenuItemTranslation,
              as: 'translations',
            },
            {
              model: MenuCategory,
              as: 'category',
              include: [
                {
                  model: MenuCategoryTranslation,
                  as: 'translations',
                },
              ],
            },
          ],
        },
        {
          model: DrinkItem,
          as: 'drinkItem',
          required: false,
          include: [
            {
              model: DrinkItemTranslation,
              as: 'translations',
            },
            {
              model: DrinkCategory,
              as: 'category',
              include: [
                {
                  model: DrinkCategoryTranslation,
                  as: 'translations',
                },
              ],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
      paranoid: includeDeleted === 'true', // Include soft-deleted coupons only if explicitly requested
    });

    const formattedCoupons = coupons.map((coupon) => {
      const couponData = coupon.toJSON();
      const menuItem = couponData.menuItem;

      return {
        ...couponData,
        condition: couponData.conditionKind
          ? {
              kind: couponData.conditionKind,
              valueInt: couponData.conditionValue,
              restaurantScopeId: couponData.conditionRestaurantScopeId,
            }
          : null,
        menuItem: menuItem
          ? {
              ...menuItem,
              translations: menuItem.translations,
              price: parseFloat(menuItem.price).toFixed(2),
              imageUrl: menuItem.imageUrl
                ? getMediaUrl(menuItem.imageUrl, 'image')
                : null,
            }
          : null,
      };
    });

    res.json(formattedCoupons);
  } catch (error) {
    console.error('Error fetching system coupons:', error);
    res.status(500).json({ error: 'Failed to fetch system coupons' });
  }
};

// Get all restaurant-specific coupons (for restaurant admin)
const getRestaurantCoupons = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const coupons = await Coupon.findAll({
      where: {
        source: 'RESTAURANT',
        restaurantId,
      },
      include: [
        {
          model: MenuItem,
          as: 'menuItem',
          required: false,
          include: [
            {
              model: MenuItemTranslation,
              as: 'translations',
            },
            {
              model: MenuCategory,
              as: 'category',
              include: [
                {
                  model: MenuCategoryTranslation,
                  as: 'translations',
                },
              ],
            },
          ],
        },
        {
          model: DrinkItem,
          as: 'drinkItem',
          required: false,
          include: [
            {
              model: DrinkItemTranslation,
              as: 'translations',
            },
            {
              model: DrinkCategory,
              as: 'category',
              include: [
                {
                  model: DrinkCategoryTranslation,
                  as: 'translations',
                },
              ],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
      paranoid: false, // Include soft-deleted coupons for restaurant admin view
    });

    const formattedCoupons = coupons.map((coupon) => {
      const couponData = coupon.toJSON();
      const menuItem = couponData.menuItem;

      return {
        ...couponData,
        condition: couponData.conditionKind
          ? {
              kind: couponData.conditionKind,
              valueInt: couponData.conditionValue,
              restaurantScopeId: couponData.conditionRestaurantScopeId,
            }
          : null,
        menuItem: menuItem
          ? {
              ...menuItem,
              translations: menuItem.translations,
              price: parseFloat(menuItem.price).toFixed(2),
              imageUrl: menuItem.imageUrl
                ? getMediaUrl(menuItem.imageUrl, 'image')
                : null,
            }
          : null,
      };
    });

    res.json(formattedCoupons);
  } catch (error) {
    console.error('Error fetching restaurant coupons:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant coupons' });
  }
};

// Get available coupons for customers (public view)
const getAvailableCoupons = async (req, res) => {
  try {
    const {
      city,
      restaurantId,
      userLat,
      userLng,
      distanceFilter = 'ALL',
    } = req.query;

    const now = new Date();
    const user = req.user;
    const maxDistance =
      distanceFilter === 'ALL' ? Infinity : parseInt(distanceFilter);

    let whereClause = {
      status: 'ACTIVE',
      [Op.or]: [
        // Coupons with date restrictions
        {
          startsAt: { [Op.lte]: now },
          expiresAt: { [Op.gt]: now },
          totalLimit: null,
        },
        // Coupons with only quantity limits (no date restrictions)
        {
          startsAt: null,
          expiresAt: null,
          [Op.or]: [
            { totalLimit: null },
            literal('"claimedCount" < "totalLimit"'),
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
        required: false,
        include: [
          {
            model: MenuItemTranslation,
            as: 'translations',
          },
          {
            model: MenuCategory,
            as: 'category',
            include: [
              {
                model: MenuCategoryTranslation,
                as: 'translations',
              },
            ],
          },
        ],
      },
      {
        model: DrinkItem,
        as: 'drinkItem',
        required: false,
        include: [
          {
            model: DrinkItemTranslation,
            as: 'translations',
          },
          {
            model: DrinkCategory,
            as: 'category',
            include: [
              {
                model: DrinkCategoryTranslation,
                as: 'translations',
              },
            ],
          },
        ],
      },
    ];

    if (!restaurantId) {
      includeClause.push({
        model: Restaurant,
        as: 'restaurant',
        attributes: [
          'id',
          'name',
          'address',
          'place',
          'thumbnailUrl',
          'latitude',
          'longitude',
        ],
      });

      if (city) {
        includeClause[1].where = { place: city };
      }
    }

    const coupons = await Coupon.findAll({
      where: whereClause,
      include: includeClause,
      order: [['createdAt', 'DESC']],
      paranoid: true, // Only active (non-deleted) coupons for customers
    });

    // Filter and format coupons
    const formattedCoupons = await Promise.all(
      coupons.map(async (coupon) => {
        const couponData = coupon.toJSON();
        const menuItem = couponData.menuItem;
        const restaurant = couponData.restaurant;

        // Calculate distance if coordinates provided
        let distance = null;
        if (
          userLat &&
          userLng &&
          restaurant?.latitude &&
          restaurant?.longitude
        ) {
          distance = calculateDistance(
            userLat,
            userLng,
            restaurant.latitude,
            restaurant.longitude,
          );

          if (distance > maxDistance) {
            return null;
          }
        }

        // Check user progress for this coupon if user is authenticated
        let userProgress = null;
        if (req.user && couponData.conditionKind) {
          const condition = {
            kind: couponData.conditionKind,
            valueInt: couponData.conditionValue,
            restaurantScopeId: couponData.conditionRestaurantScopeId,
          };
          const { progress } = await checkCouponConditions(
            req.user.id,
            condition,
            couponData.createdAt,
          );
          userProgress = progress;
        }

        return {
          ...couponData,
          condition: couponData.conditionKind
            ? {
                kind: couponData.conditionKind,
                valueInt: couponData.conditionValue,
                restaurantScopeId: couponData.conditionRestaurantScopeId,
              }
            : null,
          userProgress, // Add user progress to response
          menuItem: menuItem
            ? {
                ...menuItem,
                translations: menuItem.translations,
                price: parseFloat(menuItem.price).toFixed(2),
                imageUrl: menuItem.imageUrl
                  ? getMediaUrl(menuItem.imageUrl, 'image')
                  : null,
              }
            : null,
          restaurant: restaurant
            ? {
                ...restaurant,
                thumbnailUrl: restaurant.thumbnailUrl
                  ? getMediaUrl(restaurant.thumbnailUrl, 'image')
                  : null,
                distance,
              }
            : null,
        };
      }),
    );

    const filteredCoupons = formattedCoupons.filter(Boolean);

    res.json({
      coupons: formattedCoupons,
      distanceFilter,
      hasDistanceFilter: distanceFilter !== 'ALL',
    });
  } catch (error) {
    console.error('Error fetching available coupons:', error);
    res.status(500).json({ error: 'Failed to fetch available coupons' });
  }
};

// Create a new coupon (for both system and restaurant owners)
const createCoupon = async (req, res) => {
  try {
    const {
      source,
      restaurantId,
      type,
      rewardItemId,
      percentOff,
      fixedOff,
      totalLimit,
      startsAt,
      expiresAt,
      status,
      perUserLimit,
      conditionKind,
      conditionValue,
      conditionRestaurantScopeId,
    } = req.body;

    // Validation
    if (!restaurantId) {
      return res
        .status(400)
        .json({ error: 'restaurantId is required for QR scanning' });
    }

    // Determine source based on route or body
    const isSystemRoute =
      req.route?.path?.includes('/sysadmin') ||
      req.originalUrl?.includes('/sysadmin');
    const finalSource = source || (isSystemRoute ? 'DINVER' : 'RESTAURANT');

    // Validation: Restaurant can only use limited conditions
    if (
      finalSource === 'RESTAURANT' &&
      conditionKind &&
      !['POINTS_AT_LEAST', 'VISITS_SAME_RESTAURANT_AT_LEAST'].includes(
        conditionKind,
      )
    ) {
      return res.status(400).json({
        error:
          'Restaurant coupons can only use POINTS_AT_LEAST or VISITS_SAME_RESTAURANT_AT_LEAST conditions',
      });
    }

    // Validation: Either totalLimit OR (startsAt AND expiresAt) must be provided
    if (!totalLimit && (!startsAt || !expiresAt)) {
      return res.status(400).json({
        error: 'Either totalLimit OR (startsAt AND expiresAt) must be provided',
      });
    }

    // If only totalLimit is provided, set startsAt and expiresAt to null
    let finalStartsAt = startsAt;
    let finalExpiresAt = expiresAt;
    if (totalLimit && (!startsAt || !expiresAt)) {
      finalStartsAt = null;
      finalExpiresAt = null;
    }

    // Create coupon
    const coupon = await Coupon.create({
      source: finalSource,
      restaurantId,
      type,
      rewardItemId,
      percentOff,
      fixedOff,
      totalLimit,
      startsAt: finalStartsAt,
      expiresAt: finalExpiresAt,
      status: status || 'DRAFT',
      claimedCount: 0,
      createdBy: req.user.id,
      perUserLimit: perUserLimit || 1,
      conditionKind: conditionKind || null,
      conditionValue: conditionValue || null,
      conditionRestaurantScopeId:
        finalSource === 'RESTAURANT'
          ? restaurantId
          : conditionRestaurantScopeId,
    });

    // Fetch created coupon with all details
    const createdCoupon = await Coupon.findByPk(coupon.id, {
      include: [
        {
          model: MenuItem,
          as: 'menuItem',
          required: false,
          include: [
            {
              model: MenuItemTranslation,
              as: 'translations',
            },
            {
              model: MenuCategory,
              as: 'category',
              include: [
                {
                  model: MenuCategoryTranslation,
                  as: 'translations',
                },
              ],
            },
          ],
        },
        {
          model: DrinkItem,
          as: 'drinkItem',
          required: false,
          include: [
            {
              model: DrinkItemTranslation,
              as: 'translations',
            },
            {
              model: DrinkCategory,
              as: 'category',
              include: [
                {
                  model: DrinkCategoryTranslation,
                  as: 'translations',
                },
              ],
            },
          ],
        },
      ],
    });

    const result = {
      ...createdCoupon.get(),
      // Format conditions as array for backward compatibility
      condition: createdCoupon.conditionKind
        ? {
            kind: createdCoupon.conditionKind,
            valueInt: createdCoupon.conditionValue,
            restaurantScopeId: createdCoupon.conditionRestaurantScopeId,
          }
        : null,
      menuItem: createdCoupon.menuItem
        ? {
            ...createdCoupon.menuItem.get(),
            translations: createdCoupon.menuItem.translations,
            price: parseFloat(createdCoupon.menuItem.price).toFixed(2),
            imageUrl: createdCoupon.menuItem.imageUrl
              ? getMediaUrl(createdCoupon.menuItem.imageUrl, 'image')
              : null,
          }
        : null,
    };

    await logAudit({
      userId: req.user.id,
      action: ActionTypes.CREATE,
      entity: Entities.COUPON,
      entityId: result.id,
      restaurantId: restaurantId || null,
      changes: { new: result },
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(500).json({ error: 'Failed to create coupon' });
  }
};

// Update an existing coupon (for both system and restaurant owners)
const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      source,
      restaurantId,
      type,
      rewardItemId,
      percentOff,
      fixedOff,
      totalLimit,
      startsAt,
      expiresAt,
      status,
      perUserLimit,
      conditionKind,
      conditionValue,
      conditionRestaurantScopeId,
    } = req.body;

    // Validation
    if (!restaurantId) {
      return res
        .status(400)
        .json({ error: 'restaurantId is required for QR scanning' });
    }

    // Determine source based on route or body
    const isSystemRoute =
      req.route?.path?.includes('/sysadmin') ||
      req.originalUrl?.includes('/sysadmin');
    const finalSource = source || (isSystemRoute ? 'DINVER' : 'RESTAURANT');

    // Validation: Restaurant can only use limited conditions
    if (
      finalSource === 'RESTAURANT' &&
      conditionKind &&
      !['POINTS_AT_LEAST', 'VISITS_SAME_RESTAURANT_AT_LEAST'].includes(
        conditionKind,
      )
    ) {
      return res.status(400).json({
        error:
          'Restaurant coupons can only use POINTS_AT_LEAST or VISITS_SAME_RESTAURANT_AT_LEAST conditions',
      });
    }

    // Validation: Either totalLimit OR (startsAt AND expiresAt) must be provided
    if (!totalLimit && (!startsAt || !expiresAt)) {
      return res.status(400).json({
        error: 'Either totalLimit OR (startsAt AND expiresAt) must be provided',
      });
    }

    // If only totalLimit is provided, set startsAt and expiresAt to null
    let finalStartsAt = startsAt;
    let finalExpiresAt = expiresAt;
    if (totalLimit && (!startsAt || !expiresAt)) {
      finalStartsAt = null;
      finalExpiresAt = null;
    }

    const coupon = await Coupon.findByPk(id);
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    // Ensure restaurant can only update their own coupons, or sysadmin can update any
    if (
      finalSource === 'RESTAURANT' &&
      (coupon.source !== 'RESTAURANT' || coupon.restaurantId !== restaurantId)
    ) {
      return res
        .status(403)
        .json({ error: 'Not authorized to update this coupon' });
    }

    // Update coupon
    await coupon.update({
      restaurantId,
      type,
      rewardItemId,
      percentOff,
      fixedOff,
      totalLimit,
      startsAt: finalStartsAt,
      expiresAt: finalExpiresAt,
      status,
      perUserLimit: perUserLimit || 1,
      conditionKind: conditionKind || null,
      conditionValue: conditionValue || null,
      conditionRestaurantScopeId:
        finalSource === 'RESTAURANT'
          ? restaurantId
          : conditionRestaurantScopeId,
    });

    // Fetch updated coupon
    const updatedCoupon = await Coupon.findByPk(id, {
      include: [
        {
          model: MenuItem,
          as: 'menuItem',
          required: false,
          include: [
            {
              model: MenuItemTranslation,
              as: 'translations',
            },
            {
              model: MenuCategory,
              as: 'category',
              include: [
                {
                  model: MenuCategoryTranslation,
                  as: 'translations',
                },
              ],
            },
          ],
        },
        {
          model: DrinkItem,
          as: 'drinkItem',
          required: false,
          include: [
            {
              model: DrinkItemTranslation,
              as: 'translations',
            },
            {
              model: DrinkCategory,
              as: 'category',
              include: [
                {
                  model: DrinkCategoryTranslation,
                  as: 'translations',
                },
              ],
            },
          ],
        },
      ],
    });

    const result = {
      ...updatedCoupon.get(),
      condition: updatedCoupon.conditionKind
        ? {
            kind: updatedCoupon.conditionKind,
            valueInt: updatedCoupon.conditionValue,
            restaurantScopeId: updatedCoupon.conditionRestaurantScopeId,
          }
        : null,
      menuItem: updatedCoupon.menuItem
        ? {
            ...updatedCoupon.menuItem.get(),
            translations: updatedCoupon.menuItem.translations,
            price: parseFloat(updatedCoupon.menuItem.price).toFixed(2),
            imageUrl: updatedCoupon.menuItem.imageUrl
              ? getMediaUrl(updatedCoupon.menuItem.imageUrl, 'image')
              : null,
          }
        : null,
    };

    await logAudit({
      userId: req.user.id,
      action: ActionTypes.UPDATE,
      entity: Entities.COUPON,
      entityId: result.id,
      restaurantId: coupon.restaurantId,
      changes: { new: result },
    });

    res.json(result);
  } catch (error) {
    console.error('Error updating coupon:', error);
    res.status(500).json({ error: 'Failed to update coupon' });
  }
};

// Delete a coupon (for both system and restaurant owners)
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;
    const coupon = await Coupon.findByPk(id, { paranoid: false }); // Include soft-deleted coupons

    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    // Determine source based on route or body
    const isSystemRoute =
      req.route?.path?.includes('/sysadmin') ||
      req.originalUrl?.includes('/sysadmin');
    const finalSource = isSystemRoute ? 'DINVER' : 'RESTAURANT';

    // Ensure restaurant can only delete their own coupons, or sysadmin can delete any
    if (finalSource === 'RESTAURANT' && coupon.source !== 'RESTAURANT') {
      return res
        .status(403)
        .json({ error: 'Not authorized to delete this coupon' });
    }

    if (permanent === 'true') {
      // Permanent delete
      await logAudit({
        userId: req.user.id,
        action: ActionTypes.DELETE,
        entity: Entities.COUPON,
        entityId: coupon.id,
        restaurantId: coupon.restaurantId,
        changes: { old: coupon.get(), permanent: true },
      });

      // Hard delete the coupon
      await coupon.destroy({ force: true });
      res.status(204).send();
    } else {
      // Soft delete
      await logAudit({
        userId: req.user.id,
        action: ActionTypes.DELETE,
        entity: Entities.COUPON,
        entityId: coupon.id,
        restaurantId: coupon.restaurantId,
        changes: { old: coupon.get() },
      });

      // Soft delete the coupon
      await coupon.destroy();
      res.status(204).send();
    }
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
};

// Claim a coupon (customer action)
const claimCoupon = async (req, res) => {
  try {
    const { couponId } = req.body;
    const userId = req.user.id;

    const coupon = await Coupon.findByPk(couponId, {
      paranoid: true, // Only allow claiming of non-deleted coupons
      include: [
        {
          model: MenuItem,
          as: 'menuItem',
          required: false,
          include: [
            {
              model: MenuCategory,
              as: 'category',
              include: [
                {
                  model: MenuCategoryTranslation,
                  as: 'translations',
                },
              ],
            },
          ],
        },
        {
          model: DrinkItem,
          as: 'drinkItem',
          required: false,
          include: [
            {
              model: DrinkCategory,
              as: 'category',
              include: [
                {
                  model: DrinkCategoryTranslation,
                  as: 'translations',
                },
              ],
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

    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    if (coupon.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Coupon is not active' });
    }

    const now = new Date();
    // Only check dates if they are set (coupons with only totalLimit won't have dates)
    if (coupon.startsAt && coupon.expiresAt) {
      if (now < coupon.startsAt || now > coupon.expiresAt) {
        return res
          .status(400)
          .json({ error: 'Coupon is not available at this time' });
      }
    }

    // Check total limit
    if (coupon.totalLimit && coupon.claimedCount >= coupon.totalLimit) {
      return res.status(400).json({ error: 'Coupon limit reached' });
    }

    // Check per-user limit
    const existingUserCoupons = await UserCoupon.count({
      where: { userId, couponId },
    });

    if (existingUserCoupons >= coupon.perUserLimit) {
      return res
        .status(400)
        .json({ error: 'You have already claimed this coupon maximum times' });
    }

    // Check conditions
    const condition = coupon.conditionKind
      ? {
          kind: coupon.conditionKind,
          valueInt: coupon.conditionValue,
          restaurantScopeId: coupon.conditionRestaurantScopeId,
        }
      : null;

    if (condition) {
      const canClaim = await checkCouponConditions(
        userId,
        condition,
        coupon.createdAt,
      );
      if (!canClaim.allowed) {
        return res.status(400).json({
          error: 'You do not meet the requirements for this coupon',
          details: canClaim.reasons,
        });
      }
    }

    // Create user coupon
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Valid for 1 year

    const userCoupon = await UserCoupon.create({
      couponId,
      userId,
      claimedAt: now,
      expiresAt,
      status: 'CLAIMED',
    });

    // Increment claimed count
    await coupon.increment('claimedCount');

    // Deduct points for coupons with POINTS_AT_LEAST condition (both DINVER and RESTAURANT)
    if (coupon.conditionKind === 'POINTS_AT_LEAST') {
      const userPoints = await UserPoints.findOne({ where: { userId } });
      if (userPoints) {
        const pointsToDeduct = coupon.conditionValue;
        const oldPoints = userPoints.totalPoints;
        const newPoints = oldPoints - pointsToDeduct;

        await userPoints.update({
          totalPoints: newPoints,
        });

        // Log points deduction
        await logAudit({
          userId: userId,
          action: ActionTypes.UPDATE,
          entity: 'user_points',
          entityId: userPoints.id,
          changes: {
            old: { totalPoints: oldPoints },
            new: { totalPoints: newPoints },
            reason: `Points deducted for claiming coupon ${coupon.id}`,
            couponId: coupon.id,
            pointsDeducted: pointsToDeduct,
          },
        });
      }
    }

    // Generate QR token hash
    const qrTokenHash = crypto.randomBytes(16).toString('hex');
    await userCoupon.update({ qrTokenHash });

    await logAudit({
      userId: userId,
      action: ActionTypes.CLAIM,
      entity: Entities.COUPON,
      entityId: coupon.id,
      restaurantId: coupon.restaurantId,
      changes: {
        userCouponId: userCoupon.id,
        claimedAt: now,
      },
    });

    res.json({
      success: true,
      message: 'Coupon claimed successfully',
      userCoupon: {
        id: userCoupon.id,
        expiresAt: userCoupon.expiresAt,
        qrTokenHash: userCoupon.qrTokenHash,
      },
      coupon: {
        id: coupon.id,
        type: coupon.type,
        menuItem: coupon.menuItem,
        restaurant: coupon.restaurant,
      },
    });
  } catch (error) {
    console.error('Error claiming coupon:', error);
    res.status(500).json({ error: 'Failed to claim coupon' });
  }
};

// Get user's claimed coupons
const getUserCoupons = async (req, res) => {
  try {
    const userId = req.user.id;

    const userCoupons = await UserCoupon.findAll({
      where: { userId },
      include: [
        {
          model: Coupon,
          as: 'coupon',
          paranoid: false, // Include soft-deleted coupons so users can see their claimed coupons
          include: [
            {
              model: MenuItem,
              as: 'menuItem',
              required: false,
              include: [
                {
                  model: MenuItemTranslation,
                  as: 'translations',
                },
                {
                  model: MenuCategory,
                  as: 'category',
                  include: [
                    {
                      model: MenuCategoryTranslation,
                      as: 'translations',
                    },
                  ],
                },
              ],
            },
            {
              model: DrinkItem,
              as: 'drinkItem',
              required: false,
              include: [
                {
                  model: DrinkItemTranslation,
                  as: 'translations',
                },
                {
                  model: DrinkCategory,
                  as: 'category',
                  include: [
                    {
                      model: DrinkCategoryTranslation,
                      as: 'translations',
                    },
                  ],
                },
              ],
            },
            {
              model: Restaurant,
              as: 'restaurant',
              attributes: ['id', 'name', 'address', 'place'],
            },
          ],
        },
      ],
      order: [['claimedAt', 'DESC']],
    });

    const formattedUserCoupons = userCoupons.map((userCoupon) => {
      const userCouponData = userCoupon.toJSON();
      const coupon = userCouponData.coupon;
      const menuItem = coupon.menuItem;

      return {
        ...userCouponData,
        coupon: {
          ...coupon,
          menuItem: menuItem
            ? {
                ...menuItem,
                translations: menuItem.translations,
                price: parseFloat(menuItem.price).toFixed(2),
                imageUrl: menuItem.imageUrl
                  ? getMediaUrl(menuItem.imageUrl, 'image')
                  : null,
              }
            : null,
        },
      };
    });

    res.json(formattedUserCoupons);
  } catch (error) {
    console.error('Error fetching user coupons:', error);
    res.status(500).json({ error: 'Failed to fetch user coupons' });
  }
};

// Generate QR code for user coupon
const generateCouponQR = async (req, res) => {
  try {
    const { userCouponId } = req.params;
    const userId = req.user.id;

    const userCoupon = await UserCoupon.findOne({
      where: { id: userCouponId, userId },
      include: [
        {
          model: Coupon,
          as: 'coupon',
          paranoid: false, // Include soft-deleted coupons so users can still use their claimed coupons
          include: [
            {
              model: MenuItem,
              as: 'menuItem',
              required: false,
              include: [
                {
                  model: MenuCategory,
                  as: 'category',
                  include: [
                    {
                      model: MenuCategoryTranslation,
                      as: 'translations',
                    },
                  ],
                },
              ],
            },
            {
              model: DrinkItem,
              as: 'drinkItem',
              required: false,
              include: [
                {
                  model: DrinkCategory,
                  as: 'category',
                  include: [
                    {
                      model: DrinkCategoryTranslation,
                      as: 'translations',
                    },
                  ],
                },
              ],
            },
            {
              model: Restaurant,
              as: 'restaurant',
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
    });

    if (!userCoupon) {
      return res.status(404).json({ error: 'User coupon not found' });
    }

    if (userCoupon.status !== 'CLAIMED') {
      return res.status(400).json({ error: 'Coupon cannot be used' });
    }

    const now = new Date();
    if (now > userCoupon.expiresAt) {
      return res.status(400).json({ error: 'Coupon has expired' });
    }

    // Generate new QR token hash
    const qrTokenHash = crypto.randomBytes(16).toString('hex');
    await userCoupon.update({ qrTokenHash });

    res.json({
      qrTokenHash,
      userCoupon: {
        id: userCoupon.id,
        expiresAt: userCoupon.expiresAt,
      },
      coupon: {
        id: userCoupon.coupon.id,
        type: userCoupon.coupon.type,
        menuItem: userCoupon.coupon.menuItem,
        restaurant: userCoupon.coupon.restaurant,
      },
    });
  } catch (error) {
    console.error('Error generating coupon QR:', error);
    res.status(500).json({ error: 'Failed to generate coupon QR' });
  }
};

// Redeem user coupon (restaurant staff action)
const redeemUserCoupon = async (req, res) => {
  try {
    const { userCouponId, qrTokenHash } = req.body;
    const staffUserId = req.user.id;
    const { restaurantId } = req.params;

    const userCoupon = await UserCoupon.findOne({
      where: {
        id: userCouponId,
        qrTokenHash,
        status: 'CLAIMED',
      },
      include: [
        {
          model: Coupon,
          as: 'coupon',
          paranoid: false, // Include soft-deleted coupons so staff can still redeem them
          include: [
            {
              model: MenuItem,
              as: 'menuItem',
              required: false,
              include: [
                {
                  model: MenuCategory,
                  as: 'category',
                  include: [
                    {
                      model: MenuCategoryTranslation,
                      as: 'translations',
                    },
                  ],
                },
              ],
            },
            {
              model: DrinkItem,
              as: 'drinkItem',
              required: false,
              include: [
                {
                  model: DrinkCategory,
                  as: 'category',
                  include: [
                    {
                      model: DrinkCategoryTranslation,
                      as: 'translations',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!userCoupon) {
      return res.status(404).json({ error: 'Invalid coupon or QR code' });
    }

    const now = new Date();
    if (now > userCoupon.expiresAt) {
      return res.status(400).json({ error: 'Coupon has expired' });
    }

    // Update user coupon status
    await userCoupon.update({ status: 'REDEEMED' });

    // Create redemption record
    const redemption = await CouponRedemption.create({
      userCouponId,
      restaurantId,
      redeemedAt: now,
      redeemedBy: staffUserId,
      meta: {
        couponType: userCoupon.coupon.type,
      },
    });

    await logAudit({
      userId: userCoupon.userId,
      action: ActionTypes.REDEEM,
      entity: Entities.COUPON,
      entityId: userCoupon.coupon.id,
      restaurantId: restaurantId,
      changes: {
        userCouponId: userCoupon.id,
        redemptionId: redemption.id,
        redeemedAt: now,
        redeemedBy: staffUserId,
      },
    });

    res.json({
      success: true,
      message: 'Coupon redeemed successfully',
      redemption: {
        id: redemption.id,
        redeemedAt: redemption.redeemedAt,
      },
      coupon: {
        id: userCoupon.coupon.id,
        type: userCoupon.coupon.type,
      },
    });
  } catch (error) {
    console.error('Error redeeming user coupon:', error);
    res.status(500).json({ error: 'Failed to redeem coupon' });
  }
};

// Helper function to check coupon conditions and return progress
const checkCouponConditions = async (
  userId,
  condition,
  couponCreatedAt = null,
) => {
  const reasons = [];
  let allowed = true;
  let progress = null;

  if (!condition) {
    return { allowed: true, reasons: [], progress: null };
  }

  switch (condition.kind) {
    case 'POINTS_AT_LEAST':
      const userPoints = await UserPoints.findOne({ where: { userId } });
      const currentPoints = userPoints ? userPoints.totalPoints : 0;
      if (currentPoints < condition.valueInt) {
        allowed = false;
        reasons.push(`Need at least ${condition.valueInt} points`);
        progress = {
          current: currentPoints,
          required: condition.valueInt,
          type: 'points',
          message: `Imate ${currentPoints} od ${condition.valueInt} potrebnih bodova. Potrebno vam je još ${condition.valueInt - currentPoints} bodova.`,
        };
      }
      break;

    case 'REFERRALS_AT_LEAST':
      // Use new referral system - count completed referrals
      const { Referral } = require('../../models');
      let referralQuery = {
        where: {
          referrerId: userId,
          status: 'COMPLETED', // Only count completed referrals
        },
      };

      // If coupon has creation date, only count referrals after that date
      if (couponCreatedAt) {
        referralQuery.where.completedAt = { [Op.gte]: couponCreatedAt };
      }

      const referralCount = await Referral.count(referralQuery);
      if (referralCount < condition.valueInt) {
        allowed = false;
        reasons.push(
          `Need at least ${condition.valueInt} completed referrals (you have ${referralCount})`,
        );
        progress = {
          current: referralCount,
          required: condition.valueInt,
          type: 'referrals',
          message: `Imate ${referralCount} od ${condition.valueInt} potrebnih završenih preporuka. Potrebno vam je još ${condition.valueInt - referralCount} preporuka.`,
        };
      }
      break;

    case 'VISITS_SAME_RESTAURANT_AT_LEAST':
      if (!condition.restaurantScopeId) {
        allowed = false;
        reasons.push('Restaurant scope is required for this condition');
        break;
      }
      let sameRestaurantQuery = {
        where: {
          userId,
          restaurantId: condition.restaurantScopeId,
          validated: true,
        },
      };

      // If coupon has creation date, only count visits after that date
      if (couponCreatedAt) {
        sameRestaurantQuery.where.createdAt = { [Op.gte]: couponCreatedAt };
      }

      const sameRestaurantVisits =
        await UserRestaurantVisit.count(sameRestaurantQuery);
      if (sameRestaurantVisits < condition.valueInt) {
        allowed = false;
        reasons.push(
          `Need at least ${condition.valueInt} visits to this restaurant (you have ${sameRestaurantVisits})`,
        );
        progress = {
          current: sameRestaurantVisits,
          required: condition.valueInt,
          type: 'same_restaurant_visits',
          message: `Posjetili ste ${sameRestaurantVisits} od ${condition.valueInt} puta ovaj restoran. Posjetite još ${condition.valueInt - sameRestaurantVisits} puta.`,
        };
      }
      break;

    case 'VISITS_DIFFERENT_RESTAURANTS_AT_LEAST':
      let differentRestaurantQuery = {
        where: {
          userId,
          validated: true,
        },
        distinct: true,
        col: 'restaurantId',
      };

      // If coupon has creation date, only count visits after that date
      if (couponCreatedAt) {
        differentRestaurantQuery.where.createdAt = {
          [Op.gte]: couponCreatedAt,
        };
      }

      const differentRestaurantVisits = await UserRestaurantVisit.count(
        differentRestaurantQuery,
      );
      if (differentRestaurantVisits < condition.valueInt) {
        allowed = false;
        reasons.push(
          `Need at least ${condition.valueInt} visits to different restaurants (you have ${differentRestaurantVisits})`,
        );
        progress = {
          current: differentRestaurantVisits,
          required: condition.valueInt,
          type: 'different_restaurant_visits',
          message: `Posjetili ste ${differentRestaurantVisits} od ${condition.valueInt} različitih restorana. Posjetite još ${condition.valueInt - differentRestaurantVisits} različitih restorana.`,
        };
      }
      break;

    case 'VISITS_CITIES_AT_LEAST':
      let cityVisitsQuery = {
        where: {
          userId,
          validated: true,
        },
        include: [
          {
            model: Restaurant,
            as: 'restaurant',
            attributes: ['city'],
          },
        ],
      };

      // If coupon has creation date, only count visits after that date
      if (couponCreatedAt) {
        cityVisitsQuery.where.createdAt = { [Op.gte]: couponCreatedAt };
      }

      const cityVisits = await UserRestaurantVisit.findAll(cityVisitsQuery);
      const uniqueCities = new Set(
        cityVisits.map((visit) => visit.restaurant.city).filter(Boolean),
      );
      if (uniqueCities.size < condition.valueInt) {
        allowed = false;
        reasons.push(
          `Need at least ${condition.valueInt} visits to different cities (you have visited ${uniqueCities.size} cities)`,
        );
        progress = {
          current: uniqueCities.size,
          required: condition.valueInt,
          type: 'city_visits',
          message: `Posjetili ste ${uniqueCities.size} od ${condition.valueInt} različitih gradova. Posjetite još ${condition.valueInt - uniqueCities.size} grad.`,
        };
      }
      break;

    default:
      allowed = false;
      reasons.push('Unknown condition type');
  }

  return { allowed, reasons, progress };
};

// Get coupon statistics for sysadmin
const getCouponStats = async (req, res) => {
  try {
    const [totalCoupons, activeCoupons, totalClaims, totalRedemptions] =
      await Promise.all([
        Coupon.count({ where: { source: 'DINVER' }, paranoid: false }), // Include soft-deleted
        Coupon.count({
          where: { source: 'DINVER', status: 'ACTIVE' },
          paranoid: true,
        }), // Only active (non-deleted)
        Coupon.sum('claimedCount', {
          where: { source: 'DINVER' },
          paranoid: false,
        }), // Include soft-deleted
        CouponRedemption.count({
          include: [
            {
              model: UserCoupon,
              as: 'userCoupon',
              include: [
                {
                  model: Coupon,
                  as: 'coupon',
                  where: { source: 'DINVER' },
                  paranoid: false, // Include soft-deleted
                  include: [
                    {
                      model: MenuItem,
                      as: 'menuItem',
                      required: false,
                      include: [
                        {
                          model: MenuCategory,
                          as: 'category',
                          include: [
                            {
                              model: MenuCategoryTranslation,
                              as: 'translations',
                            },
                          ],
                        },
                      ],
                    },
                    {
                      model: DrinkItem,
                      as: 'drinkItem',
                      required: false,
                      include: [
                        {
                          model: DrinkCategory,
                          as: 'category',
                          include: [
                            {
                              model: DrinkCategoryTranslation,
                              as: 'translations',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ]);

    res.json({
      totalCoupons,
      activeCoupons,
      totalClaims,
      totalRedemptions,
    });
  } catch (error) {
    console.error('Error fetching coupon statistics:', error);
    res.status(500).json({ error: 'Failed to fetch coupon statistics' });
  }
};

module.exports = {
  getSystemCoupons,
  getRestaurantCoupons,
  getAvailableCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  claimCoupon,
  getUserCoupons,
  generateCouponQR,
  redeemUserCoupon,
  getCouponStats,
};
