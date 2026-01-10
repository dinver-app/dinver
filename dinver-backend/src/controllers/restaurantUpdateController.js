const {
  RestaurantUpdate,
  RestaurantUpdateView,
  Restaurant,
  User,
  UserAdmin,
  ContentTranslation,
  UserSettings,
} = require('../../models');
const { Op } = require('sequelize');
const {
  uploadImageExperience,
  getImageUrls,
} = require('../../services/imageUploadService');
const { deleteFromS3 } = require('../../utils/s3Upload');
const { getMediaUrl } = require('../../config/cdn');
const { detectLanguage, translateContent } = require('../../utils/translate');

// Valid update categories
const UPDATE_CATEGORIES = [
  'LIVE_MUSIC',
  'NEW_PRODUCT',
  'NEW_LOCATION',
  'SPECIAL_OFFER',
  'SEASONAL_MENU',
  'EVENT',
  'EXTENDED_HOURS',
  'RESERVATIONS',
  'CHEFS_SPECIAL',
  'FAMILY_FRIENDLY',
  'REOPENING',
  'OTHER',
];

/**
 * Create a new restaurant update (Admin only)
 * Rate limit: 1 update per day per restaurant
 */
const createUpdate = async (req, res) => {
  try {
    const { restaurantId, content, category, durationDays } = req.body;
    const userId = req.user.id;
    const file = req.file;

    // Validate required fields
    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required' });
    }
    if (!content || content.length < 10 || content.length > 500) {
      return res.status(400).json({
        error: 'content is required and must be between 10 and 500 characters',
      });
    }
    if (!category || !UPDATE_CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: `category is required and must be one of: ${UPDATE_CATEGORIES.join(', ')}`,
      });
    }
    const duration = parseInt(durationDays);
    if (![1, 3, 7].includes(duration)) {
      return res.status(400).json({
        error: 'durationDays must be 1, 3, or 7',
      });
    }

    // Check if user is admin of this restaurant
    const isAdmin = await UserAdmin.findOne({
      where: { userId, restaurantId },
    });
    if (!isAdmin) {
      return res.status(403).json({
        error: 'You are not an admin of this restaurant',
      });
    }

    // Check rate limit: 5 updates per calendar day per restaurant
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0); // Start of today (00:00)

    const todayUpdates = await RestaurantUpdate.count({
      where: {
        restaurantId,
        createdAt: { [Op.gte]: todayStart },
        status: { [Op.ne]: 'DELETED' },
      },
    });

    if (todayUpdates >= 5) {
      return res.status(429).json({
        error: 'Možete objaviti maksimalno 5 updatea dnevno',
        error_code: 'RATE_LIMIT_EXCEEDED',
        limit: 5,
        current: todayUpdates,
      });
    }

    // Get restaurant for caching location data
    const restaurant = await Restaurant.findByPk(restaurantId, {
      attributes: ['id', 'name', 'place', 'latitude', 'longitude'],
    });
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration);

    // Detect language of content for translation feature
    let detectedLang = null;
    if (content && content.trim().length >= 10) {
      try {
        detectedLang = await detectLanguage(content);
      } catch (langError) {
        console.error('[Create Update] Language detection failed:', langError.message);
        // Continue without detected language - not critical
      }
    }

    // Upload image if provided
    let imageKey = null;
    let imageWidth = null;
    let imageHeight = null;

    if (file) {
      try {
        const uploadResult = await uploadImageExperience(
          file,
          `updates/${restaurantId}`,
          { maxWidth: 1200, quality: 85 }
        );
        imageKey = uploadResult.imageUrl;
        imageWidth = uploadResult.width;
        imageHeight = uploadResult.height;
      } catch (uploadError) {
        console.error('Error uploading update image:', uploadError);
        return res.status(500).json({ error: 'Failed to upload image' });
      }
    }

    // Create the update
    const update = await RestaurantUpdate.create({
      restaurantId,
      createdByUserId: userId,
      content,
      category,
      durationDays: duration,
      expiresAt,
      imageKey,
      imageWidth,
      imageHeight,
      status: 'ACTIVE',
      cityCached: restaurant.place,
      latitudeCached: restaurant.latitude,
      longitudeCached: restaurant.longitude,
      viewCount: 0,
      detectedLanguage: detectedLang,
    });

    // Prepare response
    const response = {
      id: update.id,
      restaurantId: update.restaurantId,
      content: update.content,
      category: update.category,
      durationDays: update.durationDays,
      expiresAt: update.expiresAt,
      imageUrl: imageKey ? getMediaUrl(imageKey, 'image', 'original') : null,
      status: update.status,
      createdAt: update.createdAt,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating restaurant update:', error);
    res.status(500).json({ error: 'Failed to create update' });
  }
};

/**
 * Get all updates for a restaurant (Admin view)
 */
const getRestaurantUpdates = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { status, limit = 20, offset = 0 } = req.query;

    // Build where clause
    const where = { restaurantId };
    if (status) {
      where.status = status;
    }

    const updates = await RestaurantUpdate.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Transform response
    const transformedUpdates = updates.rows.map((update) => ({
      id: update.id,
      content: update.content,
      category: update.category,
      durationDays: update.durationDays,
      expiresAt: update.expiresAt,
      imageUrl: update.imageKey
        ? getMediaUrl(update.imageKey, 'image', 'original')
        : null,
      status: update.status,
      viewCount: update.viewCount,
      createdAt: update.createdAt,
      isExpired: new Date() > new Date(update.expiresAt),
    }));

    res.json({
      updates: transformedUpdates,
      total: updates.count,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Error fetching restaurant updates:', error);
    res.status(500).json({ error: 'Failed to fetch updates' });
  }
};

/**
 * Get a single update by ID
 */
const getUpdateById = async (req, res) => {
  try {
    const { updateId } = req.params;

    const update = await RestaurantUpdate.findByPk(updateId, {
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'slug', 'thumbnailUrl'],
        },
      ],
    });

    if (!update) {
      return res.status(404).json({ error: 'Update not found' });
    }

    const response = {
      id: update.id,
      restaurant: {
        id: update.restaurant.id,
        name: update.restaurant.name,
        slug: update.restaurant.slug,
      },
      content: update.content,
      category: update.category,
      durationDays: update.durationDays,
      expiresAt: update.expiresAt,
      imageUrl: update.imageKey
        ? getMediaUrl(update.imageKey, 'image', 'original')
        : null,
      status: update.status,
      viewCount: update.viewCount,
      createdAt: update.createdAt,
      detectedLanguage: update.detectedLanguage,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching update:', error);
    res.status(500).json({ error: 'Failed to fetch update' });
  }
};

/**
 * Delete (soft delete) an update (Admin only)
 */
const deleteUpdate = async (req, res) => {
  try {
    const { updateId } = req.params;
    const userId = req.user.id;

    const update = await RestaurantUpdate.findByPk(updateId);
    if (!update) {
      return res.status(404).json({ error: 'Update not found' });
    }

    // Check if user is admin of this restaurant
    const isAdmin = await UserAdmin.findOne({
      where: { userId, restaurantId: update.restaurantId },
    });
    if (!isAdmin) {
      return res.status(403).json({
        error: 'You are not an admin of this restaurant',
      });
    }

    // Soft delete by updating status
    await update.update({ status: 'DELETED' });

    // Optionally delete image from S3
    if (update.imageKey) {
      try {
        await deleteFromS3(update.imageKey);
      } catch (deleteError) {
        console.error('Error deleting image from S3:', deleteError);
        // Don't fail the request if image deletion fails
      }
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting update:', error);
    res.status(500).json({ error: 'Failed to delete update' });
  }
};

/**
 * Get updates feed (Public)
 * Filters by location, category, and shows only active non-expired updates
 */
const getUpdatesFeed = async (req, res) => {
  try {
    const {
      lat,
      lng,
      distance = 20, // km
      category,
      limit = 20,
      offset = 0,
    } = req.query;

    // Build base where clause
    const where = {
      status: 'ACTIVE',
      expiresAt: { [Op.gt]: new Date() },
    };

    // Category filter
    if (category && UPDATE_CATEGORIES.includes(category)) {
      where.category = category;
    }

    // Build query options
    const queryOptions = {
      where,
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'slug', 'thumbnailUrl', 'latitude', 'longitude'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    };

    // Distance filter using Haversine formula
    if (lat && lng && distance !== 'all') {
      const distanceKm = parseFloat(distance);
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      // Add distance calculation to raw SQL
      queryOptions.attributes = {
        include: [
          [
            require('sequelize').literal(`
              (6371 * acos(
                cos(radians(${latitude})) * cos(radians("latitudeCached")) *
                cos(radians("longitudeCached") - radians(${longitude})) +
                sin(radians(${latitude})) * sin(radians("latitudeCached"))
              ))
            `),
            'distanceKm',
          ],
        ],
      };

      // Filter by distance
      queryOptions.having = require('sequelize').literal(
        `(6371 * acos(
          cos(radians(${latitude})) * cos(radians("latitudeCached")) *
          cos(radians("longitudeCached") - radians(${longitude})) +
          sin(radians(${latitude})) * sin(radians("latitudeCached"))
        )) <= ${distanceKm}`
      );

      // Need to group for having clause
      queryOptions.group = [
        'RestaurantUpdate.id',
        'restaurant.id',
      ];

      // Subquery to handle pagination with having clause
      queryOptions.subQuery = false;
    }

    const updates = await RestaurantUpdate.findAll(queryOptions);

    // Get total count for pagination (without distance filter for simplicity)
    const totalCount = await RestaurantUpdate.count({ where });

    // Transform response
    const transformedUpdates = updates.map((update) => {
      const updateData = update.toJSON();
      return {
        id: updateData.id,
        restaurant: {
          id: updateData.restaurant.id,
          name: updateData.restaurant.name,
          slug: updateData.restaurant.slug,
        },
        content: updateData.content,
        category: updateData.category,
        durationDays: updateData.durationDays,
        expiresAt: updateData.expiresAt,
        imageUrl: updateData.imageKey
          ? getMediaUrl(updateData.imageKey, 'image', 'original')
          : null,
        createdAt: updateData.createdAt,
        distanceKm: updateData.distanceKm
          ? parseFloat(updateData.distanceKm).toFixed(1)
          : null,
        detectedLanguage: updateData.detectedLanguage,
      };
    });

    res.json({
      updates: transformedUpdates,
      total: totalCount,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Error fetching updates feed:', error);
    res.status(500).json({ error: 'Failed to fetch updates feed' });
  }
};

/**
 * Record a view on an update (Public)
 * Increments view count and creates RestaurantUpdateView record
 */
const recordView = async (req, res) => {
  try {
    const { updateId } = req.params;
    const userId = req.user?.id || null; // Optional - may be anonymous

    const update = await RestaurantUpdate.findByPk(updateId);
    if (!update) {
      return res.status(404).json({ error: 'Update not found' });
    }

    // For logged-in users, check if they already viewed
    if (userId) {
      const existingView = await RestaurantUpdateView.findOne({
        where: { updateId, userId },
      });

      if (!existingView) {
        // Create new view record
        await RestaurantUpdateView.create({ updateId, userId });

        // Increment view count
        await update.increment('viewCount');
      }
      // If already viewed, don't increment again
    } else {
      // Anonymous user - always create view and increment
      await RestaurantUpdateView.create({ updateId, userId: null });
      await update.increment('viewCount');
    }

    res.json({ success: true, viewCount: update.viewCount + 1 });
  } catch (error) {
    console.error('Error recording view:', error);
    res.status(500).json({ error: 'Failed to record view' });
  }
};

/**
 * Get all available categories
 */
const getCategories = async (req, res) => {
  try {
    const categories = UPDATE_CATEGORIES.map((key) => ({
      key,
    }));

    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

/**
 * Translate Restaurant Update content
 * POST /api/app/updates/:updateId/translate
 *
 * Translates the update content to user's preferred language.
 * Caches translations for faster subsequent requests.
 */
const translateUpdate = async (req, res) => {
  try {
    const { updateId } = req.params;
    const userId = req.user.id;

    // Get user's preferred language from settings
    const userSettings = await UserSettings.findOne({ where: { userId } });
    const targetLanguage = userSettings?.language || 'en';

    // Get update
    const update = await RestaurantUpdate.findByPk(updateId);
    if (!update) {
      return res.status(404).json({
        error: 'Update not found',
      });
    }

    if (!update.content || update.content.trim().length === 0) {
      return res.status(400).json({
        error: 'No content to translate',
      });
    }

    // Check cache first
    const cached = await ContentTranslation.findOne({
      where: {
        contentType: 'restaurant_update',
        contentId: updateId,
        targetLanguage,
      },
    });

    if (cached) {
      return res.status(200).json({
        translatedText: cached.translatedText,
        sourceLanguage: cached.sourceLanguage,
        targetLanguage: cached.targetLanguage,
        cached: true,
      });
    }

    // Determine source language
    const sourceLanguage = update.detectedLanguage ||
      (targetLanguage === 'hr' ? 'en' : 'hr');

    // If source and target are the same, no translation needed
    if (sourceLanguage === targetLanguage) {
      return res.status(200).json({
        translatedText: update.content,
        sourceLanguage,
        targetLanguage,
        cached: false,
        note: 'Same language, no translation needed',
      });
    }

    // Translate
    const translatedText = await translateContent(
      update.content,
      targetLanguage,
      sourceLanguage
    );

    // Cache the translation
    await ContentTranslation.create({
      contentType: 'restaurant_update',
      contentId: updateId,
      sourceLanguage,
      targetLanguage,
      originalText: update.content,
      translatedText,
    });

    return res.status(200).json({
      translatedText,
      sourceLanguage,
      targetLanguage,
      cached: false,
    });
  } catch (error) {
    console.error('[Translate Update] Error:', error);
    res.status(500).json({
      error: 'Failed to translate update',
      details: error.message,
    });
  }
};

/**
 * Get active updates for a specific restaurant (Public)
 * Used on restaurant details page to show current announcements
 */
const getActiveUpdatesByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { limit = 10 } = req.query;

    const updates = await RestaurantUpdate.findAll({
      where: {
        restaurantId,
        status: 'ACTIVE',
        expiresAt: { [Op.gt]: new Date() },
      },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
    });

    // Transform response
    const transformedUpdates = updates.map((update) => ({
      id: update.id,
      content: update.content,
      category: update.category,
      durationDays: update.durationDays,
      expiresAt: update.expiresAt,
      imageUrl: update.imageKey
        ? getMediaUrl(update.imageKey, 'image', 'original')
        : null,
      createdAt: update.createdAt,
    }));

    res.json({
      updates: transformedUpdates,
      count: transformedUpdates.length,
    });
  } catch (error) {
    console.error('Error fetching restaurant updates:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant updates' });
  }
};

module.exports = {
  createUpdate,
  getRestaurantUpdates,
  getUpdateById,
  deleteUpdate,
  getUpdatesFeed,
  recordView,
  getCategories,
  translateUpdate,
  getActiveUpdatesByRestaurant,
  UPDATE_CATEGORIES,
};
