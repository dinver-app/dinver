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
  UserPoints,
  VisitValidation,
  Referral,
} = require('../../models');
const { sequelize } = require('../../models');
const PointsService = require('../utils/pointsService');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');
const { calculateDistance } = require('../../utils/distance');
const { Op, literal } = require('sequelize');
const crypto = require('crypto');

// ---- Helpers ----
function computeCouponPrices(couponData) {
  try {
    const type = couponData.type;
    const menuItem = couponData.menuItem;
    const drinkItem = couponData.drinkItem;

    // Only expose prices for REWARD_ITEM coupons (free item)
    if (type !== 'REWARD_ITEM') {
      return { regularPrice: null, newPrice: null };
    }

    // Prefer menu item price if present, fallback to drink item
    const rawPrice =
      (menuItem && menuItem.price != null
        ? parseFloat(menuItem.price)
        : null) ??
      (drinkItem && drinkItem.price != null
        ? parseFloat(drinkItem.price)
        : null);

    if (rawPrice == null || isNaN(rawPrice)) {
      return { regularPrice: null, newPrice: null };
    }

    const regularPrice = Number(rawPrice.toFixed(2));
    return { regularPrice, newPrice: 0 };
  } catch (e) {
    return { regularPrice: null, newPrice: null };
  }
}

function hasExplicitTimezone(dateStr) {
  return /([zZ]|[+-]\d{2}:?\d{2})$/.test(dateStr);
}

// Treat naive datetime strings as Europe/Zagreb (UTC+02:00 during summer, simplified)
function normalizeToUTC(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput !== 'string') return new Date(dateInput);
  if (hasExplicitTimezone(dateInput)) return new Date(dateInput);
  // Assume HR local (UTC+02:00). Append offset to parse as UTC-aware
  return new Date(`${dateInput}+02:00`);
}

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
      const priceInfo = computeCouponPrices(couponData);

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
            }
          : null,
        regularPrice: priceInfo.regularPrice,
        newPrice: priceInfo.newPrice,
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
      const priceInfo = computeCouponPrices(couponData);

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
            }
          : null,
        regularPrice: priceInfo.regularPrice,
        newPrice: priceInfo.newPrice,
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
    const maxDistance =
      distanceFilter === 'ALL' ? Infinity : parseInt(distanceFilter);

    // Active coupons: valid by date window OR no dates; AND not exhausted by quantity (if set)
    let whereClause = {
      status: 'ACTIVE',
      [Op.and]: [
        {
          [Op.or]: [
            { startsAt: { [Op.lte]: now }, expiresAt: { [Op.gt]: now } },
            { startsAt: null, expiresAt: null },
          ],
        },
        {
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
        attributes: ['id', 'name', 'address', 'place', 'latitude', 'longitude'],
        ...(city ? { where: { place: city } } : {}),
      });
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
            Number(userLat),
            Number(userLng),
            Number(restaurant.latitude),
            Number(restaurant.longitude),
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

        const priceInfo = computeCouponPrices(couponData);
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
              }
            : null,
          restaurant: restaurant
            ? {
                ...restaurant,
                distance,
              }
            : null,
          regularPrice: priceInfo.regularPrice,
          newPrice: priceInfo.newPrice,
        };
      }),
    );

    const filteredCoupons = formattedCoupons.filter(Boolean);

    res.json({
      coupons: filteredCoupons,
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

    // Normalize datetimes to UTC if they come without timezone
    const normStartsAt = normalizeToUTC(finalStartsAt);
    const normExpiresAt = normalizeToUTC(finalExpiresAt);

    // Sanitize fields by type
    const typeSafe = type;
    const payloadByType = {
      REWARD_ITEM: {
        rewardItemId,
        percentOff: null,
        fixedOff: null,
      },
      PERCENT_DISCOUNT: {
        rewardItemId: null,
        percentOff,
        fixedOff: null,
      },
      FIXED_DISCOUNT: {
        rewardItemId: null,
        percentOff: null,
        fixedOff,
      },
    }[typeSafe] || { rewardItemId: null, percentOff: null, fixedOff: null };

    // Create coupon
    const coupon = await Coupon.create({
      source: finalSource,
      restaurantId,
      type: typeSafe,
      ...payloadByType,
      totalLimit,
      startsAt: normStartsAt,
      expiresAt: normExpiresAt,
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
          }
        : null,
    };

    const priceInfo = computeCouponPrices(result);
    result.regularPrice = priceInfo.regularPrice;
    result.newPrice = priceInfo.newPrice;

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

    // Normalize datetimes and sanitize by type
    const updStartsAt = normalizeToUTC(finalStartsAt);
    const updExpiresAt = normalizeToUTC(finalExpiresAt);
    const updatePayloadByType = {
      REWARD_ITEM: {
        rewardItemId,
        percentOff: null,
        fixedOff: null,
      },
      PERCENT_DISCOUNT: {
        rewardItemId: null,
        percentOff,
        fixedOff: null,
      },
      FIXED_DISCOUNT: {
        rewardItemId: null,
        percentOff: null,
        fixedOff,
      },
    }[type] || { rewardItemId: null, percentOff: null, fixedOff: null };

    // Update coupon
    await coupon.update({
      restaurantId,
      type,
      ...updatePayloadByType,
      totalLimit,
      startsAt: updStartsAt,
      expiresAt: updExpiresAt,
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
          }
        : null,
    };

    const priceInfo = computeCouponPrices(result);
    result.regularPrice = priceInfo.regularPrice;
    result.newPrice = priceInfo.newPrice;

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
      const pointsService = new PointsService(sequelize);
      const pointsToDeduct = coupon.conditionValue;
      await pointsService.spendPointsForCoupon(
        userId,
        coupon.id,
        pointsToDeduct,
        coupon.restaurantId || null,
      );
      // Keep audit for transparency (optional in addition to history log)
      const userPoints = await UserPoints.findOne({ where: { userId } });
      await logAudit({
        userId: userId,
        action: ActionTypes.UPDATE,
        entity: 'user_points',
        entityId: userPoints?.id || null,
        changes: {
          reason: `Points deducted for claiming coupon ${coupon.id}`,
          couponId: coupon.id,
          pointsDeducted: pointsToDeduct,
        },
      });
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
        ...computeCouponPrices({
          type: coupon.type,
          percentOff: coupon.percentOff,
          fixedOff: coupon.fixedOff,
          menuItem: coupon.menuItem,
          drinkItem: coupon.drinkItem,
        }),
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
    const { status } = req.query;
    const now = new Date();

    // Build where clause based on requested status
    let whereClause = { userId };
    if (status === 'EXPIRED') {
      // Include explicitly expired, or claimed but past expiresAt (in case status wasn't updated)
      whereClause = {
        userId,
        [Op.or]: [
          { status: 'EXPIRED' },
          {
            [Op.and]: [{ status: 'CLAIMED' }, { expiresAt: { [Op.lt]: now } }],
          },
        ],
      };
    } else if (status === 'CLAIMED') {
      // Claimed and still valid
      whereClause = {
        userId,
        status: 'CLAIMED',
        expiresAt: { [Op.gte]: now },
      };
    } else if (status === 'REDEEMED') {
      whereClause = { userId, status: 'REDEEMED' };
    }

    const userCoupons = await UserCoupon.findAll({
      where: whereClause,
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
        ...computeCouponPrices({
          type: userCoupon.coupon.type,
          percentOff: userCoupon.coupon.percentOff,
          fixedOff: userCoupon.coupon.fixedOff,
          menuItem: userCoupon.coupon.menuItem,
          drinkItem: userCoupon.coupon.drinkItem,
        }),
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

    // Validate input: allow redeeming by either qrTokenHash or userCouponId
    if (!qrTokenHash && !userCouponId) {
      return res
        .status(400)
        .json({ error: 'Provide either qrTokenHash or userCouponId' });
    }

    const whereClause = { status: 'CLAIMED' };
    if (qrTokenHash) whereClause.qrTokenHash = qrTokenHash;
    if (userCouponId) whereClause.id = userCouponId;

    const userCoupon = await UserCoupon.findOne({
      where: whereClause,
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

    // Optional safety: ensure coupon belongs to the restaurant making the redemption (if applicable)
    if (
      restaurantId &&
      userCoupon.coupon &&
      userCoupon.coupon.restaurantId &&
      String(userCoupon.coupon.restaurantId) !== String(restaurantId)
    ) {
      return res
        .status(403)
        .json({ error: 'Coupon does not belong to this restaurant' });
    }

    const now = new Date();
    if (now > userCoupon.expiresAt) {
      return res.status(400).json({ error: 'Coupon has expired' });
    }

    // Update user coupon status
    await userCoupon.update({ status: 'REDEEMED' });

    // Create redemption record
    const redemption = await CouponRedemption.create({
      userCouponId: userCoupon.id,
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
        ...computeCouponPrices({
          type: userCoupon.coupon.type,
          percentOff: userCoupon.coupon.percentOff,
          fixedOff: userCoupon.coupon.fixedOff,
          menuItem: userCoupon.coupon.menuItem,
          drinkItem: userCoupon.coupon.drinkItem,
        }),
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
      {
        const required = condition.valueInt;
        const remaining = Math.max(0, required - currentPoints);
        allowed = currentPoints >= required;
        if (!allowed) {
          reasons.push(`Need at least ${required} points`);
        }
        progress = {
          current: currentPoints,
          required,
          type: 'points',
          met: allowed,
          code: 'points_at_least',
          params: { current: currentPoints, required, remaining },
          message: !allowed
            ? `Imate ${currentPoints} od ${required} potrebnih bodova. Potrebno vam je još ${remaining} bodova.`
            : `Uvjet ispunjen: imate ${currentPoints} bodova (min ${required}).`,
        };
      }
      break;

    case 'REFERRALS_AT_LEAST':
      // Use new referral system - count completed referrals
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
      {
        const required = condition.valueInt;
        const remaining = Math.max(0, required - referralCount);
        allowed = referralCount >= required;
        if (!allowed) {
          reasons.push(
            `Need at least ${required} completed referrals (you have ${referralCount})`,
          );
        }
        progress = {
          current: referralCount,
          required,
          type: 'referrals',
          met: allowed,
          code: 'referrals_at_least',
          params: { current: referralCount, required, remaining },
          message: !allowed
            ? `Imate ${referralCount} od ${required} potrebnih završenih preporuka. Potrebno vam je još ${remaining} preporuka.`
            : `Uvjet ispunjen: imate ${referralCount} završenih preporuka (min ${required}).`,
        };
      }
      break;

    case 'VISITS_SAME_RESTAURANT_AT_LEAST':
      if (!condition.restaurantScopeId) {
        allowed = false;
        reasons.push('Restaurant scope is required for this condition');
        progress = {
          current: 0,
          required: condition.valueInt,
          type: 'same_restaurant_visits',
          met: false,
          code: 'visits_same_restaurant',
          params: {
            current: 0,
            required: condition.valueInt,
            remaining: condition.valueInt,
          },
        };
        break;
      }
      if (!userId) {
        // Public user, cannot compute yet
        allowed = false;
        progress = {
          current: 0,
          required: condition.valueInt,
          type: 'same_restaurant_visits',
          met: false,
          code: 'login_required',
          params: {},
        };
        reasons.push('Login required to evaluate restaurant visits');
        break;
      }
      {
        let sameRestaurantQuery = {
          where: {
            userId,
            restaurantId: condition.restaurantScopeId,
            usedAt: { [Op.ne]: null },
          },
        };

        if (couponCreatedAt) {
          sameRestaurantQuery.where.usedAt = { [Op.gte]: couponCreatedAt };
        }

        const sameRestaurantVisits =
          await VisitValidation.count(sameRestaurantQuery);
        const required = condition.valueInt;
        const remaining = Math.max(0, required - sameRestaurantVisits);
        allowed = sameRestaurantVisits >= required;
        if (!allowed) {
          reasons.push(
            `Need at least ${required} visits to this restaurant (you have ${sameRestaurantVisits})`,
          );
        }
        progress = {
          current: sameRestaurantVisits,
          required,
          type: 'same_restaurant_visits',
          met: allowed,
          code: 'visits_same_restaurant',
          params: { current: sameRestaurantVisits, required, remaining },
          message: !allowed
            ? `Posjetili ste ${sameRestaurantVisits} od ${required} puta ovaj restoran. Posjetite još ${remaining} puta.`
            : `Uvjet ispunjen: posjete ${sameRestaurantVisits}/${required}.`,
        };
      }
      break;

    case 'VISITS_DIFFERENT_RESTAURANTS_AT_LEAST':
      if (!userId) {
        allowed = false;
        progress = {
          current: 0,
          required: condition.valueInt,
          type: 'different_restaurant_visits',
          met: false,
          code: 'login_required',
          params: {},
        };
        reasons.push(
          'Login required to evaluate visits to different restaurants',
        );
        break;
      }
      {
        let differentRestaurantQuery = {
          where: {
            userId,
            usedAt: { [Op.ne]: null },
          },
          distinct: true,
          col: 'restaurantId',
        };

        if (couponCreatedAt) {
          differentRestaurantQuery.where.usedAt = { [Op.gte]: couponCreatedAt };
        }

        const differentRestaurantVisits = await VisitValidation.count(
          differentRestaurantQuery,
        );
        const required = condition.valueInt;
        const remaining = Math.max(0, required - differentRestaurantVisits);
        allowed = differentRestaurantVisits >= required;
        if (!allowed) {
          reasons.push(
            `Need at least ${required} visits to different restaurants (you have ${differentRestaurantVisits})`,
          );
        }
        progress = {
          current: differentRestaurantVisits,
          required,
          type: 'different_restaurant_visits',
          met: allowed,
          code: 'visits_different_restaurants',
          params: { current: differentRestaurantVisits, required, remaining },
          message: !allowed
            ? `Posjetili ste ${differentRestaurantVisits} od ${required} različitih restorana. Posjetite još ${remaining} različitih restorana.`
            : `Uvjet ispunjen: različiti restorani ${differentRestaurantVisits}/${required}.`,
        };
      }
      break;

    case 'VISITS_CITIES_AT_LEAST':
      if (!userId) {
        allowed = false;
        progress = {
          current: 0,
          required: condition.valueInt,
          type: 'city_visits',
          met: false,
          code: 'login_required',
          params: {},
        };
        reasons.push('Login required to evaluate visits across cities');
        break;
      }
      {
        let cityVisitsQuery = {
          where: {
            userId,
            usedAt: { [Op.ne]: null },
          },
          include: [
            {
              model: Restaurant,
              as: 'restaurant',
              attributes: ['place'],
            },
          ],
        };

        if (couponCreatedAt) {
          cityVisitsQuery.where.usedAt = { [Op.gte]: couponCreatedAt };
        }

        const cityVisits = await VisitValidation.findAll(cityVisitsQuery);
        const uniqueCities = new Set(
          cityVisits.map((visit) => visit.restaurant?.place).filter(Boolean),
        );
        const required = condition.valueInt;
        const current = uniqueCities.size;
        const remaining = Math.max(0, required - current);
        allowed = current >= required;
        if (!allowed) {
          reasons.push(
            `Need at least ${required} visits to different cities (you have visited ${current} cities)`,
          );
        }
        progress = {
          current,
          required,
          type: 'city_visits',
          met: allowed,
          code: 'visits_cities',
          params: { current, required, remaining },
          message: !allowed
            ? `Posjetili ste ${current} od ${required} različitih gradova. Posjetite još ${remaining} grad.`
            : `Uvjet ispunjen: gradovi ${current}/${required}.`,
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
