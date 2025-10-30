const {
  Receipt,
  User,
  Restaurant,
  UserSysadmin,
  UserPointsHistory,
  Reservation,
  UserSettings,
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

    // Check if user is verified (email and phone)
    const userSettings = await UserSettings.findOne({
      where: { userId },
    });

    if (
      !userSettings ||
      !userSettings.isEmailVerified ||
      !userSettings.isPhoneVerified
    ) {
      return res.status(403).json({
        error: 'Morate verificirati email i broj mobitela prije slanja računa',
      });
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

    // Optional server-side compression using sharp
    const sharp = require('sharp');
    const inputBuffer = file.buffer;
    let processedBuffer = inputBuffer;
    let contentType = 'image/jpeg';
    let imageMeta = null;
    try {
      const image = sharp(inputBuffer, { failOn: 'none' });
      const metadata = await image.metadata();
      const width = metadata.width || 0;
      const pipeline = image.rotate();
      if (width > 1600) {
        pipeline.resize({ width: 1600 });
      }
      processedBuffer = await pipeline
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
      contentType = 'image/jpeg';
      // overwrite file buffer so upload util uses compressed bytes
      file.buffer = processedBuffer;
      file.mimetype = contentType;
      file.originalname =
        (file.originalname || 'receipt').replace(/\.[^.]+$/, '') + '.jpg';

      imageMeta = {
        width: metadata.width || null,
        height: metadata.height || null,
        bytes: processedBuffer.length,
        contentType,
      };
    } catch (e) {
      console.warn(
        'Image compression failed, using original buffer:',
        e?.message,
      );
    }

    // Upload image to S3 (uses possibly compressed buffer)
    const folder = `receipts/${userId}`;
    const imageKey = await uploadToS3(file, folder);

    // Try OCR extraction (non-blocking)
    let ocrData = null;
    let extracted = null;

    try {
      extracted = await extractReceiptData(processedBuffer);

      // Check if OCR returned an error indicating the image is not a receipt
      if (extracted && extracted.error === 'NOT_RECEIPT') {
        return res.status(400).json({
          error: 'NOT_RECEIPT',
          message: extracted.message,
          reason: extracted.reason,
          confidence: extracted.confidence,
        });
      }

      if (extracted) {
        ocrData = imageMeta ? { ...extracted, meta: imageMeta } : extracted;
      } else if (imageMeta) {
        ocrData = { meta: imageMeta };
      }
    } catch (ocrError) {
      console.error('OCR extraction failed:', ocrError);
      // Continue without OCR data
      if (imageMeta) {
        ocrData = { meta: imageMeta };
      }
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
      oib: extracted?.fields?.oib || null,
      jir: extracted?.fields?.jir || null,
      zki: extracted?.fields?.zki || null,
      totalAmount: extracted?.fields?.totalAmount || null,
      issueDate: extracted?.fields?.issueDate || null,
      issueTime: extracted?.fields?.issueTime || null,
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
          attributes: ['id', 'name', 'address', 'place', 'oib'],
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
          attributes: ['id', 'name', 'address', 'place', 'oib'],
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
    // Add image meta and OCR confidence if available
    const meta = receipt.ocrData?.meta || null;
    receiptData.imageMeta = meta
      ? {
          width: meta.width || null,
          height: meta.height || null,
          bytes: meta.bytes || null,
          contentType: meta.contentType || null,
        }
      : null;
    receiptData.ocr = {
      confidence: receipt.ocrData?.confidence || null,
    };

    // Ensure OIB is included in the response
    receiptData.oib = receipt.oib;

    // Auto-match restaurant by OIB if not already set
    if (!receipt.restaurantId && receipt.oib) {
      const matchingRestaurant = await Restaurant.findOne({
        where: { oib: receipt.oib },
        attributes: ['id', 'name', 'address', 'place', 'oib'],
      });

      if (matchingRestaurant) {
        // Update the receipt with the found restaurant
        await receipt.update({ restaurantId: matchingRestaurant.id });
        receiptData.restaurantId = matchingRestaurant.id;
        receiptData.restaurant = {
          id: matchingRestaurant.id,
          name: matchingRestaurant.name,
          address: matchingRestaurant.address,
          place: matchingRestaurant.place,
          oib: matchingRestaurant.oib,
        };
      }
    }

    // Check for matching reservations if receipt has restaurant and date info
    let matchedReservations = [];
    let hasReservationBonus = false;

    if (receipt.restaurantId && receipt.issueDate && receipt.issueTime) {
      // Find pending reservations for this user at this restaurant on this date
      const reservations = await Reservation.findAll({
        where: {
          userId: receipt.userId,
          restaurantId: receipt.restaurantId,
          date: receipt.issueDate,
          status: 'pending',
        },
        attributes: ['id', 'date', 'time', 'guests', 'status'],
        order: [['time', 'ASC']],
      });

      matchedReservations = reservations.map((res) => res.toJSON());

      // Check if any reservation time is before receipt time
      if (reservations.length > 0) {
        const receiptDateTime = new Date(
          `${receipt.issueDate}T${receipt.issueTime}`,
        );

        for (const reservation of reservations) {
          const reservationDateTime = new Date(
            `${reservation.date}T${reservation.time}`,
          );
          if (receiptDateTime > reservationDateTime) {
            hasReservationBonus = true;
            break;
          }
        }
      }
    }

    // Add reservation data to response
    receiptData.matchedReservations = matchedReservations;
    receiptData.hasReservationBonus = hasReservationBonus;

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
    const {
      restaurantId,
      totalAmount,
      jir,
      zki,
      oib,
      issueDate,
      issueTime,
      hasReservationBonus,
      reservationId,
    } = req.body;

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
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address', 'place', 'oib'],
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

    // Prevent approving duplicate receipts by JIR or ZKI that are already approved
    const normalizedJir = (jir || '').trim();
    const normalizedZki = (zki || '').trim();

    if (normalizedZki) {
      const existingByZki = await Receipt.findOne({
        where: {
          status: 'approved',
          zki: normalizedZki,
          id: { [Op.ne]: id },
        },
        attributes: ['id'],
      });

      if (existingByZki) {
        return res.status(400).json({
          error: `Račun s ovim ZKI već je odobren (ID: ${existingByZki.id}).`,
        });
      }
    }

    if (normalizedJir) {
      const existingByJir = await Receipt.findOne({
        where: {
          status: 'approved',
          jir: normalizedJir,
          id: { [Op.ne]: id },
        },
        attributes: ['id'],
      });

      if (existingByJir) {
        return res.status(400).json({
          error: `Račun s ovim JIR već je odobren (ID: ${existingByJir.id}).`,
        });
      }
    }

    // Check if user already has an approved receipt for this restaurant ON THE SAME DAY
    const existingApprovedReceiptSameDay = await Receipt.findOne({
      where: {
        userId: receipt.userId,
        restaurantId: restaurantId,
        status: 'approved',
        issueDate: issueDate, // same calendar day
      },
    });

    if (existingApprovedReceiptSameDay) {
      return res.status(400).json({
        error: 'Korisnik već ima odobren račun za ovaj restoran za isti datum',
      });
    }

    // Validate OIB matches restaurant
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(400).json({
        error: 'Restoran s ovim OIB-om ne postoji u sustavu',
      });
    }

    // When we add an oib to the restaurant, we should uncomment this check
    // if (restaurant.oib !== oib) {
    //   return res.status(400).json({
    //     error: 'OIB se ne podudara s odabranim restoranom',
    //   });
    // }

    // Find the UserSysadmin record for the current user
    const sysadmin = await UserSysadmin.findOne({
      where: { userId: req.user.id },
    });

    if (!sysadmin) {
      return res.status(403).json({
        error: 'User is not authorized as sysadmin',
      });
    }

    // Calculate points with reservation bonus if applicable
    const pointsAwarded = Receipt.calculatePoints(
      parseFloat(totalAmount),
      hasReservationBonus || false,
    );

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
      verifierId: sysadmin.id,
      verifiedAt: new Date(),
      pointsAwarded,
      hasReservationBonus: hasReservationBonus || false,
      reservationId: reservationId || null,
    });

    // Award points
    await UserPointsHistory.logPoints({
      userId: receipt.userId,
      actionType: 'receipt_approved',
      points: pointsAwarded,
      referenceId: receipt.id,
      restaurantId: receipt.restaurantId,
      description: `Račun odobren - ${restaurant.name} (${totalAmount}€)`,
    });

    const user = await User.findByPk(receipt.userId, {
      include: [
        {
          model: User,
          as: 'referrals',
        },
      ],
    });

    // Check if this is user's first approved receipt for referral bonus
    const firstReceipt = await Receipt.findOne({
      where: {
        userId: receipt.userId,
        status: 'approved',
      },
      order: [['verifiedAt', 'ASC']],
    });

    // If this is the first approved receipt and user was referred
    if (firstReceipt && firstReceipt.id === receipt.id && user.referredByCode) {
      try {
        // Find the referrer
        const referrer = await User.findOne({
          where: { referralCode: user.referredByCode },
        });

        if (referrer) {
          const PointsService = require('../utils/pointsService');
          const pointsService = new PointsService(
            require('../../models').sequelize,
          );

          // Award referral bonus to referrer
          await pointsService.addReferralFirstReceiptBonus(
            referrer.id,
            receipt.userId,
            user.referredByCode,
            receipt.restaurantId,
          );
        }
      } catch (referralError) {
        console.error(
          'Error awarding referral first receipt bonus:',
          referralError,
        );
        // Don't fail the receipt approval if referral bonus fails
      }
    }

    // Mark reservation as completed if reservationId is provided
    if (reservationId) {
      await Reservation.update(
        { status: 'completed' },
        { where: { id: reservationId } },
      );
    }

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
          attributes: ['id', 'firstName', 'lastName', 'email'],
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

    // Find the UserSysadmin record for the current user
    const sysadmin = await UserSysadmin.findOne({
      where: { userId: req.user.id },
    });

    if (!sysadmin) {
      return res.status(403).json({
        error: 'User is not authorized as sysadmin',
      });
    }

    // Update receipt
    await receipt.update({
      status: 'rejected',
      verifierId: sysadmin.id,
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

// New endpoint to check reservations for specific restaurant and date
const checkReservations = async (req, res) => {
  try {
    const { receiptId, restaurantId, issueDate, issueTime } = req.query;

    if (!receiptId || !restaurantId || !issueDate) {
      return res.status(400).json({
        error:
          'Missing required parameters: receiptId, restaurantId, issueDate',
      });
    }

    // Get the receipt to get userId and OIB
    const receipt = await Receipt.findByPk(receiptId, {
      attributes: ['userId', 'oib', 'restaurantId'],
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Auto-match restaurant by OIB if not already set
    if (!receipt.restaurantId && receipt.oib) {
      const matchingRestaurant = await Restaurant.findOne({
        where: { oib: receipt.oib },
        attributes: ['id', 'name', 'address', 'place', 'oib'],
      });

      if (matchingRestaurant) {
        // Update the receipt with the found restaurant
        await receipt.update({ restaurantId: matchingRestaurant.id });
        // Use the found restaurant for reservation check
        restaurantId = matchingRestaurant.id;
      }
    }

    // Find pending reservations for this user at this restaurant on this date
    const reservations = await Reservation.findAll({
      where: {
        userId: receipt.userId,
        restaurantId: restaurantId,
        date: issueDate,
        status: 'pending',
      },
      attributes: ['id', 'date', 'time', 'guests', 'status'],
      order: [['time', 'ASC']],
    });

    const matchedReservations = reservations.map((res) => res.toJSON());
    let hasReservationBonus = false;

    // Check if any reservation time is before receipt time
    if (reservations.length > 0 && issueTime) {
      const receiptDateTime = new Date(`${issueDate}T${issueTime}`);

      for (const reservation of reservations) {
        const reservationDateTime = new Date(
          `${reservation.date}T${reservation.time}`,
        );

        if (receiptDateTime > reservationDateTime) {
          hasReservationBonus = true;
          break;
        }
      }
    }

    res.json({
      matchedReservations,
      hasReservationBonus,
    });
  } catch (error) {
    console.error('Error checking reservations:', error);
    res.status(500).json({ error: 'Failed to check reservations' });
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
  checkReservations,
};
