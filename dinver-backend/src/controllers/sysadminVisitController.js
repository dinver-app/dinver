const {
  Visit,
  Restaurant,
  User,
  Receipt,
  Experience,
  ExperienceMedia,
} = require('../../models');
const { Op } = require('sequelize');
const { getMediaUrl } = require('../../config/cdn');
const { deleteImageVariants, deleteFromS3 } = require('../../utils/s3Upload');

/**
 * Get all visits with filters (sysadmin)
 * GET /api/sysadmin/visits
 */
exports.getAllVisits = async (req, res) => {
  try {
    const { status, restaurantId, userId, page = 1, limit = 20 } = req.query;

    const whereClause = {};
    if (status) whereClause.status = status;
    if (restaurantId) whereClause.restaurantId = restaurantId;
    if (userId) whereClause.userId = userId;

    const offset = (page - 1) * limit;

    const { count, rows: visits } = await Visit.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email', 'phone', 'profileImage'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'place', 'address', 'thumbnailUrl'],
        },
        {
          model: Receipt,
          as: 'receipt',
          attributes: [
            'id',
            'status',
            'thumbnailUrl',
            'mediumUrl',
            'fullscreenUrl',
            'originalUrl',
            'totalAmount',
            'issueDate',
            'issueTime',
            'jir',
            'zki',
            'oib',
          ],
        },
        {
          model: Experience,
          as: 'experience',
          attributes: ['id', 'status', 'title'],
        },
      ],
      order: [['submittedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const visitsWithUrls = visits.map((visit) => ({
      ...visit.get(),
      receiptImageUrl: visit.receiptImageUrl
        ? getMediaUrl(visit.receiptImageUrl, 'image')
        : null,
      receipt: visit.receipt
        ? {
            ...visit.receipt.get(),
            thumbnailUrl: visit.receipt.thumbnailUrl
              ? getMediaUrl(visit.receipt.thumbnailUrl, 'image', 'original')
              : null,
            mediumUrl: visit.receipt.mediumUrl
              ? getMediaUrl(visit.receipt.mediumUrl, 'image', 'original')
              : null,
            fullscreenUrl: visit.receipt.fullscreenUrl
              ? getMediaUrl(visit.receipt.fullscreenUrl, 'image', 'original')
              : null,
            originalUrl: visit.receipt.originalUrl
              ? getMediaUrl(visit.receipt.originalUrl, 'image', 'original')
              : null,
          }
        : null,
      restaurant: visit.restaurant
        ? {
            ...visit.restaurant.get(),
            thumbnailUrl: visit.restaurant.thumbnailUrl
              ? getMediaUrl(visit.restaurant.thumbnailUrl, 'image')
              : null,
          }
        : null,
    }));

    res.status(200).json({
      visits: visitsWithUrls,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching visits:', error);
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
};

/**
 * Get single visit details (sysadmin)
 * GET /api/sysadmin/visits/:id
 */
exports.getVisitById = async (req, res) => {
  try {
    const { id } = req.params;

    const visit = await Visit.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: [
            'id',
            'username',
            'firstName',
            'lastName',
            'email',
            'phone',
            'profileImage',
          ],
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
            'rating',
            'priceLevel',
          ],
        },
        {
          model: Receipt,
          as: 'receipt',
        },
        {
          model: Experience,
          as: 'experience',
          include: [
            {
              model: ExperienceMedia,
              as: 'media',
            },
          ],
        },
      ],
    });

    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    const response = {
      ...visit.get(),
      receiptImageUrl: visit.receiptImageUrl
        ? getMediaUrl(visit.receiptImageUrl, 'image')
        : null,
      user: visit.user
        ? {
            ...visit.user.get(),
            profileImage: visit.user.profileImage
              ? getMediaUrl(visit.user.profileImage, 'image')
              : null,
          }
        : null,
      restaurant: visit.restaurant
        ? {
            ...visit.restaurant.get(),
            thumbnailUrl: visit.restaurant.thumbnailUrl
              ? getMediaUrl(visit.restaurant.thumbnailUrl, 'image')
              : null,
          }
        : null,
      receipt: visit.receipt
        ? {
            ...visit.receipt.get(),
            thumbnailUrl: visit.receipt.thumbnailUrl
              ? getMediaUrl(visit.receipt.thumbnailUrl, 'image', 'original')
              : null,
            mediumUrl: visit.receipt.mediumUrl
              ? getMediaUrl(visit.receipt.mediumUrl, 'image', 'original')
              : null,
            fullscreenUrl: visit.receipt.fullscreenUrl
              ? getMediaUrl(visit.receipt.fullscreenUrl, 'image', 'original')
              : null,
            originalUrl: visit.receipt.originalUrl
              ? getMediaUrl(visit.receipt.originalUrl, 'image', 'original')
              : null,
          }
        : null,
      experience: visit.experience
        ? {
            ...visit.experience.get(),
            media: visit.experience.media.map((m) => ({
              ...m.get(),
              cdnUrl: m.cdnUrl ? getMediaUrl(m.cdnUrl, 'image') : null,
            })),
          }
        : null,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching visit:', error);
    res.status(500).json({ error: 'Failed to fetch visit' });
  }
};

/**
 * Update receipt data (OCR fields)
 * PUT /api/sysadmin/receipts/:id
 */
exports.updateReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      totalAmount,
      issueDate,
      issueTime,
      jir,
      zki,
      oib,
      merchantName,
      merchantAddress,
    } = req.body;

    const receipt = await Receipt.findByPk(id);
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    await receipt.update({
      totalAmount,
      issueDate,
      issueTime,
      jir,
      zki,
      oib,
      merchantName,
      merchantAddress,
    });

    res.status(200).json({
      message: 'Receipt updated successfully',
      receipt: receipt.get(),
    });
  } catch (error) {
    console.error('Error updating receipt:', error);
    res.status(500).json({ error: 'Failed to update receipt' });
  }
};

/**
 * Approve visit (sysadmin)
 * POST /api/sysadmin/visits/:id/approve
 */
exports.approveVisit = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const visit = await Visit.findByPk(id, {
      include: [{ model: Receipt, as: 'receipt' }],
    });

    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    if (visit.status === 'APPROVED') {
      return res.status(400).json({ error: 'Visit is already approved' });
    }

    // Check if receipt has all required data
    if (!visit.receipt || !visit.receipt.hasRequiredDataForApproval()) {
      return res.status(400).json({
        error: 'Receipt is missing required data for approval',
        missingFields: {
          restaurantId: !visit.receipt?.restaurantId,
          totalAmount: !visit.receipt?.totalAmount,
          jir: !visit.receipt?.jir,
          zki: !visit.receipt?.zki,
          oib: !visit.receipt?.oib,
          issueDate: !visit.receipt?.issueDate,
          issueTime: !visit.receipt?.issueTime,
        },
      });
    }

    // Update Visit status
    await visit.update({
      status: 'APPROVED',
      reviewedAt: new Date(),
      reviewedBy: adminId,
    });

    // Update Receipt status
    await visit.receipt.update({
      status: 'approved',
      verifiedAt: new Date(),
      verifierId: adminId,
    });

    // Calculate and award points
    const points = visit.receipt.getPoints();
    await visit.receipt.update({ pointsAwarded: points });

    // TODO: Award points to user via UserPointsHistory

    res.status(200).json({
      message: 'Visit approved successfully',
      visit: visit.get(),
      pointsAwarded: points,
    });
  } catch (error) {
    console.error('Error approving visit:', error);
    res.status(500).json({ error: 'Failed to approve visit' });
  }
};

/**
 * Reject visit (sysadmin)
 * POST /api/sysadmin/visits/:id/reject
 */
exports.rejectVisit = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const visit = await Visit.findByPk(id, {
      include: [{ model: Receipt, as: 'receipt' }],
    });

    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    if (visit.status === 'REJECTED') {
      return res.status(400).json({ error: 'Visit is already rejected' });
    }

    // Calculate retake deadline (7 days from now)
    const retakeDeadline = new Date();
    retakeDeadline.setDate(retakeDeadline.getDate() + 7);

    // Update Visit status
    await visit.update({
      status: 'REJECTED',
      reviewedAt: new Date(),
      reviewedBy: adminId,
      rejectionReason: reason,
      retakeDeadline: retakeDeadline,
    });

    // Update Receipt status
    if (visit.receipt) {
      await visit.receipt.update({
        status: 'rejected',
        verifiedAt: new Date(),
        verifierId: adminId,
        rejectionReason: reason,
      });
    }

    res.status(200).json({
      message: 'Visit rejected successfully',
      visit: visit.get(),
    });
  } catch (error) {
    console.error('Error rejecting visit:', error);
    res.status(500).json({ error: 'Failed to reject visit' });
  }
};

/**
 * Delete visit (sysadmin)
 * DELETE /api/sysadmin/visits/:id
 */
exports.deleteVisit = async (req, res) => {
  try {
    const { id } = req.params;

    const visit = await Visit.findByPk(id);
    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    // 1. Find and delete Receipt with S3 images
    const receipt = await Receipt.findOne({
      where: { visitId: visit.id },
    });

    if (receipt) {
      // Delete all 4 receipt image variants from S3
      if (
        receipt.thumbnailUrl ||
        receipt.mediumUrl ||
        receipt.fullscreenUrl ||
        receipt.originalUrl
      ) {
        try {
          const deleteResult = await deleteImageVariants(
            receipt.thumbnailUrl,
            receipt.mediumUrl,
            receipt.fullscreenUrl,
            receipt.originalUrl,
          );
          console.log(
            `Deleted ${deleteResult.deletedCount} receipt image variant(s) from S3`,
          );
        } catch (s3Error) {
          console.error(
            'Error deleting receipt images from S3:',
            s3Error.message,
          );
        }
      }

      // Delete Receipt record
      await Receipt.destroy({ where: { id: receipt.id } });
      console.log(`Deleted Receipt ${receipt.id}`);
    }

    // 2. Find and delete Experience with media
    const experience = await Experience.findOne({
      where: { visitId: visit.id },
      include: [
        {
          model: ExperienceMedia,
          as: 'media',
        },
      ],
    });

    if (experience) {
      // Delete Experience media from S3
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
      console.log(`Deleted Experience ${experience.id}`);
    }

    // 3. Delete Visit record
    await Visit.destroy({ where: { id: visit.id } });

    res.status(200).json({
      message: 'Visit deleted successfully',
      deletedVisitId: visit.id,
    });
  } catch (error) {
    console.error('Error deleting visit:', error);
    res.status(500).json({ error: 'Failed to delete visit' });
  }
};

/**
 * Get visit statistics (sysadmin dashboard)
 * GET /api/sysadmin/visits/stats
 */
exports.getVisitStats = async (req, res) => {
  try {
    const [pending, approved, rejected, total] = await Promise.all([
      Visit.count({ where: { status: 'PENDING' } }),
      Visit.count({ where: { status: 'APPROVED' } }),
      Visit.count({ where: { status: 'REJECTED' } }),
      Visit.count(),
    ]);

    res.status(200).json({
      stats: {
        pending,
        approved,
        rejected,
        total,
      },
    });
  } catch (error) {
    console.error('Error fetching visit stats:', error);
    res.status(500).json({ error: 'Failed to fetch visit stats' });
  }
};
