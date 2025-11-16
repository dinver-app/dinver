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
// NEW: Professional media processing with AWS MediaConvert
const {
  processImage,
  processVideo,
  checkVideoProcessingStatus,
} = require('../../services/experienceMediaProcessor');

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
 * Confirm media upload and start processing
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

    // Process media with professional service
    let processingResult;

    try {
      if (kind === 'IMAGE') {
        // Process image synchronously (fast, ~1-3 seconds)
        processingResult = await processImage(storageKey, null);

        if (!processingResult.success) {
          return res.status(500).json({
            error: 'Image processing failed: ' + processingResult.error,
          });
        }

        // Return variants immediately
        res.status(200).json({
          message: 'Image processed successfully',
          data: {
            storageKey,
            kind,
            variants: processingResult.variants,
            thumbnails: processingResult.thumbnails,
            width: processingResult.width,
            height: processingResult.height,
            processing: false,
          },
        });
      } else if (kind === 'VIDEO') {
        // Start video processing job (async, takes 3-10 minutes)
        processingResult = await processVideo(storageKey, null);

        if (!processingResult.success) {
          return res.status(500).json({
            error: 'Video processing failed: ' + processingResult.error,
          });
        }

        // Return job details - client should poll for completion
        res.status(200).json({
          message: 'Video processing started. Check status with jobId.',
          data: {
            storageKey,
            kind,
            jobId: processingResult.jobId,
            jobStatus: processingResult.jobStatus,
            processing: true,
            estimatedTime: '3-10 minutes',
          },
        });
      } else {
        return res.status(400).json({
          error: 'Invalid media kind',
        });
      }
    } catch (processingError) {
      console.error('Media processing error:', processingError);
      return res.status(500).json({
        error: 'Processing failed: ' + processingError.message,
      });
    }
  } catch (error) {
    console.error('Error confirming media upload:', error);
    res.status(500).json({
      error: error.message || 'Failed to confirm media upload',
    });
  }
};

/**
 * Check video processing status
 * GET /api/app/experiences/media/video-status/:jobId
 */
exports.checkVideoStatus = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        error: 'Job ID is required',
      });
    }

    const status = await checkVideoProcessingStatus(jobId);

    res.status(200).json({
      message: 'Video processing status',
      data: status,
    });
  } catch (error) {
    console.error('Error checking video status:', error);
    res.status(500).json({
      error: error.message || 'Failed to check video status',
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
        error:
          'You must have an approved receipt from this restaurant within the last 14 days to create an experience',
        details: {
          restaurantId,
          lastReceiptRequired: fourteenDaysAgo.toISOString(),
        },
      });
    }

    // Determine mediaKind based on media array
    const hasVideo = media.some((m) => m.kind === 'VIDEO');
    const mediaKind = hasVideo ? 'VIDEO' : 'CAROUSEL';

    // Validate media constraints
    if (mediaKind === 'VIDEO' && media.length !== 1) {
      return res.status(400).json({
        error: 'Video experiences must have exactly 1 media item',
      });
    }

    if (mediaKind === 'CAROUSEL' && (media.length < 1 || media.length > 10)) {
      return res.status(400).json({
        error: 'Carousel experiences must have 1-10 images',
      });
    }

    // Create Experience
    const experience = await Experience.create({
      userId,
      restaurantId,
      status: 'PENDING', // All experiences start as pending for moderation
      title,
      description: description || null,
      mediaKind,
      ratingAmbience: ratings?.ambience || null,
      ratingService: ratings?.service || null,
      ratingPrice: ratings?.price || null,
      cityCached: restaurant.place || null, // Cache city for filtering
    });

    // Create ExperienceMedia records
    const mediaRecords = await Promise.all(
      media.map((m, index) =>
        ExperienceMedia.create({
          experienceId: experience.id,
          kind: m.kind,
          storageKey: m.storageKey,
          cdnUrl: m.cdnUrl,
          width: m.width || null,
          height: m.height || null,
          bytes: m.bytes || null,
          orderIndex: index,
          transcodingStatus: m.processing ? 'PENDING' : 'DONE',
          thumbnails: m.thumbnails || null,
          videoFormats: m.videoFormats || null,
          durationSec: m.durationSec || null,
        }),
      ),
    );

    // Set cover media to first item
    await experience.update({
      coverMediaId: mediaRecords[0].id,
    });

    // Create engagement record
    await ExperienceEngagement.create({
      experienceId: experience.id,
    });

    // Add to moderation queue
    await ExperienceModerationQueue.create({
      experienceId: experience.id,
      priority: 1, // Normal priority
      slaHours: 24, // Must be reviewed within 24 hours
    });

    // Award points for creating experience
    const activeCycle = await LeaderboardCycle.findOne({
      where: {
        isActive: true,
      },
    });

    if (activeCycle) {
      await UserPointsHistory.create({
        userId,
        cycleId: activeCycle.id,
        points: 1.0, // 1 point for creating experience
        reason: 'experience_created',
        metadata: {
          experienceId: experience.id,
          restaurantId,
        },
      });
    }

    // Fetch complete experience with relations
    const completeExperience = await Experience.findByPk(experience.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'displayName', 'profileImageUrl'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'slug', 'place', 'thumbnailUrl'],
        },
        {
          model: ExperienceMedia,
          as: 'media',
        },
        {
          model: ExperienceEngagement,
          as: 'engagement',
        },
      ],
    });

    res.status(201).json({
      message: 'Experience created successfully. Pending moderation.',
      data: completeExperience,
    });
  } catch (error) {
    console.error('Error creating experience:', error);
    res.status(500).json({
      error: error.message || 'Failed to create experience',
    });
  }
};

/**
 * Delete Experience (user can delete within 14 days)
 * DELETE /api/app/experiences/:id
 */
exports.deleteExperience = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find the experience
    const experience = await Experience.findOne({
      where: { id, userId },
      include: [
        {
          model: ExperienceMedia,
          as: 'media',
        },
      ],
    });

    if (!experience) {
      return res.status(404).json({ error: 'Experience not found' });
    }

    // Check if experience is within 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    if (experience.createdAt < fourteenDaysAgo) {
      return res.status(403).json({
        error: 'Cannot delete experience older than 14 days',
        createdAt: experience.createdAt,
      });
    }

    // Delete Experience media from S3
    const { deleteFromS3 } = require('../../utils/s3Upload');
    for (const media of experience.media) {
      try {
        // Delete main storage key
        if (media.storageKey) {
          await deleteFromS3(media.storageKey);
          console.log(`Deleted experience media: ${media.storageKey}`);
        }

        // Delete thumbnails (if they have separate S3 keys)
        if (media.thumbnails && Array.isArray(media.thumbnails)) {
          for (const thumb of media.thumbnails) {
            if (thumb.storageKey) {
              await deleteFromS3(thumb.storageKey);
            }
          }
        }

        // Delete video formats (if they have separate S3 keys)
        if (media.videoFormats && typeof media.videoFormats === 'object') {
          for (const format of Object.values(media.videoFormats)) {
            if (format.storageKey) {
              await deleteFromS3(format.storageKey);
            }
          }
        }
      } catch (s3Error) {
        console.error(`Error deleting experience media from S3:`, s3Error.message);
      }
    }

    // Delete Experience record (CASCADE will delete ExperienceMedia, ExperienceLike, etc.)
    await Experience.destroy({ where: { id: experience.id } });

    res.status(200).json({
      message: 'Experience deleted successfully',
      deletedExperienceId: experience.id,
    });
  } catch (error) {
    console.error('Error deleting experience:', error);
    res.status(500).json({ error: 'Failed to delete experience' });
  }
};

// Export existing functions (not modified here, but need to be included)
// These would be the rest of your existing controller methods:
// exports.getExperience = ...
// exports.getExploreFeed = ...
// etc.
