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
  UserFollow,
  sequelize,
} = require('../../models');
const { Op, literal } = require('sequelize');
const { uploadImage, UPLOAD_STRATEGY } = require('../../services/imageUploadService');
const { updateRestaurantDinverRating } = require('../services/dinverRatingService');

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
 * - visibility: ALL|FOLLOWERS|BUDDIES (optional, default ALL)
 * - images: file[] (up to 6 images)
 * - captions: string[] (optional, caption for each image)
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
      visibility,
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
        error: 'All ratings are required (foodRating, ambienceRating, serviceRating)',
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

    // Content validation: must have at least 1 image OR description with min 50 characters
    const hasImages = files.length > 0;
    const descriptionLength = description ? description.trim().length : 0;
    const hasValidDescription = descriptionLength >= 50;

    if (!hasImages && !hasValidDescription) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Experience must have at least 1 image or a description with minimum 50 characters',
        details: {
          hasImages: false,
          descriptionLength,
          minDescriptionLength: 50,
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
          attributes: ['id', 'name', 'place', 'latitude', 'longitude'],
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
      ((parseFloat(foodRating) + parseFloat(ambienceRating) + parseFloat(serviceRating)) / 3).toFixed(1)
    );

    // Validate mealType
    const validMealTypes = ['breakfast', 'brunch', 'lunch', 'dinner', 'coffee', 'snack'];
    if (mealType && !validMealTypes.includes(mealType)) {
      await transaction.rollback();
      return res.status(400).json({
        error: `Invalid meal type. Must be one of: ${validMealTypes.join(', ')}`,
      });
    }

    // Validate visibility
    const validVisibilities = ['ALL', 'FOLLOWERS', 'BUDDIES'];
    const finalVisibility =
      visibility && validVisibilities.includes(visibility.toUpperCase())
        ? visibility.toUpperCase()
        : 'ALL';

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
        visibility: finalVisibility,
        cityCached: visit.restaurant?.place || null,
        publishedAt,
      },
      { transaction }
    );

    // Upload images and create ExperienceMedia records
    const mediaRecords = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const caption = captions[i] || null;

      // Upload image
      const folder = `experiences/${userId}`;
      const imageResult = await uploadImage(file, folder, {
        strategy: UPLOAD_STRATEGY.FULL,
        entityType: 'experience',
        entityId: experience.id,
        maxWidth: 1600,
        quality: 85,
        mimeType: file.mimetype,
      });

      // Create ExperienceMedia record
      const media = await ExperienceMedia.create(
        {
          experienceId: experience.id,
          kind: 'IMAGE',
          storageKey: imageResult.imageUrl,
          cdnUrl: imageResult.imageUrl,
          width: imageResult.width || null,
          height: imageResult.height || null,
          orderIndex: i,
          transcodingStatus: 'DONE',
          caption,
          thumbnails: imageResult.thumbnailUrl ? [{ cdnUrl: imageResult.thumbnailUrl }] : null,
        },
        { transaction }
      );

      mediaRecords.push({
        id: media.id,
        imageUrl: imageResult.imageUrl,
        thumbnailUrl: imageResult.thumbnailUrl,
        orderIndex: i,
        caption,
      });
    }

    await transaction.commit();

    // Update restaurant's Dinver rating (async, don't block response)
    if (visit.restaurantId && status === 'APPROVED') {
      updateRestaurantDinverRating(visit.restaurantId).catch((err) => {
        console.error('[Create Experience] Failed to update Dinver rating:', err.message);
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
          attributes: ['id', 'name', 'slug', 'place', 'address', 'thumbnailUrl', 'latitude', 'longitude', 'isClaimed'],
        },
        {
          model: ExperienceMedia,
          as: 'media',
          order: [['orderIndex', 'ASC']],
          include: [
            {
              model: MenuItem,
              as: 'menuItem',
              attributes: ['id', 'name'],
              required: false,
            },
          ],
        },
        {
          model: Visit,
          as: 'visit',
          attributes: ['id', 'status', 'visitDate'],
        },
      ],
    });

    if (!experience) {
      return res.status(404).json({
        error: 'Experience not found',
      });
    }

    // Check visibility - only show approved experiences to non-owners
    if (experience.status !== 'APPROVED' && experience.userId !== userId) {
      return res.status(404).json({
        error: 'Experience not found',
      });
    }

    // Check visibility settings
    if (experience.visibility !== 'ALL' && experience.userId !== userId) {
      if (experience.visibility === 'FOLLOWERS') {
        const follows = await UserFollow.findOne({
          where: {
            followerId: userId,
            followingId: experience.userId,
          },
        });
        if (!follows) {
          return res.status(403).json({
            error: 'This experience is only visible to followers',
          });
        }
      } else if (experience.visibility === 'BUDDIES') {
        const isBuddy = await Visit.findOne({
          where: {
            userId: experience.userId,
            taggedBuddies: { [Op.contains]: [userId] },
          },
        });
        if (!isBuddy) {
          return res.status(403).json({
            error: 'This experience is only visible to buddies',
          });
        }
      }
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
      attributes: ['id', 'name', 'slug', 'place', 'thumbnailUrl', 'latitude', 'longitude', 'isClaimed'],
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
          order: [['orderIndex', 'ASC']],
          limit: 1, // Only get first image for feed
        },
      ],
      order: [['publishedAt', 'DESC']], // Chronological (newest first)
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
        const dLat = ((exp.restaurant.latitude - parseFloat(lat)) * Math.PI) / 180;
        const dLon = ((exp.restaurant.longitude - parseFloat(lng)) * Math.PI) / 180;
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

    res.status(201).json({
      message: 'Liked',
      likesCount: experience.likesCount + 1,
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
    }

    res.status(200).json({
      message: 'Unliked',
      likesCount: experience ? Math.max(0, experience.likesCount - 1) : 0,
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
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'slug', 'place', 'isClaimed'],
        },
        {
          model: ExperienceMedia,
          as: 'media',
          order: [['orderIndex', 'ASC']],
          limit: 1,
        },
      ],
      order: [['createdAt', 'DESC']],
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
          model: ExperienceMedia,
          as: 'media',
          order: [['orderIndex', 'ASC']],
        },
      ],
      order: [['publishedAt', 'DESC']],
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
        experiences.reduce((sum, e) => sum + (parseFloat(e.foodRating) || 0), 0) / experiences.length;
      avgAmbience =
        experiences.reduce((sum, e) => sum + (parseFloat(e.ambienceRating) || 0), 0) / experiences.length;
      avgService =
        experiences.reduce((sum, e) => sum + (parseFloat(e.serviceRating) || 0), 0) / experiences.length;
      avgOverall =
        experiences.reduce((sum, e) => sum + (parseFloat(e.overallRating) || 0), 0) / experiences.length;
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
        console.error('[Delete Experience] Failed to update Dinver rating:', err.message);
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
