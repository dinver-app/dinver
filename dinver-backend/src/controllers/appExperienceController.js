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
} = require('../../models');
const { Op } = require('sequelize');
const { uploadImage, UPLOAD_STRATEGY } = require('../../services/imageUploadService');

/**
 * Create Experience for a Visit
 * POST /api/app/experiences
 */
const createExperience = async (req, res) => {
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

    // Validation
    if (!visitId) {
      return res.status(400).json({
        error: 'Visit ID is required',
      });
    }

    // Ratings validation (1.0-10.0)
    if (!foodRating || !ambienceRating || !serviceRating) {
      return res.status(400).json({
        error: 'All ratings are required (foodRating, ambienceRating, serviceRating)',
      });
    }

    const ratings = [foodRating, ambienceRating, serviceRating];
    for (const rating of ratings) {
      if (rating < 1.0 || rating > 10.0) {
        return res.status(400).json({
          error: 'Ratings must be between 1.0 and 10.0',
        });
      }
    }

    // Find the Visit
    const visit = await Visit.findOne({
      where: {
        id: visitId,
        userId, // Must be owned by this user
      },
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'place'],
        },
        {
          model: Experience,
          as: 'experience',
        },
      ],
    });

    if (!visit) {
      return res.status(404).json({
        error: 'Visit not found',
      });
    }

    // Check if Visit already has an Experience
    if (visit.experience) {
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
      return res.status(400).json({
        error: `Invalid meal type. Must be one of: ${validMealTypes.join(', ')}`,
      });
    }

    // Validate visibility
    const validVisibilities = ['ALL', 'FOLLOWERS', 'BUDDIES'];
    const finalVisibility = visibility && validVisibilities.includes(visibility.toUpperCase())
      ? visibility.toUpperCase()
      : 'ALL';

    // Create Experience
    const experience = await Experience.create({
      userId,
      visitId,
      restaurantId: visit.restaurantId,
      status: 'DRAFT', // Start as DRAFT, will be PENDING/APPROVED after publish
      description: description || null,
      foodRating: parseFloat(foodRating),
      ambienceRating: parseFloat(ambienceRating),
      serviceRating: parseFloat(serviceRating),
      overallRating,
      partySize: partySize || 2,
      mealType: mealType || null,
      visibility: finalVisibility,
      cityCached: visit.restaurant?.place || null,
    });

    res.status(201).json({
      experienceId: experience.id,
      message: 'Experience created. Add images to complete.',
      overallRating,
    });
  } catch (error) {
    console.error('[Create Experience] Error:', error);
    res.status(500).json({
      error: 'Failed to create experience',
      details: error.message,
    });
  }
};

/**
 * Upload media for Experience
 * POST /api/app/experiences/:experienceId/media
 *
 * Handles image uploads with caption ("Što je na slici?")
 */
const uploadExperienceMedia = async (req, res) => {
  try {
    const userId = req.user.id;
    const { experienceId } = req.params;
    const { caption, menuItemId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        error: 'Image file is required',
      });
    }

    // Find the Experience
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

    // Check max 6 images
    if (experience.media && experience.media.length >= 6) {
      return res.status(400).json({
        error: 'Maximum 6 images allowed per experience',
      });
    }

    // Upload image using existing service
    const folder = `experiences/${userId}`;
    const imageResult = await uploadImage(file, folder, {
      strategy: UPLOAD_STRATEGY.FULL, // Use FULL for all variants
      entityType: 'experience',
      entityId: experienceId,
      maxWidth: 1600,
      quality: 85,
      mimeType: file.mimetype,
    });

    // Determine order index
    const orderIndex = experience.media ? experience.media.length : 0;

    // Validate menuItemId if provided
    let validMenuItemId = null;
    if (menuItemId) {
      const menuItem = await MenuItem.findByPk(menuItemId);
      if (menuItem) {
        validMenuItemId = menuItemId;
      }
    }

    // Create ExperienceMedia record
    const media = await ExperienceMedia.create({
      experienceId,
      kind: 'IMAGE',
      storageKey: imageResult.imageUrl,
      cdnUrl: imageResult.imageUrl,
      width: imageResult.width || null,
      height: imageResult.height || null,
      orderIndex,
      transcodingStatus: 'DONE',
      caption: caption || null,
      menuItemId: validMenuItemId,
      thumbnails: imageResult.thumbnailUrl
        ? [{ cdnUrl: imageResult.thumbnailUrl }]
        : null,
    });

    res.status(201).json({
      mediaId: media.id,
      imageUrl: imageResult.imageUrl,
      thumbnailUrl: imageResult.thumbnailUrl,
      orderIndex,
      message: 'Image uploaded successfully',
    });
  } catch (error) {
    console.error('[Upload Experience Media] Error:', error);
    res.status(500).json({
      error: 'Failed to upload image',
      details: error.message,
    });
  }
};

/**
 * Publish Experience (finalize and submit)
 * POST /api/app/experiences/:experienceId/publish
 *
 * Moves experience from DRAFT to PENDING status
 */
const publishExperience = async (req, res) => {
  try {
    const userId = req.user.id;
    const { experienceId } = req.params;

    // Find the Experience
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
        {
          model: Visit,
          as: 'visit',
        },
      ],
    });

    if (!experience) {
      return res.status(404).json({
        error: 'Experience not found',
      });
    }

    if (experience.status !== 'DRAFT') {
      return res.status(400).json({
        error: 'Experience is already published or pending',
        status: experience.status,
      });
    }

    // Experience can be published without images (images are optional)
    // But it needs ratings (which are set during creation)

    // Determine status based on Visit approval
    // If Visit is APPROVED, Experience can be published immediately
    // If Visit is still PENDING, Experience stays PENDING until Visit is approved
    const newStatus = experience.visit?.status === 'APPROVED' ? 'APPROVED' : 'PENDING';
    const publishedAt = newStatus === 'APPROVED' ? new Date() : null;

    await experience.update({
      status: newStatus,
      publishedAt,
    });

    res.status(200).json({
      message:
        newStatus === 'APPROVED'
          ? 'Experience published successfully!'
          : 'Experience saved! Will be visible once receipt is approved.',
      status: newStatus,
      experienceId: experience.id,
    });
  } catch (error) {
    console.error('[Publish Experience] Error:', error);
    res.status(500).json({
      error: 'Failed to publish experience',
      details: error.message,
    });
  }
};

/**
 * Update Experience (while still in DRAFT)
 * PUT /api/app/experiences/:experienceId
 */
const updateExperience = async (req, res) => {
  try {
    const userId = req.user.id;
    const { experienceId } = req.params;
    const {
      foodRating,
      ambienceRating,
      serviceRating,
      description,
      partySize,
      mealType,
      visibility,
    } = req.body;

    // Find the Experience
    const experience = await Experience.findOne({
      where: {
        id: experienceId,
        userId,
      },
    });

    if (!experience) {
      return res.status(404).json({
        error: 'Experience not found',
      });
    }

    // Only allow updates while in DRAFT status
    if (experience.status !== 'DRAFT') {
      return res.status(400).json({
        error: 'Cannot update experience after publishing',
        status: experience.status,
      });
    }

    // Build update object
    const updates = {};

    if (foodRating !== undefined) {
      if (foodRating < 1.0 || foodRating > 10.0) {
        return res.status(400).json({ error: 'Food rating must be between 1.0 and 10.0' });
      }
      updates.foodRating = parseFloat(foodRating);
    }

    if (ambienceRating !== undefined) {
      if (ambienceRating < 1.0 || ambienceRating > 10.0) {
        return res.status(400).json({ error: 'Ambience rating must be between 1.0 and 10.0' });
      }
      updates.ambienceRating = parseFloat(ambienceRating);
    }

    if (serviceRating !== undefined) {
      if (serviceRating < 1.0 || serviceRating > 10.0) {
        return res.status(400).json({ error: 'Service rating must be between 1.0 and 10.0' });
      }
      updates.serviceRating = parseFloat(serviceRating);
    }

    // Recalculate overall if any rating changed
    if (updates.foodRating || updates.ambienceRating || updates.serviceRating) {
      const newFood = updates.foodRating || experience.foodRating;
      const newAmbience = updates.ambienceRating || experience.ambienceRating;
      const newService = updates.serviceRating || experience.serviceRating;
      updates.overallRating = parseFloat(
        ((parseFloat(newFood) + parseFloat(newAmbience) + parseFloat(newService)) / 3).toFixed(1)
      );
    }

    if (description !== undefined) {
      updates.description = description;
    }

    if (partySize !== undefined) {
      updates.partySize = parseInt(partySize);
    }

    if (mealType !== undefined) {
      const validMealTypes = ['breakfast', 'brunch', 'lunch', 'dinner', 'coffee', 'snack'];
      if (mealType && !validMealTypes.includes(mealType)) {
        return res.status(400).json({
          error: `Invalid meal type. Must be one of: ${validMealTypes.join(', ')}`,
        });
      }
      updates.mealType = mealType;
    }

    if (visibility !== undefined) {
      const validVisibilities = ['ALL', 'FOLLOWERS', 'BUDDIES'];
      if (!validVisibilities.includes(visibility.toUpperCase())) {
        return res.status(400).json({
          error: `Invalid visibility. Must be one of: ${validVisibilities.join(', ')}`,
        });
      }
      updates.visibility = visibility.toUpperCase();
    }

    await experience.update(updates);

    res.status(200).json({
      message: 'Experience updated',
      experienceId: experience.id,
    });
  } catch (error) {
    console.error('[Update Experience] Error:', error);
    res.status(500).json({
      error: 'Failed to update experience',
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
          attributes: ['id', 'name', 'slug', 'place', 'address', 'thumbnailUrl'],
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

    // Check visibility
    if (experience.status !== 'APPROVED' && experience.userId !== userId) {
      return res.status(404).json({
        error: 'Experience not found',
      });
    }

    // Check visibility settings
    if (experience.visibility !== 'ALL' && experience.userId !== userId) {
      if (experience.visibility === 'FOLLOWERS') {
        // Check if user follows the author
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
        // Check if user is in author's buddies (tagged in visits)
        const { Visit: VisitModel } = require('../../models');
        const isBuddy = await VisitModel.findOne({
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
 * Get Experience Feed
 * GET /api/app/experiences/feed
 *
 * Chronological feed of approved experiences
 */
const getExperienceFeed = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const { limit = 20, offset = 0, city, mealType } = req.query;

    // Build where clause
    const where = {
      status: 'APPROVED',
    };

    // Filter by city if provided
    if (city) {
      where.cityCached = city;
    }

    // Filter by meal type if provided
    if (mealType) {
      where.mealType = mealType;
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
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'slug', 'place', 'thumbnailUrl'],
        },
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

    if (userId) {
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

    // Add hasLiked to each experience
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
          attributes: ['id', 'name', 'slug', 'place'],
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

    res.status(200).json({
      experiences,
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
    if (userId) {
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
        experiences.reduce((sum, e) => sum + (parseFloat(e.foodRating) || 0), 0) /
        experiences.length;
      avgAmbience =
        experiences.reduce((sum, e) => sum + (parseFloat(e.ambienceRating) || 0), 0) /
        experiences.length;
      avgService =
        experiences.reduce((sum, e) => sum + (parseFloat(e.serviceRating) || 0), 0) /
        experiences.length;
      avgOverall =
        experiences.reduce((sum, e) => sum + (parseFloat(e.overallRating) || 0), 0) /
        experiences.length;
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
 * Delete Experience Media
 * DELETE /api/app/experiences/:experienceId/media/:mediaId
 */
const deleteExperienceMedia = async (req, res) => {
  try {
    const userId = req.user.id;
    const { experienceId, mediaId } = req.params;

    // Find experience
    const experience = await Experience.findOne({
      where: {
        id: experienceId,
        userId,
      },
    });

    if (!experience) {
      return res.status(404).json({
        error: 'Experience not found',
      });
    }

    // Only allow deletion in DRAFT status
    if (experience.status !== 'DRAFT') {
      return res.status(400).json({
        error: 'Cannot delete media after publishing',
      });
    }

    // Find and delete media
    const media = await ExperienceMedia.findOne({
      where: {
        id: mediaId,
        experienceId,
      },
    });

    if (!media) {
      return res.status(404).json({
        error: 'Media not found',
      });
    }

    // Delete from S3
    const { deleteFromS3 } = require('../../utils/s3Upload');
    if (media.storageKey) {
      try {
        await deleteFromS3(media.storageKey);
      } catch (s3Error) {
        console.error('[Delete Experience Media] S3 error:', s3Error.message);
      }
    }

    // Delete record
    await media.destroy();

    // Reorder remaining media
    const remainingMedia = await ExperienceMedia.findAll({
      where: { experienceId },
      order: [['orderIndex', 'ASC']],
    });

    for (let i = 0; i < remainingMedia.length; i++) {
      await remainingMedia[i].update({ orderIndex: i });
    }

    res.status(200).json({
      message: 'Media deleted',
    });
  } catch (error) {
    console.error('[Delete Experience Media] Error:', error);
    res.status(500).json({
      error: 'Failed to delete media',
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

module.exports = {
  createExperience,
  uploadExperienceMedia,
  publishExperience,
  updateExperience,
  getExperience,
  getExperienceFeed,
  likeExperience,
  unlikeExperience,
  getUserExperiences,
  getRestaurantExperiences,
  deleteExperienceMedia,
  shareExperience,
};
