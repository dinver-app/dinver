const {
  Experience,
  ExperienceMedia,
  ExperienceLike,
  ExperienceSave,
  ExperienceView,
  ExperienceEngagement,
  ExperienceModerationQueue,
  User,
  Restaurant,
  LeaderboardCycle,
  UserPointsHistory,
} = require('../../models');
const { Op } = require('sequelize');
const {
  generatePresignedUploadUrl,
  verifyFileExists,
} = require('../../utils/experienceMediaUpload');
const { processMedia } = require('../../services/mediaTranscodingService');

/**
 * Request pre-signed URL for media upload
 * POST /api/app/experiences/media/presign
 */
exports.requestMediaPresignedUrl = async (req, res) => {
  try {
    const userId = req.user.id;
    const { kind, mimeType, bytes, checksum } = req.body;

    // Validation
    if (!kind || !mimeType || !bytes) {
      return res.status(400).json({
        error: 'Missing required fields: kind, mimeType, bytes',
      });
    }

    const result = await generatePresignedUploadUrl({
      userId,
      kind,
      mimeType,
      bytes,
      checksum,
    });

    res.status(200).json({
      message: 'Pre-signed URL generated successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate pre-signed URL',
    });
  }
};

/**
 * Confirm media upload and enqueue transcoding
 * POST /api/app/experiences/media/confirm
 */
exports.confirmMediaUpload = async (req, res) => {
  try {
    const userId = req.user.id;
    const { storageKey, kind } = req.body;

    if (!storageKey || !kind) {
      return res.status(400).json({
        error: 'Missing required fields: storageKey, kind',
      });
    }

    // Verify file exists in S3
    const fileInfo = await verifyFileExists(storageKey);
    if (!fileInfo.exists) {
      return res.status(404).json({
        error: 'File not found in storage',
      });
    }

    // Note: In production, this would enqueue a background job
    // For now, we'll process synchronously (not recommended for large files)
    try {
      await processMedia(storageKey, kind);
    } catch (processingError) {
      console.error('Media processing error:', processingError);
      // Continue anyway - we'll mark it as failed in the media record
    }

    res.status(200).json({
      message: 'Media upload confirmed. Processing started.',
      data: {
        storageKey,
        kind,
      },
    });
  } catch (error) {
    console.error('Error confirming media upload:', error);
    res.status(500).json({
      error: error.message || 'Failed to confirm media upload',
    });
  }
};

/**
 * Create a new Experience
 * POST /api/app/experiences
 */
exports.createExperience = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      restaurantId,
      title,
      description,
      ratings,
      media,
      musicTrackId,
    } = req.body;

    // Validation
    if (!restaurantId || !title || !media || media.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: restaurantId, title, media',
      });
    }

    // Verify restaurant exists and is a partner
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        error: 'Restaurant not found',
      });
    }

    // KRITIČNO: Provjeri da korisnik ima approved račun u ovom restoranu u zadnjih 14 dana
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { Receipt } = require('../../models');
    const validReceipt = await Receipt.findOne({
      where: {
        userId,
        restaurantId,
        status: {
          [Op.in]: ['approved', 'auto_approved'], // Oba statusa su validna
        },
        createdAt: {
          [Op.gte]: fourteenDaysAgo,
        },
      },
      order: [['createdAt', 'DESC']],
    });

    if (!validReceipt) {
      return res.status(403).json({
        error: 'Ne možete objaviti experience u ovom restoranu. Potreban je odobren račun iz zadnjih 14 dana.',
        errorCode: 'NO_VALID_RECEIPT',
      });
    }

    // Determine media kind
    const mediaKind = media.length === 1 && media[0].kind === 'VIDEO' ? 'VIDEO' : 'CAROUSEL';

    // Validate media constraints
    if (mediaKind === 'VIDEO' && media.length > 1) {
      return res.status(400).json({
        error: 'Video experiences can only have one media item',
      });
    }

    if (mediaKind === 'CAROUSEL' && media.length > 10) {
      return res.status(400).json({
        error: 'Carousel experiences can have maximum 10 images',
      });
    }

    // Create experience
    const experience = await Experience.create({
      userId,
      restaurantId,
      status: 'PENDING',
      title,
      description,
      ratingAmbience: ratings?.ambience,
      ratingService: ratings?.service,
      ratingPrice: ratings?.price,
      mediaKind,
      cityCached: restaurant.place || null,
      musicTrackId,
    });

    // Create media records
    const mediaRecords = await Promise.all(
      media.map(async (item, index) => {
        const fileInfo = await verifyFileExists(item.storageKey);
        if (!fileInfo.exists) {
          throw new Error(`Media file not found: ${item.storageKey}`);
        }

        return ExperienceMedia.create({
          experienceId: experience.id,
          kind: item.kind,
          storageKey: item.storageKey,
          orderIndex: item.orderIndex !== undefined ? item.orderIndex : index,
          bytes: fileInfo.size,
          mimeType: fileInfo.mimeType,
          transcodingStatus: 'PENDING',
        });
      }),
    );

    // Set cover media (first media item)
    if (mediaRecords.length > 0) {
      await experience.update({
        coverMediaId: mediaRecords[0].id,
      });
    }

    // Create engagement record
    await ExperienceEngagement.create({
      experienceId: experience.id,
    });

    // Add to moderation queue
    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + 24);

    await ExperienceModerationQueue.create({
      experienceId: experience.id,
      state: 'PENDING',
      priority: 'NORMAL',
      slaDeadline,
    });

    // Enqueue background jobs for media processing
    // Note: In production, use a proper queue system (Bull, BullMQ, etc.)
    mediaRecords.forEach((mediaRecord) => {
      // Enqueue transcoding job
      processMedia(mediaRecord.storageKey, mediaRecord.kind)
        .then(() => {
          mediaRecord.update({ transcodingStatus: 'DONE' });
        })
        .catch((error) => {
          console.error('Transcoding error:', error);
          mediaRecord.update({
            transcodingStatus: 'FAILED',
            transcodingError: error.message,
          });
        });
    });

    // Load full experience with associations
    const fullExperience = await Experience.findByPk(experience.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'profileImage'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address', 'latitude', 'longitude', 'photos'],
        },
        {
          model: ExperienceMedia,
          as: 'media',
          order: [['orderIndex', 'ASC']],
        },
      ],
    });

    res.status(201).json({
      message: 'Experience created successfully and submitted for moderation',
      data: fullExperience,
    });
  } catch (error) {
    console.error('Error creating experience:', error);
    res.status(500).json({
      error: error.message || 'Failed to create experience',
    });
  }
};

/**
 * Get a single Experience by ID
 * GET /api/app/experiences/:id
 */
exports.getExperience = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const experience = await Experience.findByPk(id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'profileImage', 'bio'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: [
            'id',
            'name',
            'address',
            'place',
            'latitude',
            'longitude',
            'photos',
            'rating',
            'phone',
          ],
        },
        {
          model: ExperienceMedia,
          as: 'media',
          order: [['orderIndex', 'ASC']],
        },
        {
          model: ExperienceEngagement,
          as: 'engagement',
        },
      ],
    });

    if (!experience) {
      return res.status(404).json({
        error: 'Experience not found',
      });
    }

    // Only show APPROVED experiences to non-authors
    if (experience.status !== 'APPROVED' && experience.userId !== userId) {
      return res.status(404).json({
        error: 'Experience not found',
      });
    }

    // Get active cycle
    const activeCycle = await LeaderboardCycle.findOne({
      where: { isActive: true },
    });

    // Check if current user has liked/saved
    let hasLiked = false;
    let hasSaved = false;

    if (userId && activeCycle) {
      hasLiked = await experience.hasUserLiked(userId, activeCycle.id);
      hasSaved = await experience.hasUserSaved(userId);
    }

    res.status(200).json({
      message: 'Experience retrieved successfully',
      data: {
        ...experience.toJSON(),
        currentUserHasLiked: hasLiked,
        currentUserHasSaved: hasSaved,
      },
    });
  } catch (error) {
    console.error('Error getting experience:', error);
    res.status(500).json({
      error: error.message || 'Failed to get experience',
    });
  }
};

/**
 * Get Explore feed (NEW or TRENDING)
 * GET /api/app/experiences/explore?city=Zagreb&sort=NEW|TRENDING&page=1&limit=20
 */
exports.getExploreFeed = async (req, res) => {
  try {
    const { city, sort = 'NEW', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {
      status: 'APPROVED',
    };

    if (city) {
      whereClause.cityCached = city;
    }

    let orderClause;
    if (sort === 'TRENDING') {
      orderClause = [
        ['engagementScore', 'DESC'],
        ['createdAt', 'DESC'],
      ];
    } else {
      // NEW
      orderClause = [['createdAt', 'DESC']];
    }

    const { rows: experiences, count } = await Experience.findAndCountAll({
      where: whereClause,
      order: orderClause,
      limit: parseInt(limit),
      offset,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'profileImage'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address', 'place', 'latitude', 'longitude'],
        },
        {
          model: ExperienceMedia,
          as: 'media',
          where: { orderIndex: 0 }, // Only get cover media for feed
          required: false,
        },
        {
          model: ExperienceEngagement,
          as: 'engagement',
        },
      ],
    });

    res.status(200).json({
      message: 'Explore feed retrieved successfully',
      data: {
        experiences,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Error getting explore feed:', error);
    res.status(500).json({
      error: error.message || 'Failed to get explore feed',
    });
  }
};

/**
 * Get user's experiences (profile grid)
 * GET /api/app/users/:userId/experiences
 */
exports.getUserExperiences = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows: experiences, count } = await Experience.findAndCountAll({
      where: {
        userId,
        status: 'APPROVED',
      },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
      include: [
        {
          model: ExperienceMedia,
          as: 'media',
          where: { orderIndex: 0 },
          required: false,
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name'],
        },
        {
          model: ExperienceEngagement,
          as: 'engagement',
          attributes: ['likesCount', 'viewsCount'],
        },
      ],
    });

    res.status(200).json({
      message: 'User experiences retrieved successfully',
      data: {
        experiences,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Error getting user experiences:', error);
    res.status(500).json({
      error: error.message || 'Failed to get user experiences',
    });
  }
};

/**
 * Like an Experience
 * POST /api/app/experiences/:id/like
 */
exports.likeExperience = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const deviceId = req.body.deviceId || req.headers['x-device-id'];
    const ipAddress = req.ip || req.headers['x-forwarded-for'];

    // Get experience
    const experience = await Experience.findByPk(id);
    if (!experience) {
      return res.status(404).json({ error: 'Experience not found' });
    }

    if (experience.status !== 'APPROVED') {
      return res.status(400).json({
        error: 'Cannot like an experience that is not approved',
      });
    }

    // Get active cycle
    const activeCycle = await LeaderboardCycle.findOne({
      where: { isActive: true },
    });

    if (!activeCycle) {
      return res.status(400).json({ error: 'No active leaderboard cycle' });
    }

    // Check if already liked in this cycle
    const existingLike = await ExperienceLike.findOne({
      where: {
        experienceId: id,
        userId,
        cycleId: activeCycle.id,
      },
    });

    if (existingLike) {
      return res.status(200).json({
        message: 'Experience already liked',
        data: { liked: true },
      });
    }

    // Create like
    await ExperienceLike.create({
      experienceId: id,
      userId,
      cycleId: activeCycle.id,
      deviceId,
      ipAddress,
    });

    // Update engagement counts
    await ExperienceEngagement.increment('likesCount', {
      where: { experienceId: id },
    });
    await ExperienceEngagement.increment('likes24h', {
      where: { experienceId: id },
    });
    await experience.increment('likesCount');

    // Award points to experience author (if not self-like)
    if (experience.userId !== userId) {
      const POINTS_PER_LIKE = 0.05;

      await UserPointsHistory.create({
        userId: experience.userId,
        actionType: 'EXPERIENCE_LIKE',
        pointsEarned: POINTS_PER_LIKE,
        experienceId: id,
        description: `Like on experience "${experience.title}"`,
      });

      // Update user total points
      const { UserPoints } = require('../../models');
      const userPoints = await UserPoints.findOne({
        where: { userId: experience.userId },
      });

      if (userPoints) {
        await userPoints.increment('totalPoints', { by: POINTS_PER_LIKE });
      } else {
        await UserPoints.create({
          userId: experience.userId,
          totalPoints: POINTS_PER_LIKE,
        });
      }
    }

    res.status(200).json({
      message: 'Experience liked successfully',
      data: { liked: true },
    });
  } catch (error) {
    console.error('Error liking experience:', error);
    res.status(500).json({
      error: error.message || 'Failed to like experience',
    });
  }
};

/**
 * Unlike an Experience
 * DELETE /api/app/experiences/:id/like
 */
exports.unlikeExperience = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get active cycle
    const activeCycle = await LeaderboardCycle.findOne({
      where: { isActive: true },
    });

    if (!activeCycle) {
      return res.status(400).json({ error: 'No active leaderboard cycle' });
    }

    // Find and delete like
    const like = await ExperienceLike.findOne({
      where: {
        experienceId: id,
        userId,
        cycleId: activeCycle.id,
      },
    });

    if (!like) {
      return res.status(404).json({
        error: 'Like not found',
      });
    }

    await like.destroy();

    // Update engagement counts
    await ExperienceEngagement.decrement('likesCount', {
      where: { experienceId: id },
    });

    const experience = await Experience.findByPk(id);
    await experience.decrement('likesCount');

    res.status(200).json({
      message: 'Experience unliked successfully',
      data: { liked: false },
    });
  } catch (error) {
    console.error('Error unliking experience:', error);
    res.status(500).json({
      error: error.message || 'Failed to unlike experience',
    });
  }
};

/**
 * Save an Experience (saves restaurant to My Map)
 * POST /api/app/experiences/:id/save
 */
exports.saveExperience = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const deviceId = req.body.deviceId || req.headers['x-device-id'];
    const ipAddress = req.ip || req.headers['x-forwarded-for'];

    // Get experience
    const experience = await Experience.findByPk(id);
    if (!experience) {
      return res.status(404).json({ error: 'Experience not found' });
    }

    if (experience.status !== 'APPROVED') {
      return res.status(400).json({
        error: 'Cannot save an experience that is not approved',
      });
    }

    // Get active cycle
    const activeCycle = await LeaderboardCycle.findOne({
      where: { isActive: true },
    });

    if (!activeCycle) {
      return res.status(400).json({ error: 'No active leaderboard cycle' });
    }

    // Check if already saved
    const existingSave = await ExperienceSave.findOne({
      where: {
        userId,
        restaurantId: experience.restaurantId,
      },
    });

    if (existingSave) {
      return res.status(200).json({
        message: 'Restaurant already saved',
        data: { saved: true },
      });
    }

    // Create save
    await ExperienceSave.create({
      experienceId: id,
      userId,
      restaurantId: experience.restaurantId,
      cycleId: activeCycle.id,
      deviceId,
      ipAddress,
    });

    // Update engagement counts
    await ExperienceEngagement.increment('savesCount', {
      where: { experienceId: id },
    });
    await ExperienceEngagement.increment('saves24h', {
      where: { experienceId: id },
    });
    await experience.increment('savesCount');

    // Award points to experience author (if not self-save)
    if (experience.userId !== userId) {
      const POINTS_PER_SAVE = 0.05;

      await UserPointsHistory.create({
        userId: experience.userId,
        actionType: 'EXPERIENCE_SAVE',
        pointsEarned: POINTS_PER_SAVE,
        experienceId: id,
        description: `Save on experience "${experience.title}"`,
      });

      // Update user total points
      const { UserPoints } = require('../../models');
      const userPoints = await UserPoints.findOne({
        where: { userId: experience.userId },
      });

      if (userPoints) {
        await userPoints.increment('totalPoints', { by: POINTS_PER_SAVE });
      } else {
        await UserPoints.create({
          userId: experience.userId,
          totalPoints: POINTS_PER_SAVE,
        });
      }
    }

    res.status(200).json({
      message: 'Experience saved successfully',
      data: { saved: true },
    });
  } catch (error) {
    console.error('Error saving experience:', error);
    res.status(500).json({
      error: error.message || 'Failed to save experience',
    });
  }
};

/**
 * Unsave an Experience
 * DELETE /api/app/experiences/:id/save
 */
exports.unsaveExperience = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get experience
    const experience = await Experience.findByPk(id);
    if (!experience) {
      return res.status(404).json({ error: 'Experience not found' });
    }

    // Find and delete save
    const save = await ExperienceSave.findOne({
      where: {
        userId,
        restaurantId: experience.restaurantId,
      },
    });

    if (!save) {
      return res.status(404).json({
        error: 'Save not found',
      });
    }

    await save.destroy();

    // Update engagement counts
    await ExperienceEngagement.decrement('savesCount', {
      where: { experienceId: id },
    });
    await experience.decrement('savesCount');

    res.status(200).json({
      message: 'Experience unsaved successfully',
      data: { saved: false },
    });
  } catch (error) {
    console.error('Error unsaving experience:', error);
    res.status(500).json({
      error: error.message || 'Failed to unsave experience',
    });
  }
};

/**
 * Track a view on an Experience
 * POST /api/app/experiences/:id/view
 */
exports.trackView = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const {
      durationMs,
      completionRate,
      source,
      sessionId,
    } = req.body;

    const deviceId = req.headers['x-device-id'];
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    // Get experience
    const experience = await Experience.findByPk(id);
    if (!experience || experience.status !== 'APPROVED') {
      return res.status(404).json({ error: 'Experience not found' });
    }

    // Create view record
    await ExperienceView.create({
      experienceId: id,
      userId,
      durationMs,
      completionRate,
      source,
      deviceId,
      ipAddress,
      userAgent,
      sessionId,
    });

    // Update engagement counts
    await ExperienceEngagement.increment('viewsCount', {
      where: { experienceId: id },
    });
    await ExperienceEngagement.increment('views24h', {
      where: { experienceId: id },
    });
    await experience.increment('viewsCount');

    // Update unique views count if this is first view by this user
    if (userId) {
      const viewCount = await ExperienceView.count({
        where: {
          experienceId: id,
          userId,
        },
      });

      if (viewCount === 1) {
        await ExperienceEngagement.increment('uniqueViewsCount', {
          where: { experienceId: id },
        });
      }
    }

    res.status(200).json({
      message: 'View tracked successfully',
    });
  } catch (error) {
    console.error('Error tracking view:', error);
    res.status(500).json({
      error: error.message || 'Failed to track view',
    });
  }
};

/**
 * Get My Map (saved restaurants from experiences)
 * GET /api/app/experiences/my-map
 */
exports.getMyMap = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows: saves, count } = await ExperienceSave.findAndCountAll({
      where: { userId },
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: [
            'id',
            'name',
            'address',
            'place',
            'latitude',
            'longitude',
            'photos',
            'rating',
            'phone',
          ],
        },
        {
          model: Experience,
          as: 'experience',
          attributes: ['id', 'title'],
          include: [
            {
              model: ExperienceMedia,
              as: 'media',
              where: { orderIndex: 0 },
              required: false,
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    // Format response
    const savedRestaurants = saves.map((save) => ({
      restaurant: save.restaurant,
      lastSavedAt: save.createdAt,
      savedFrom: {
        experienceId: save.experience.id,
        experienceTitle: save.experience.title,
        coverImage: save.experience.media[0]?.cdnUrl,
      },
    }));

    res.status(200).json({
      message: 'My Map retrieved successfully',
      data: {
        savedRestaurants,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Error getting My Map:', error);
    res.status(500).json({
      error: error.message || 'Failed to get My Map',
    });
  }
};

/**
 * Get user's liked experiences
 * GET /api/app/experiences/my-likes
 */
exports.getMyLikes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows: likes, count } = await ExperienceLike.findAndCountAll({
      where: { userId },
      include: [
        {
          model: Experience,
          as: 'experience',
          where: { status: 'APPROVED' },
          include: [
            {
              model: User,
              as: 'author',
              attributes: ['id', 'firstName', 'lastName', 'profileImage'],
            },
            {
              model: Restaurant,
              as: 'restaurant',
              attributes: ['id', 'name', 'place'],
            },
            {
              model: ExperienceMedia,
              as: 'media',
              where: { orderIndex: 0 },
              required: false,
            },
            {
              model: ExperienceEngagement,
              as: 'engagement',
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
      distinct: true,
    });

    const experiences = likes.map((like) => like.experience);

    res.status(200).json({
      message: 'Liked experiences retrieved successfully',
      data: {
        experiences,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Error getting liked experiences:', error);
    res.status(500).json({
      error: error.message || 'Failed to get liked experiences',
    });
  }
};

module.exports = exports;
