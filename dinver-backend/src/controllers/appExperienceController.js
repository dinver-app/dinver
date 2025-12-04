/**
 * Experience Controller
 *
 * Handles Experience creation and management.
 * Experiences are linked to Visits (verified restaurant visits).
 */

const {
  Experience,
  ExperienceMedia,
  ExperienceLike,
  User,
  Restaurant,
  Visit,
  MenuItem,
  MenuItemTranslation,
  sequelize,
} = require('../../models');
const { literal } = require('sequelize');
const { Op } = require('sequelize');
const {
  uploadImage,
  UPLOAD_STRATEGY,
} = require('../../services/imageUploadService');
const {
  updateRestaurantDinverRating,
} = require('../services/dinverRatingService');

/**
 * Create Experience with images in one request
 * POST /api/app/experiences
 *
 * Multipart form data:
 * - visitId: UUID
 * - foodRating: 1.0-10.0
 * - ambienceRating: 1.0-10.0
 * - serviceRating: 1.0-10.0
 * - description: string (optional)
 * - partySize: number (optional, default 2)
 * - mealType: string (optional)
 * - images: file[] (up to 6 images)
 * - captions: string[] (optional, JSON array - caption for each image)
 * - menuItemIds: string[] (optional, JSON array - UUID of menu item for each image)
 * - recommendedImageIndex: number (optional, 0-based index of image marked as "recommended")
 */
const createExperience = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const {
      visitId,
      foodRating,
      ambienceRating,
      serviceRating,
      description,
      partySize,
      mealType,
    } = req.body;

    // Parse captions - can be JSON array or comma-separated
    let captions = [];
    if (req.body.captions) {
      try {
        captions = JSON.parse(req.body.captions);
      } catch {
        captions = req.body.captions.split(',').map((c) => c.trim());
      }
    }

    // Parse menuItemIds - JSON array of UUIDs matching image order
    let menuItemIds = [];
    if (req.body.menuItemIds) {
      try {
        menuItemIds = JSON.parse(req.body.menuItemIds);
      } catch {
        // Ignore invalid JSON
      }
    }

    // Parse recommendedImageIndex - which image has the "recommended" badge
    const recommendedImageIndex =
      req.body.recommendedImageIndex !== undefined
        ? parseInt(req.body.recommendedImageIndex)
        : null;

    const files = req.files || [];

    // Validation
    if (!visitId) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Visit ID is required',
      });
    }

    // Ratings validation (1.0-10.0)
    if (!foodRating || !ambienceRating || !serviceRating) {
      await transaction.rollback();
      return res.status(400).json({
        error:
          'All ratings are required (foodRating, ambienceRating, serviceRating)',
      });
    }

    const ratings = [foodRating, ambienceRating, serviceRating];
    for (const rating of ratings) {
      if (parseFloat(rating) < 1.0 || parseFloat(rating) > 10.0) {
        await transaction.rollback();
        return res.status(400).json({
          error: 'Ratings must be between 1.0 and 10.0',
        });
      }
    }

    // Max 6 images
    if (files.length > 6) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Maximum 6 images allowed',
      });
    }

    // Content validation: description is always required (min 20 characters)
    const descriptionLength = description ? description.trim().length : 0;
    const MIN_DESCRIPTION_LENGTH = 20;

    if (descriptionLength < MIN_DESCRIPTION_LENGTH) {
      await transaction.rollback();
      return res.status(400).json({
        error: `Description is required (minimum ${MIN_DESCRIPTION_LENGTH} characters)`,
        details: {
          descriptionLength,
          minDescriptionLength: MIN_DESCRIPTION_LENGTH,
        },
      });
    }

    // Find the Visit
    const visit = await Visit.findOne({
      where: {
        id: visitId,
        userId,
      },
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: [
            'id',
            'name',
            'place',
            'address',
            'thumbnailUrl',
            'isClaimed',
          ],
        },
        {
          model: Experience,
          as: 'experience',
        },
      ],
      transaction,
    });

    if (!visit) {
      await transaction.rollback();
      return res.status(404).json({
        error: 'Visit not found',
      });
    }

    // Check if Visit already has an Experience
    if (visit.experience) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'This visit already has an experience',
        experienceId: visit.experience.id,
      });
    }

    // Calculate overall rating (average of 3 ratings)
    const overallRating = parseFloat(
      (
        (parseFloat(foodRating) +
          parseFloat(ambienceRating) +
          parseFloat(serviceRating)) /
        3
      ).toFixed(1),
    );

    // Validate mealType
    const validMealTypes = [
      'breakfast',
      'brunch',
      'lunch',
      'dinner',
      'sweet',
      'drinks',
    ];
    if (mealType && !validMealTypes.includes(mealType)) {
      await transaction.rollback();
      return res.status(400).json({
        error: `Invalid meal type. Must be one of: ${validMealTypes.join(', ')}`,
      });
    }

    // Determine status based on Visit approval
    // If Visit is APPROVED, Experience is immediately APPROVED
    // Otherwise, Experience is PENDING until Visit is approved
    const status = visit.status === 'APPROVED' ? 'APPROVED' : 'PENDING';
    const publishedAt = status === 'APPROVED' ? new Date() : null;

    // Create Experience
    const experience = await Experience.create(
      {
        userId,
        visitId,
        restaurantId: visit.restaurantId,
        status,
        description: description || null,
        foodRating: parseFloat(foodRating),
        ambienceRating: parseFloat(ambienceRating),
        serviceRating: parseFloat(serviceRating),
        overallRating,
        partySize: partySize ? parseInt(partySize) : 2,
        mealType: mealType || null,
        cityCached: visit.restaurant?.place || null,
        publishedAt,
      },
      { transaction },
    );

    // Upload images in PARALLEL (much faster than sequential!)
    // Frontend sends pre-compressed images (1800px, 0.85 quality)
    // EXPERIENCE strategy: smart skip if already JPEG <= 2000px
    const folder = `experiences/${userId}`;

    const uploadPromises = files.map((file, i) =>
      uploadImage(file, folder, {
        strategy: UPLOAD_STRATEGY.EXPERIENCE,
        maxWidth: 2000, // Safety limit - frontend sends 1800px, only resize if somehow larger
        quality: 85,
      }).then((imageResult) => ({
        imageResult,
        index: i,
        caption: captions[i] || null,
      })),
    );

    // Wait for all uploads to complete in parallel
    const uploadResults = await Promise.all(uploadPromises);

    // Create ExperienceMedia records (must be sequential for transaction)
    const mediaRecords = [];
    for (const { imageResult, index, caption } of uploadResults) {
      // Get menuItemId for this image (if provided)
      const menuItemId = menuItemIds[index] || null;
      // Check if this image is marked as recommended
      const isRecommended = recommendedImageIndex === index;

      const media = await ExperienceMedia.create(
        {
          experienceId: experience.id,
          kind: 'IMAGE',
          storageKey: imageResult.imageUrl,
          cdnUrl: imageResult.imageUrl,
          width: imageResult.width || null,
          height: imageResult.height || null,
          orderIndex: index,
          transcodingStatus: 'DONE',
          caption,
          menuItemId,
          isRecommended,
        },
        { transaction },
      );

      mediaRecords.push({
        id: media.id,
        imageUrl: imageResult.imageUrl,
        orderIndex: index,
        caption,
        menuItemId,
        isRecommended,
      });
    }

    // Sort by orderIndex to ensure correct order in response
    mediaRecords.sort((a, b) => a.orderIndex - b.orderIndex);

    await transaction.commit();

    // Update restaurant's Dinver rating (async, don't block response)
    if (visit.restaurantId && status === 'APPROVED') {
      updateRestaurantDinverRating(visit.restaurantId).catch((err) => {
        console.error(
          '[Create Experience] Failed to update Dinver rating:',
          err.message,
        );
      });
    }

    res.status(201).json({
      experienceId: experience.id,
      status,
      overallRating,
      imagesUploaded: mediaRecords.length,
      media: mediaRecords,
      message:
        status === 'APPROVED'
          ? 'Experience published successfully!'
          : 'Experience saved! Will be visible once receipt is approved.',
    });
  } catch (error) {
    await transaction.rollback();
    console.error('[Create Experience] Error:', error);
    res.status(500).json({
      error: 'Failed to create experience',
      details: error.message,
    });
  }
};

/**
 * Get Experience by ID
 * GET /api/app/experiences/:experienceId
 */
const getExperience = async (req, res) => {
  try {
    const { experienceId } = req.params;
    const userId = req.user?.id || null;

    const experience = await Experience.findByPk(experienceId, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'username', 'profileImage'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: [
            'id',
            'name',
            'place',
            'address',
            'thumbnailUrl',
            'isClaimed',
          ],
        },
        {
          model: ExperienceMedia,
          as: 'media',
          attributes: ['id', 'experienceId', 'kind', 'storageKey', 'cdnUrl', 'width', 'height', 'orderIndex', 'bytes', 'transcodingStatus', 'mimeType', 'caption', 'menuItemId', 'isRecommended', 'createdAt', 'updatedAt'],
          include: [
            {
              model: MenuItem,
              as: 'menuItem',
              attributes: ['id', 'restaurantId'],
              required: false,
              include: [
                {
                  model: MenuItemTranslation,
                  as: 'translations',
                  attributes: ['language', 'name'],
                },
              ],
            },
          ],
        },
        {
          model: Visit,
          as: 'visit',
          attributes: ['id', 'status', 'visitDate'],
        },
      ],
      order: [[{ model: ExperienceMedia, as: 'media' }, 'orderIndex', 'ASC']],
    });

    if (!experience) {
      return res.status(404).json({
        error: 'Experience not found',
      });
    }

    // Only show approved experiences to non-owners
    if (experience.status !== 'APPROVED' && experience.userId !== userId) {
      return res.status(404).json({
        error: 'Experience not found',
      });
    }

    // Check if user has liked
    let hasLiked = false;
    if (userId) {
      const like = await ExperienceLike.findOne({
        where: { experienceId, userId },
      });
      hasLiked = !!like;
    }

    res.status(200).json({
      experience: {
        ...experience.toJSON(),
        hasLiked,
      },
    });
  } catch (error) {
    console.error('[Get Experience] Error:', error);
    res.status(500).json({
      error: 'Failed to get experience',
      details: error.message,
    });
  }
};

/**
 * Get Experience Feed with distance-based filtering
 * GET /api/app/experiences/feed
 *
 * Query params:
 * - lat: user latitude
 * - lng: user longitude
 * - distance: 20, 60, or "all" (km)
 * - mealType: filter by meal type
 * - limit: number of results (default 20)
 * - offset: pagination offset
 */
const getExperienceFeed = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const { limit = 20, offset = 0, lat, lng, distance, mealType } = req.query;

    // Build where clause
    const where = {
      status: 'APPROVED',
    };

    // Filter by meal type if provided
    if (mealType) {
      where.mealType = mealType;
    }

    // Build restaurant include with distance filter
    const restaurantInclude = {
      model: Restaurant,
      as: 'restaurant',
      attributes: [
        'id',
        'name',
        'slug',
        'place',
        'thumbnailUrl',
        'latitude',
        'longitude',
        'isClaimed',
      ],
      required: true,
    };

    // If lat/lng provided and distance is not "all", filter by distance
    if (lat && lng && distance && distance !== 'all') {
      const distanceKm = parseInt(distance);
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);

      // Haversine formula for distance calculation
      restaurantInclude.where = literal(`
        (6371 * acos(
          cos(radians(${userLat})) *
          cos(radians("Restaurant"."latitude")) *
          cos(radians("Restaurant"."longitude") - radians(${userLng})) +
          sin(radians(${userLat})) *
          sin(radians("Restaurant"."latitude"))
        )) <= ${distanceKm}
      `);
    }

    // Get experiences
    const experiences = await Experience.findAll({
      where,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'username', 'profileImage'],
        },
        restaurantInclude,
        {
          model: ExperienceMedia,
          as: 'media',
          attributes: ['id', 'experienceId', 'kind', 'storageKey', 'cdnUrl', 'width', 'height', 'orderIndex', 'bytes', 'transcodingStatus', 'mimeType', 'caption', 'menuItemId', 'isRecommended', 'createdAt', 'updatedAt'],
          include: [
            {
              model: MenuItem,
              as: 'menuItem',
              attributes: ['id', 'restaurantId'],
              required: false,
              include: [
                {
                  model: MenuItemTranslation,
                  as: 'translations',
                  attributes: ['language', 'name'],
                },
              ],
            },
          ],
        },
      ],
      order: [
        ['publishedAt', 'DESC'], // Chronological (newest first)
        [{ model: ExperienceMedia, as: 'media' }, 'orderIndex', 'ASC'],
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Get liked status if user is logged in
    let likedIds = [];
    if (userId && experiences.length > 0) {
      const experienceIds = experiences.map((e) => e.id);

      const likes = await ExperienceLike.findAll({
        where: {
          experienceId: { [Op.in]: experienceIds },
          userId,
        },
        attributes: ['experienceId'],
      });
      likedIds = likes.map((l) => l.experienceId);
    }

    // Calculate distance for each experience if coordinates provided
    const experiencesWithStatus = experiences.map((exp) => {
      const result = {
        ...exp.toJSON(),
        hasLiked: likedIds.includes(exp.id),
      };

      // Add distance if coordinates provided
      if (lat && lng && exp.restaurant?.latitude && exp.restaurant?.longitude) {
        const R = 6371; // Earth's radius in km
        const dLat =
          ((exp.restaurant.latitude - parseFloat(lat)) * Math.PI) / 180;
        const dLon =
          ((exp.restaurant.longitude - parseFloat(lng)) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((parseFloat(lat) * Math.PI) / 180) *
            Math.cos((exp.restaurant.latitude * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        result.distanceKm = Math.round(R * c * 10) / 10; // Round to 1 decimal
      }

      return result;
    });

    res.status(200).json({
      experiences: experiencesWithStatus,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: experiences.length === parseInt(limit),
      },
      filters: {
        distance: distance || 'all',
        mealType: mealType || null,
      },
    });
  } catch (error) {
    console.error('[Get Experience Feed] Error:', error);
    res.status(500).json({
      error: 'Failed to get feed',
      details: error.message,
    });
  }
};

/**
 * Like Experience
 * POST /api/app/experiences/:experienceId/like
 */
const likeExperience = async (req, res) => {
  try {
    const userId = req.user.id;
    const { experienceId } = req.params;

    // Check if experience exists
    const experience = await Experience.findByPk(experienceId);
    if (!experience) {
      return res.status(404).json({
        error: 'Experience not found',
      });
    }

    // Check if already liked
    const existingLike = await ExperienceLike.findOne({
      where: { experienceId, userId },
    });

    if (existingLike) {
      return res.status(400).json({
        error: 'Already liked',
      });
    }

    // Create like
    await ExperienceLike.create({
      experienceId,
      userId,
    });

    // Increment likes count
    await experience.increment('likesCount');

    // Reload to get updated count
    await experience.reload();

    res.status(201).json({
      message: 'Liked',
      likesCount: experience.likesCount,
    });
  } catch (error) {
    console.error('[Like Experience] Error:', error);
    res.status(500).json({
      error: 'Failed to like experience',
      details: error.message,
    });
  }
};

/**
 * Unlike Experience
 * DELETE /api/app/experiences/:experienceId/like
 */
const unlikeExperience = async (req, res) => {
  try {
    const userId = req.user.id;
    const { experienceId } = req.params;

    // Find and delete like
    const deleted = await ExperienceLike.destroy({
      where: { experienceId, userId },
    });

    if (deleted === 0) {
      return res.status(400).json({
        error: 'Not liked',
      });
    }

    // Decrement likes count
    const experience = await Experience.findByPk(experienceId);
    if (experience && experience.likesCount > 0) {
      await experience.decrement('likesCount');
      // Reload to get updated count
      await experience.reload();
    }

    res.status(200).json({
      message: 'Unliked',
      likesCount: experience ? experience.likesCount : 0,
    });
  } catch (error) {
    console.error('[Unlike Experience] Error:', error);
    res.status(500).json({
      error: 'Failed to unlike experience',
      details: error.message,
    });
  }
};

/**
 * Get User's Experiences
 * GET /api/app/experiences/user/:userId
 */
const getUserExperiences = async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const currentUserId = req.user?.id || null;
    const { limit = 20, offset = 0 } = req.query;

    // Build where clause
    const where = {
      userId: targetUserId,
    };

    // If not viewing own profile, only show approved experiences
    if (currentUserId !== targetUserId) {
      where.status = 'APPROVED';
    }

    const experiences = await Experience.findAll({
      where,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'username', 'profileImage'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: [
            'id',
            'name',
            'place',
            'address',
            'thumbnailUrl',
            'isClaimed',
          ],
        },
        {
          model: ExperienceMedia,
          as: 'media',
          attributes: ['id', 'experienceId', 'kind', 'storageKey', 'cdnUrl', 'width', 'height', 'orderIndex', 'bytes', 'transcodingStatus', 'mimeType', 'caption', 'menuItemId', 'isRecommended', 'createdAt', 'updatedAt'],
          include: [
            {
              model: MenuItem,
              as: 'menuItem',
              attributes: ['id', 'restaurantId'],
              required: false,
              include: [
                {
                  model: MenuItemTranslation,
                  as: 'translations',
                  attributes: ['language', 'name'],
                },
              ],
            },
          ],
        },
      ],
      order: [
        ['createdAt', 'DESC'],
        [{ model: ExperienceMedia, as: 'media' }, 'orderIndex', 'ASC'],
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Get liked status
    let likedIds = [];
    if (currentUserId && experiences.length > 0) {
      const experienceIds = experiences.map((e) => e.id);
      const likes = await ExperienceLike.findAll({
        where: {
          experienceId: { [Op.in]: experienceIds },
          userId: currentUserId,
        },
        attributes: ['experienceId'],
      });
      likedIds = likes.map((l) => l.experienceId);
    }

    const experiencesWithStatus = experiences.map((exp) => ({
      ...exp.toJSON(),
      hasLiked: likedIds.includes(exp.id),
    }));

    res.status(200).json({
      experiences: experiencesWithStatus,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: experiences.length === parseInt(limit),
      },
    });
  } catch (error) {
    console.error('[Get User Experiences] Error:', error);
    res.status(500).json({
      error: 'Failed to get experiences',
      details: error.message,
    });
  }
};

/**
 * Get Restaurant's Experiences
 * GET /api/app/experiences/restaurant/:restaurantId
 */
const getRestaurantExperiences = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const userId = req.user?.id || null;
    const { limit = 20, offset = 0 } = req.query;

    const experiences = await Experience.findAll({
      where: {
        restaurantId,
        status: 'APPROVED',
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'username', 'profileImage'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: [
            'id',
            'name',
            'place',
            'address',
            'thumbnailUrl',
            'isClaimed',
          ],
        },
        {
          model: ExperienceMedia,
          as: 'media',
          attributes: ['id', 'experienceId', 'kind', 'storageKey', 'cdnUrl', 'width', 'height', 'orderIndex', 'bytes', 'transcodingStatus', 'mimeType', 'caption', 'menuItemId', 'isRecommended', 'createdAt', 'updatedAt'],
          include: [
            {
              model: MenuItem,
              as: 'menuItem',
              attributes: ['id', 'restaurantId'],
              required: false,
              include: [
                {
                  model: MenuItemTranslation,
                  as: 'translations',
                  attributes: ['language', 'name'],
                },
              ],
            },
          ],
        },
      ],
      order: [
        ['publishedAt', 'DESC'],
        [{ model: ExperienceMedia, as: 'media' }, 'orderIndex', 'ASC'],
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Get liked status if user is logged in
    let likedIds = [];
    if (userId && experiences.length > 0) {
      const experienceIds = experiences.map((e) => e.id);
      const likes = await ExperienceLike.findAll({
        where: {
          experienceId: { [Op.in]: experienceIds },
          userId,
        },
        attributes: ['experienceId'],
      });
      likedIds = likes.map((l) => l.experienceId);
    }

    const experiencesWithStatus = experiences.map((exp) => ({
      ...exp.toJSON(),
      hasLiked: likedIds.includes(exp.id),
    }));

    // Calculate average ratings
    let avgFood = 0,
      avgAmbience = 0,
      avgService = 0,
      avgOverall = 0;
    if (experiences.length > 0) {
      avgFood =
        experiences.reduce(
          (sum, e) => sum + (parseFloat(e.foodRating) || 0),
          0,
        ) / experiences.length;
      avgAmbience =
        experiences.reduce(
          (sum, e) => sum + (parseFloat(e.ambienceRating) || 0),
          0,
        ) / experiences.length;
      avgService =
        experiences.reduce(
          (sum, e) => sum + (parseFloat(e.serviceRating) || 0),
          0,
        ) / experiences.length;
      avgOverall =
        experiences.reduce(
          (sum, e) => sum + (parseFloat(e.overallRating) || 0),
          0,
        ) / experiences.length;
    }

    res.status(200).json({
      experiences: experiencesWithStatus,
      stats: {
        totalExperiences: experiences.length,
        averageRatings: {
          food: parseFloat(avgFood.toFixed(1)),
          ambience: parseFloat(avgAmbience.toFixed(1)),
          service: parseFloat(avgService.toFixed(1)),
          overall: parseFloat(avgOverall.toFixed(1)),
        },
      },
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: experiences.length === parseInt(limit),
      },
    });
  } catch (error) {
    console.error('[Get Restaurant Experiences] Error:', error);
    res.status(500).json({
      error: 'Failed to get experiences',
      details: error.message,
    });
  }
};

/**
 * Share Experience (track share)
 * POST /api/app/experiences/:experienceId/share
 */
const shareExperience = async (req, res) => {
  try {
    const { experienceId } = req.params;

    const experience = await Experience.findByPk(experienceId);
    if (!experience) {
      return res.status(404).json({
        error: 'Experience not found',
      });
    }

    // Increment shares count
    await experience.increment('sharesCount');

    res.status(200).json({
      message: 'Share tracked',
      sharesCount: experience.sharesCount + 1,
    });
  } catch (error) {
    console.error('[Share Experience] Error:', error);
    res.status(500).json({
      error: 'Failed to track share',
      details: error.message,
    });
  }
};

/**
 * Delete Experience
 * DELETE /api/app/experiences/:experienceId
 *
 * User can delete their own experience
 */
const deleteExperience = async (req, res) => {
  try {
    const userId = req.user.id;
    const { experienceId } = req.params;

    const experience = await Experience.findOne({
      where: {
        id: experienceId,
        userId,
      },
      include: [
        {
          model: ExperienceMedia,
          as: 'media',
        },
      ],
    });

    if (!experience) {
      return res.status(404).json({
        error: 'Experience not found',
      });
    }

    // Store restaurantId before deletion for rating update
    const restaurantId = experience.restaurantId;

    // Delete media from S3
    const { deleteFromS3 } = require('../../utils/s3Upload');
    for (const media of experience.media) {
      if (media.storageKey) {
        try {
          await deleteFromS3(media.storageKey);
        } catch (s3Error) {
          console.error('[Delete Experience] S3 error:', s3Error.message);
        }
      }
    }

    // Delete experience (CASCADE will delete media records)
    await experience.destroy();

    // Update restaurant's Dinver rating (async, don't block response)
    if (restaurantId) {
      updateRestaurantDinverRating(restaurantId).catch((err) => {
        console.error(
          '[Delete Experience] Failed to update Dinver rating:',
          err.message,
        );
      });
    }

    res.status(200).json({
      message: 'Experience deleted',
    });
  } catch (error) {
    console.error('[Delete Experience] Error:', error);
    res.status(500).json({
      error: 'Failed to delete experience',
      details: error.message,
    });
  }
};

module.exports = {
  createExperience,
  getExperience,
  getExperienceFeed,
  likeExperience,
  unlikeExperience,
  getUserExperiences,
  getRestaurantExperiences,
  shareExperience,
  deleteExperience,
};
