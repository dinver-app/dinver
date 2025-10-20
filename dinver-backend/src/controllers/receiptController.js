const {
  Receipt,
  User,
  Restaurant,
  UserSysadmin,
  UserPointsHistory,
} = require('../../models');
const { uploadToS3 } = require('../../utils/s3Upload');
const { getMediaUrl } = require('../../config/cdn');
const { extractReceiptData } = require('../services/ocrService');
const {
  sendPushNotificationToUsers,
} = require('../../utils/pushNotificationService');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');
const { Op } = require('sequelize');
const crypto = require('crypto');

/**
 * Upload receipt image and create receipt record
 */
const uploadReceipt = async (req, res) => {
  try {
    const userId = req.user.id;
    const { locationLat, locationLng } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Calculate image hash for duplicate detection
    const imageHash = crypto
      .createHash('md5')
      .update(file.buffer)
      .digest('hex');

    // Check for duplicate image
    const existingReceipt = await Receipt.findOne({
      where: { imageHash },
    });

    if (existingReceipt) {
      return res.status(400).json({
        error: 'Ovaj račun je već poslan na provjeru',
      });
    }

    // Upload image to S3
    const folder = `receipts/${userId}`;
    const imageKey = await uploadToS3(file, folder);

    // Try OCR extraction (non-blocking)
    let ocrData = null;
    let extractedData = null;

    try {
      extractedData = await extractReceiptData(file.buffer);
      if (extractedData) {
        ocrData = extractedData;
      }
    } catch (ocrError) {
      console.error('OCR extraction failed:', ocrError);
      // Continue without OCR data
    }

    // Create receipt record
    const receipt = await Receipt.create({
      userId,
      imageUrl: imageKey,
      imageHash,
      locationLat: locationLat ? parseFloat(locationLat) : null,
      locationLng: locationLng ? parseFloat(locationLng) : null,
      status: 'pending',
      ocrData,
      // Pre-populate fields if OCR was successful
      oib: extractedData?.oib || null,
      jir: extractedData?.jir || null,
      zki: extractedData?.zki || null,
      totalAmount: extractedData?.totalAmount || null,
      issueDate: extractedData?.issueDate || null,
      issueTime: extractedData?.issueTime || null,
    });

    // Log audit
    await logAudit({
      userId,
      action: ActionTypes.CREATE,
      entity: Entities.RECEIPT,
      entityId: receipt.id,
      changes: { new: { imageUrl: imageKey, status: 'pending' } },
    });

    res.status(201).json({
      message:
        'Račun poslan na provjeru. Bodovi će biti dodijeljeni u roku 24 sata.',
      receiptId: receipt.id,
    });
  } catch (error) {
    console.error('Error uploading receipt:', error);
    res.status(500).json({ error: 'Failed to upload receipt' });
  }
};

/**
 * Get user's receipts
 */
const getUserReceipts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const receipts = await Receipt.findAndCountAll({
      where: { userId },
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name'],
        },
      ],
      order: [['submittedAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    // Transform image URLs to signed URLs
    const transformedReceipts = receipts.rows.map((receipt) => {
      const receiptData = receipt.toJSON();
      receiptData.imageUrl = getMediaUrl(receipt.imageUrl, 'image');
      return receiptData;
    });

    res.json({
      receipts: transformedReceipts,
      totalCount: receipts.count,
      totalPages: Math.ceil(receipts.count / parseInt(limit)),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error('Error getting user receipts:', error);
    res.status(500).json({ error: 'Failed to get receipts' });
  }
};

/**
 * Get all receipts for sysadmin (with filters)
 */
const getAllReceipts = async (req, res) => {
  try {
    const {
      status,
      page = 1,
      limit = 50,
      userId,
      restaurantId,
      dateFrom,
      dateTo,
    } = req.query;

    const whereClause = {};

    if (status) {
      whereClause.status = status;
    }

    if (userId) {
      whereClause.userId = userId;
    }

    if (restaurantId) {
      whereClause.restaurantId = restaurantId;
    }

    if (dateFrom || dateTo) {
      whereClause.submittedAt = {};
      if (dateFrom) {
        whereClause.submittedAt[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        whereClause.submittedAt[Op.lte] = new Date(dateTo);
      }
    }

    const receipts = await Receipt.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'oib'],
        },
        {
          model: UserSysadmin,
          as: 'verifier',
          attributes: ['id'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName'],
            },
          ],
        },
      ],
      order: [['submittedAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    // Transform image URLs to signed URLs
    const transformedReceipts = receipts.rows.map((receipt) => {
      const receiptData = receipt.toJSON();
      receiptData.imageUrl = getMediaUrl(receipt.imageUrl, 'image');
      return receiptData;
    });

    res.json({
      receipts: transformedReceipts,
      totalCount: receipts.count,
      totalPages: Math.ceil(receipts.count / parseInt(limit)),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error('Error getting all receipts:', error);
    res.status(500).json({ error: 'Failed to get receipts' });
  }
};

/**
 * Get single receipt by ID
 */
const getReceiptById = async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await Receipt.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'oib'],
        },
        {
          model: UserSysadmin,
          as: 'verifier',
          attributes: ['id'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName'],
            },
          ],
        },
      ],
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const receiptData = receipt.toJSON();
    receiptData.imageUrl = getMediaUrl(receipt.imageUrl, 'image');

    res.json(receiptData);
  } catch (error) {
    console.error('Error getting receipt by ID:', error);
    res.status(500).json({ error: 'Failed to get receipt' });
  }
};

/**
 * Update receipt data (before approval)
 */
const updateReceiptData = async (req, res) => {
  try {
    const { id } = req.params;
    const { oib, jir, zki, totalAmount, issueDate, issueTime, restaurantId } =
      req.body;

    const receipt = await Receipt.findByPk(id);
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    if (receipt.status !== 'pending') {
      return res
        .status(400)
        .json({ error: 'Can only update pending receipts' });
    }

    // If OIB is provided, try to find matching restaurant
    let matchedRestaurantId = restaurantId;
    if (oib && !restaurantId) {
      const restaurant = await Restaurant.findOne({
        where: { oib },
        attributes: ['id'],
      });
      if (restaurant) {
        matchedRestaurantId = restaurant.id;
      }
    }

    await receipt.update({
      oib: oib || null,
      jir: jir || null,
      zki: zki || null,
      totalAmount: totalAmount ? parseFloat(totalAmount) : null,
      issueDate: issueDate || null,
      issueTime: issueTime || null,
      restaurantId: matchedRestaurantId || null,
    });

    // Log audit
    await logAudit({
      userId: req.user.id,
      action: ActionTypes.UPDATE,
      entity: Entities.RECEIPT,
      entityId: receipt.id,
      changes: {
        old: {
          oib: receipt.oib,
          jir: receipt.jir,
          zki: receipt.zki,
          totalAmount: receipt.totalAmount,
          issueDate: receipt.issueDate,
          issueTime: receipt.issueTime,
          restaurantId: receipt.restaurantId,
        },
        new: {
          oib,
          jir,
          zki,
          totalAmount,
          issueDate,
          issueTime,
          restaurantId: matchedRestaurantId,
        },
      },
    });

    res.json({ message: 'Receipt data updated successfully' });
  } catch (error) {
    console.error('Error updating receipt data:', error);
    res.status(500).json({ error: 'Failed to update receipt data' });
  }
};

/**
 * Approve receipt
 */
const approveReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { restaurantId, totalAmount, jir, zki, oib, issueDate, issueTime } =
      req.body;

    // Validate required fields
    if (
      !restaurantId ||
      !totalAmount ||
      !jir ||
      !zki ||
      !oib ||
      !issueDate ||
      !issueTime
    ) {
      return res.status(400).json({
        error: 'All fields are required for approval',
      });
    }

    const receipt = await Receipt.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName'],
            },
          ],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'oib'],
        },
      ],
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    if (receipt.status !== 'pending') {
      return res
        .status(400)
        .json({ error: 'Can only approve pending receipts' });
    }

    // Validate OIB matches restaurant
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(400).json({
        error: 'Restoran s ovim OIB-om ne postoji u sustavu',
      });
    }

    if (restaurant.oib !== oib) {
      return res.status(400).json({
        error: 'OIB se ne podudara s odabranim restoranom',
      });
    }

    // Calculate points
    const pointsAwarded = Receipt.calculatePoints(parseFloat(totalAmount));

    // Update receipt
    await receipt.update({
      restaurantId,
      totalAmount: parseFloat(totalAmount),
      jir,
      zki,
      oib,
      issueDate,
      issueTime,
      status: 'approved',
      verifierId: req.user.id,
      verifiedAt: new Date(),
      pointsAwarded,
    });

    // Award points
    await UserPointsHistory.logPoints({
      userId: receipt.userId,
      actionType: 'receipt_upload',
      points: pointsAwarded,
      referenceId: receipt.id,
      restaurantId: receipt.restaurantId,
      description: `Račun odobren - ${restaurant.name} (${totalAmount}€)`,
    });

    // Send push notification
    try {
      await sendPushNotificationToUsers([receipt.userId], {
        title: 'Račun odobren! 🎉',
        body: `Dodano ${pointsAwarded} bodova za račun iz ${restaurant.name}`,
        data: {
          type: 'receipt_approved',
          receiptId: receipt.id,
          points: pointsAwarded,
          restaurantId: receipt.restaurantId,
        },
      });
    } catch (notificationError) {
      console.error('Error sending push notification:', notificationError);
    }

    // Log audit
    await logAudit({
      userId: req.user.id,
      action: ActionTypes.UPDATE,
      entity: Entities.RECEIPT,
      entityId: receipt.id,
      changes: {
        old: { status: 'pending' },
        new: {
          status: 'approved',
          restaurantId,
          totalAmount,
          pointsAwarded,
          verifierId: req.user.id,
        },
      },
    });

    res.json({
      message: 'Receipt approved successfully',
      pointsAwarded,
    });
  } catch (error) {
    console.error('Error approving receipt:', error);
    res.status(500).json({ error: 'Failed to approve receipt' });
  }
};

/**
 * Reject receipt
 */
const rejectReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      return res.status(400).json({
        error: 'Rejection reason is required',
      });
    }

    const receipt = await Receipt.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName'],
            },
          ],
        },
      ],
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    if (receipt.status !== 'pending') {
      return res
        .status(400)
        .json({ error: 'Can only reject pending receipts' });
    }

    // Update receipt
    await receipt.update({
      status: 'rejected',
      verifierId: req.user.id,
      verifiedAt: new Date(),
      rejectionReason: rejectionReason.trim(),
    });

    // Send push notification
    try {
      await sendPushNotificationToUsers([receipt.userId], {
        title: 'Račun odbijen',
        body: rejectionReason || 'Račun nije prošao provjeru',
        data: {
          type: 'receipt_rejected',
          receiptId: receipt.id,
        },
      });
    } catch (notificationError) {
      console.error('Error sending push notification:', notificationError);
    }

    // Log audit
    await logAudit({
      userId: req.user.id,
      action: ActionTypes.UPDATE,
      entity: Entities.RECEIPT,
      entityId: receipt.id,
      changes: {
        old: { status: 'pending' },
        new: {
          status: 'rejected',
          rejectionReason,
          verifierId: req.user.id,
        },
      },
    });

    res.json({ message: 'Receipt rejected successfully' });
  } catch (error) {
    console.error('Error rejecting receipt:', error);
    res.status(500).json({ error: 'Failed to reject receipt' });
  }
};

module.exports = {
  uploadReceipt,
  getUserReceipts,
  getAllReceipts,
  getReceiptById,
  updateReceiptData,
  approveReceipt,
  rejectReceipt,
};
