const {
  Visit,
  Restaurant,
  UserFavorite,
  User,
  Receipt,
  UserSettings,
  UserFollow,
} = require('../../models');
const { getMediaUrl } = require('../../config/cdn');
const { uploadVariantsToS3 } = require('../../utils/s3Upload');
const { processImage } = require('../../utils/imageProcessor');
const {
  uploadImage,
  UPLOAD_STRATEGY,
} = require('../../services/imageUploadService');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');
const {
  searchPlacesByText,
  getPlaceDetails,
  transformToRestaurantData,
} = require('../services/googlePlacesService');
const {
  findRestaurantWithClaude,
  extractReceiptWithClaude,
  MODEL_VERSION,
} = require('../services/claudeOcrService');
const { extractMerchantInfoQuick } = require('../services/quickOcrService');

/**
 * Generate unique slug for restaurant
 * Handles Croatian special characters and ensures uniqueness
 */
const generateSlug = async (name) => {
  const normalizedName = name
    .toLowerCase()
    .trim()
    .replace(/[čć]/g, 'c')
    .replace(/[š]/g, 's')
    .replace(/[ž]/g, 'z')
    .replace(/[đ]/g, 'd')
    .replace(/[^\w\s-]/g, '');

  const baseSlug = normalizedName
    .replace(/[\s]+/g, '-')
    .replace(/[^\w\-]+/g, '');

  let slug = baseSlug;
  let suffix = 1;

  while (await Restaurant.findOne({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
};

/**
 * Create Visit from existing Receipt (NEW FLOW)
 * Receipt must already exist (created by uploadReceipt in appReceiptController)
 *
 * POST /api/app/visits
 * Body: { receiptId, restaurantId, taggedBuddies?, restaurantData?, manualRestaurantName?, manualRestaurantCity? }
 */
const createVisitFromReceipt = async (req, res) => {
  try {
    const {
      receiptId,
      restaurantId,
      taggedBuddies,
      restaurantData,
      manualRestaurantName,
      manualRestaurantCity,
    } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!receiptId) {
      return res.status(400).json({ error: 'Receipt ID is required' });
    }

    console.log(
      `[Visit Create] Creating visit from receipt ${receiptId} for user ${userId}`,
    );

    // Fetch the receipt
    const receipt = await Receipt.findByPk(receiptId);

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Verify receipt belongs to this user
    if (receipt.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Verify receipt doesn't already have a visit
    if (receipt.visitId) {
      return res.status(400).json({
        error: 'Receipt already has a visit',
        visitId: receipt.visitId,
      });
    }

    // Determine final restaurantId
    let finalRestaurantId = restaurantId || receipt.restaurantId;
    let autoCreatedRestaurant = null;

    // If restaurantData provided, create/find restaurant
    if (restaurantData) {
      try {
        console.log('[Visit Create] Processing restaurant data...');

        const parsedRestaurantData =
          typeof restaurantData === 'string'
            ? JSON.parse(restaurantData)
            : restaurantData;

        // Check if restaurant already exists by placeId
        const existingRestaurant = await Restaurant.findByPlaceId(
          parsedRestaurantData.placeId,
        );

        if (existingRestaurant) {
          console.log(
            `[Visit Create] Restaurant already exists: ${existingRestaurant.name}`,
          );
          finalRestaurantId = existingRestaurant.id;
        } else {
          // Create new restaurant from Google Places data
          console.log(
            `[Visit Create] Creating new restaurant: ${parsedRestaurantData.name}`,
          );

          const newRestaurant = await Restaurant.create({
            name: parsedRestaurantData.name,
            address: parsedRestaurantData.address,
            place: parsedRestaurantData.place || parsedRestaurantData.city,
            country: parsedRestaurantData.country || 'Croatia',
            latitude: parsedRestaurantData.latitude,
            longitude: parsedRestaurantData.longitude,
            phone: parsedRestaurantData.phone,
            websiteUrl:
              parsedRestaurantData.websiteUrl || parsedRestaurantData.website,
            placeId: parsedRestaurantData.placeId,
            rating: parsedRestaurantData.rating,
            priceLevel: parsedRestaurantData.priceLevel,
            claimed: false,
            lastGoogleUpdate: new Date(),
          });

          autoCreatedRestaurant = newRestaurant;
          finalRestaurantId = newRestaurant.id;

          console.log(
            `[Visit Create] Created restaurant ID: ${newRestaurant.id}`,
          );

          // Log audit for restaurant creation
          await logAudit({
            userId,
            action: ActionTypes.CREATE,
            entity: Entities.RESTAURANT,
            entityId: newRestaurant.id,
            changes: {
              new: {
                name: newRestaurant.name,
                source: 'user_visit_manual_selection',
                placeId: newRestaurant.placeId,
              },
            },
          });
        }
      } catch (autoCreateError) {
        console.error(
          '[Visit Create] Failed to process restaurant data:',
          autoCreateError.message,
        );
        return res.status(500).json({
          error: 'Failed to process restaurant data',
        });
      }
    }

    // FALLBACK: If no restaurant yet, try manual restaurant search
    if (!finalRestaurantId && manualRestaurantName && manualRestaurantCity) {
      try {
        console.log(
          `[Visit Create] Attempting Google Places search for manual input: "${manualRestaurantName}" in "${manualRestaurantCity}"`,
        );

        const searchQuery = `${manualRestaurantName} ${manualRestaurantCity}`;
        const googleResults = await searchPlacesByText(searchQuery, null, null);

        console.log(
          `[Visit Create] Found ${googleResults.length} Google Places results for manual search`,
        );

        if (googleResults.length > 0) {
          // Use Claude to find best match
          const claudeMatch = await findRestaurantWithClaude(
            {
              merchantName: manualRestaurantName,
              merchantAddress: manualRestaurantCity,
            },
            googleResults,
          );

          console.log(
            `[Visit Create] Claude confidence for manual search: ${claudeMatch.confidence}`,
          );

          if (claudeMatch.confidence >= 0.85) {
            const matchedPlaceId = claudeMatch.restaurantId;

            // Check if restaurant already exists
            const existingRestaurant =
              await Restaurant.findByPlaceId(matchedPlaceId);

            if (existingRestaurant) {
              console.log(
                `[Visit Create] Found existing restaurant: ${existingRestaurant.name}`,
              );
              finalRestaurantId = existingRestaurant.id;
            } else {
              // Fetch full details and create restaurant
              const placeDetails = await getPlaceDetails(matchedPlaceId);

              if (placeDetails) {
                const restaurantData = transformToRestaurantData(placeDetails);
                const slug = await generateSlug(restaurantData.name);

                const newRestaurant = await Restaurant.create({
                  name: restaurantData.name,
                  slug: slug,
                  address: restaurantData.address,
                  place: restaurantData.place,
                  country: restaurantData.country || 'Croatia',
                  latitude: restaurantData.latitude,
                  longitude: restaurantData.longitude,
                  phone: restaurantData.phone,
                  websiteUrl: restaurantData.websiteUrl,
                  placeId: restaurantData.placeId,
                  priceLevel: restaurantData.priceLevel,
                  openingHours: restaurantData.openingHours || null,
                  isOpenNow: restaurantData.isOpenNow || null,
                  claimed: false,
                  lastGoogleUpdate: new Date(),
                });

                autoCreatedRestaurant = newRestaurant;
                finalRestaurantId = newRestaurant.id;

                console.log(
                  `[Visit Create] Auto-created restaurant from manual search: ${newRestaurant.name}`,
                );

                // Log audit
                await logAudit({
                  userId,
                  action: ActionTypes.CREATE,
                  entity: Entities.RESTAURANT,
                  entityId: newRestaurant.id,
                  changes: {
                    new: {
                      name: newRestaurant.name,
                      source: 'user_manual_input_google_places',
                      placeId: newRestaurant.placeId,
                    },
                  },
                });
              }
            }
          } else {
            console.log(
              `[Visit Create] Claude confidence too low (${claudeMatch.confidence}), will create Visit with manual data only`,
            );
          }
        } else {
          console.log(
            '[Visit Create] No Google Places results for manual search',
          );
        }
      } catch (manualSearchError) {
        console.error(
          '[Visit Create] Manual restaurant search failed:',
          manualSearchError.message,
        );
        // Continue - will create Visit with manual data only
      }
    }

    // Validate we have either restaurantId OR manual restaurant data
    if (
      !finalRestaurantId &&
      (!manualRestaurantName || !manualRestaurantCity)
    ) {
      return res.status(400).json({
        error: 'Restaurant ID or manual restaurant name and city are required',
      });
    }

    // Validate restaurant exists (if we have finalRestaurantId)
    let restaurant = null;
    let wasInMustVisit = false;

    if (finalRestaurantId) {
      restaurant = await Restaurant.findByPk(finalRestaurantId);
      if (!restaurant) {
        return res.status(404).json({ error: 'Restaurant not found' });
      }

      // Check if restaurant is in Must Visit list
      const mustVisitEntry = await UserFavorite.findOne({
        where: {
          userId: userId,
          restaurantId: finalRestaurantId,
          removedAt: null,
        },
      });

      wasInMustVisit = !!mustVisitEntry;

      // If restaurant was in Must Visit, soft delete it
      if (mustVisitEntry) {
        await mustVisitEntry.update({
          removedAt: new Date(),
          removedForVisitId: null, // Will be set after visit creation
        });
      }
    }

    // Create the visit
    const visit = await Visit.create({
      userId: userId,
      restaurantId: finalRestaurantId || null, // Can be null for fallback scenarios
      receiptImageUrl: receipt.mediumUrl || receipt.imageUrl,
      status: 'PENDING',
      wasInMustVisit: wasInMustVisit,
      submittedAt: new Date(),
      taggedBuddies: taggedBuddies || [],
      manualRestaurantName: !finalRestaurantId ? manualRestaurantName : null,
      manualRestaurantCity: !finalRestaurantId ? manualRestaurantCity : null,
    });

    console.log(
      `[Visit Create] Visit created: ${visit.id}${!finalRestaurantId ? ' (with manual restaurant data)' : ''}`,
    );

    // Update Receipt with visitId and restaurantId
    await receipt.update({
      visitId: visit.id,
      restaurantId: finalRestaurantId,
    });

    console.log(
      `[Visit Create] Receipt ${receipt.id} linked to visit ${visit.id}`,
    );

    // Update Must Visit entry if it was removed earlier
    if (finalRestaurantId) {
      const mustVisitEntry = await UserFavorite.findOne({
        where: {
          userId: userId,
          restaurantId: finalRestaurantId,
          removedAt: { [require('sequelize').Op.not]: null },
          removedForVisitId: null,
        },
        order: [['removedAt', 'DESC']],
      });

      if (mustVisitEntry) {
        await mustVisitEntry.update({
          removedForVisitId: visit.id,
        });
        console.log(`[Visit Create] Updated Must Visit entry with visit ID`);
      }
    }

    // Return the created visit with restaurant and receipt details
    const visitWithDetails = await Visit.findByPk(visit.id, {
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: [
            'id',
            'name',
            'rating',
            'priceLevel',
            'address',
            'place',
            'thumbnailUrl',
          ],
        },
        {
          model: Receipt,
          as: 'receipt',
          attributes: [
            'id',
            'thumbnailUrl',
            'mediumUrl',
            'fullscreenUrl',
            'originalUrl',
            'status',
            'oib',
            'totalAmount',
            'issueDate',
          ],
        },
      ],
    });

    const response = {
      ...visitWithDetails.get(),
      receiptImageUrl: getMediaUrl(visit.receiptImageUrl, 'image'),
      receipt: visitWithDetails.receipt
        ? {
            id: visitWithDetails.receipt.id,
            thumbnailUrl: visitWithDetails.receipt.thumbnailUrl
              ? getMediaUrl(visitWithDetails.receipt.thumbnailUrl, 'image')
              : null,
            mediumUrl: visitWithDetails.receipt.mediumUrl
              ? getMediaUrl(visitWithDetails.receipt.mediumUrl, 'image')
              : null,
            fullscreenUrl: visitWithDetails.receipt.fullscreenUrl
              ? getMediaUrl(visitWithDetails.receipt.fullscreenUrl, 'image')
              : null,
            originalUrl: visitWithDetails.receipt.originalUrl
              ? getMediaUrl(visitWithDetails.receipt.originalUrl, 'image')
              : null,
            status: visitWithDetails.receipt.status,
            oib: visitWithDetails.receipt.oib,
            totalAmount: visitWithDetails.receipt.totalAmount,
            issueDate: visitWithDetails.receipt.issueDate,
          }
        : null,
      restaurant: visitWithDetails.restaurant
        ? {
            ...visitWithDetails.restaurant.get(),
            thumbnailUrl: visitWithDetails.restaurant.thumbnailUrl
              ? getMediaUrl(visitWithDetails.restaurant.thumbnailUrl, 'image')
              : null,
            isNew: !!autoCreatedRestaurant,
          }
        : null,
    };

    let message;
    if (autoCreatedRestaurant) {
      message = `Visit created! Novi restoran "${autoCreatedRestaurant.name}" dodan u sustav.`;
    } else if (!finalRestaurantId) {
      message =
        'Visit created! Restoran će biti spojen od strane administratora.';
    } else {
      message = 'Visit created successfully. Waiting for admin approval.';
    }

    res.status(201).json({
      message,
      visit: response,
    });
  } catch (error) {
    console.error('[Visit Create] Failed:', error);
    res.status(500).json({ error: 'Failed to create visit' });
  }
};

// LEGACY: Create a new visit (scan receipt) - OLD FLOW
// Kept for backward compatibility, but should use createVisitFromReceipt instead
const createVisit = async (req, res) => {
  try {
    const { restaurantId, taggedBuddies } = req.body;
    const userId = req.user.id;

    // Validate restaurant exists
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Check if receipt image was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'Receipt image is required' });
    }

    // Process receipt image into 3 variants (thumbnail, medium, fullscreen)
    let imageVariants;
    let receiptImageUrl;
    let receiptRecord;

    try {
      // Step 1: Process image into 4 variants (explicitly enable ORIGINAL for receipts)
      console.log('Processing receipt image...');
      const { variants, metadata } = await processImage(req.file.buffer, {
        originalName: req.file.originalname,
        skipOriginal: false, // Enable ORIGINAL variant for receipts
      });

      // Step 2: Upload all variants to S3
      const baseFileName = uuidv4();
      const folder = `receipts/${userId}`;

      console.log('Uploading receipt variants to S3...');
      const uploadResult = await uploadVariantsToS3(
        variants,
        folder,
        baseFileName,
      );

      imageVariants = uploadResult.variants;

      // Use medium variant as the main URL (for backward compatibility)
      receiptImageUrl =
        imageVariants.medium ||
        imageVariants.fullscreen ||
        imageVariants.thumbnail;

      // Step 3: Calculate image hash for duplicate detection
      const imageHash = crypto
        .createHash('md5')
        .update(req.file.buffer)
        .digest('hex');

      // Step 4: Create Receipt record
      console.log('Creating Receipt record...');
      receiptRecord = await Receipt.create({
        userId: userId,
        restaurantId: restaurantId,
        imageUrl: receiptImageUrl, // Main URL (medium variant)
        thumbnailUrl: imageVariants.thumbnail,
        mediumUrl: imageVariants.medium,
        fullscreenUrl: imageVariants.fullscreen,
        originalUrl: imageVariants.original,
        imageHash: imageHash,
        status: 'pending',
        submittedAt: new Date(),
      });

      console.log(`Receipt created: ${receiptRecord.id}`);
    } catch (error) {
      console.error('Error processing/uploading receipt:', error);
      return res.status(500).json({
        error: 'Failed to process receipt image',
        details: error.message,
      });
    }

    // Check if restaurant is in Must Visit list
    const mustVisitEntry = await UserFavorite.findOne({
      where: {
        userId: userId,
        restaurantId: restaurantId,
        removedAt: null, // Only check active Must Visit entries
      },
    });

    const wasInMustVisit = !!mustVisitEntry;

    // Create the visit
    const visit = await Visit.create({
      userId: userId,
      restaurantId: restaurantId,
      receiptImageUrl: receiptImageUrl,
      status: 'PENDING',
      wasInMustVisit: wasInMustVisit,
      submittedAt: new Date(),
      taggedBuddies: taggedBuddies || [],
    });

    // Link Receipt to Visit
    await receiptRecord.update({
      visitId: visit.id,
    });

    // If restaurant was in Must Visit, soft delete it
    if (mustVisitEntry) {
      await mustVisitEntry.update({
        removedAt: new Date(),
        removedForVisitId: visit.id,
      });
    }

    // Return the created visit with restaurant details
    const visitWithRestaurant = await Visit.findByPk(visit.id, {
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: [
            'id',
            'name',
            'rating',
            'priceLevel',
            'address',
            'place',
            'thumbnailUrl',
          ],
        },
        {
          model: Receipt,
          as: 'receipt',
          attributes: [
            'id',
            'thumbnailUrl',
            'mediumUrl',
            'fullscreenUrl',
            'originalUrl',
            'status',
          ],
        },
      ],
    });

    const response = {
      ...visitWithRestaurant.get(),
      receiptImageUrl: getMediaUrl(receiptImageUrl, 'image'),
      receipt: visitWithRestaurant.receipt
        ? {
            id: visitWithRestaurant.receipt.id,
            thumbnailUrl: visitWithRestaurant.receipt.thumbnailUrl
              ? getMediaUrl(visitWithRestaurant.receipt.thumbnailUrl, 'image')
              : null,
            mediumUrl: visitWithRestaurant.receipt.mediumUrl
              ? getMediaUrl(visitWithRestaurant.receipt.mediumUrl, 'image')
              : null,
            fullscreenUrl: visitWithRestaurant.receipt.fullscreenUrl
              ? getMediaUrl(visitWithRestaurant.receipt.fullscreenUrl, 'image')
              : null,
            originalUrl: visitWithRestaurant.receipt.originalUrl
              ? getMediaUrl(visitWithRestaurant.receipt.originalUrl, 'image')
              : null,
            status: visitWithRestaurant.receipt.status,
          }
        : null,
      restaurant: {
        ...visitWithRestaurant.restaurant.get(),
        thumbnailUrl: visitWithRestaurant.restaurant.thumbnailUrl
          ? getMediaUrl(visitWithRestaurant.restaurant.thumbnailUrl, 'image')
          : null,
      },
    };

    res.status(201).json({
      message: 'Visit created successfully. Waiting for admin approval.',
      visit: response,
    });
  } catch (error) {
    console.error('Error creating visit:', error);
    res.status(500).json({ error: 'Failed to create visit' });
  }
};

// Get user's visited list (only APPROVED visits)
// PENDING and REJECTED are shown in receipts list, not visits list
const getUserVisits = async (req, res) => {
  try {
    const userId = req.user.id;

    // Only return APPROVED visits - these are confirmed visits with restaurant
    const visits = await Visit.findAll({
      where: {
        userId: userId,
        status: 'APPROVED',
      },
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: [
            'id',
            'name',
            'rating',
            'priceLevel',
            'address',
            'place',
            'isClaimed',
            'thumbnailUrl',
            'userRatingsTotal',
          ],
        },
        {
          model: Receipt,
          as: 'receipt',
          attributes: [
            'id',
            'thumbnailUrl',
            'mediumUrl',
            'fullscreenUrl',
            'originalUrl',
            'status',
          ],
        },
      ],
      order: [['submittedAt', 'DESC']],
    });

    const filteredVisits = visits;

    const visitsWithUrls = filteredVisits.map((visit) => ({
      ...visit.get(),
      receiptImageUrl: getMediaUrl(visit.receiptImageUrl, 'image'),
      receipt: visit.receipt
        ? {
            id: visit.receipt.id,
            thumbnailUrl: visit.receipt.thumbnailUrl
              ? getMediaUrl(visit.receipt.thumbnailUrl, 'image')
              : null,
            mediumUrl: visit.receipt.mediumUrl
              ? getMediaUrl(visit.receipt.mediumUrl, 'image')
              : null,
            fullscreenUrl: visit.receipt.fullscreenUrl
              ? getMediaUrl(visit.receipt.fullscreenUrl, 'image')
              : null,
            originalUrl: visit.receipt.originalUrl
              ? getMediaUrl(visit.receipt.originalUrl, 'image')
              : null,
            status: visit.receipt.status,
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

    res.status(200).json(visitsWithUrls);
  } catch (error) {
    console.error('Error fetching visits:', error);
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
};

// Get single visit details
const getVisitById = async (req, res) => {
  try {
    const { visitId } = req.params;
    const userId = req.user.id;

    const visit = await Visit.findOne({
      where: { id: visitId, userId: userId },
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: [
            'id',
            'name',
            'rating',
            'priceLevel',
            'address',
            'place',
            'thumbnailUrl',
          ],
        },
        {
          model: Receipt,
          as: 'receipt',
          attributes: [
            'id',
            'thumbnailUrl',
            'mediumUrl',
            'fullscreenUrl',
            'originalUrl',
            'status',
          ],
        },
      ],
    });

    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    const response = {
      ...visit.get(),
      receiptImageUrl: getMediaUrl(visit.receiptImageUrl, 'image'),
      receipt: visit.receipt
        ? {
            id: visit.receipt.id,
            thumbnailUrl: visit.receipt.thumbnailUrl
              ? getMediaUrl(visit.receipt.thumbnailUrl, 'image')
              : null,
            mediumUrl: visit.receipt.mediumUrl
              ? getMediaUrl(visit.receipt.mediumUrl, 'image')
              : null,
            fullscreenUrl: visit.receipt.fullscreenUrl
              ? getMediaUrl(visit.receipt.fullscreenUrl, 'image')
              : null,
            originalUrl: visit.receipt.originalUrl
              ? getMediaUrl(visit.receipt.originalUrl, 'image')
              : null,
            status: visit.receipt.status,
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
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching visit:', error);
    res.status(500).json({ error: 'Failed to fetch visit' });
  }
};

// Retake receipt photo (for rejected visits)
const retakeReceipt = async (req, res) => {
  try {
    const { visitId } = req.params;
    const userId = req.user.id;

    // Find the visit
    const visit = await Visit.findOne({
      where: { id: visitId, userId: userId },
    });

    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    // Check if visit is in REJECTED or RETAKE_NEEDED status
    if (visit.status !== 'REJECTED' && visit.status !== 'RETAKE_NEEDED') {
      return res.status(400).json({
        error: 'Can only retake receipt for rejected visits',
      });
    }

    // Check if retake deadline has passed
    if (visit.retakeDeadline && new Date() > visit.retakeDeadline) {
      return res.status(400).json({
        error: 'Retake deadline has passed',
      });
    }

    // Check if receipt image was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'Receipt image is required' });
    }

    // Process new receipt image into 3 variants
    let receiptImageUrl;
    let receiptRecord;

    try {
      // Step 1: Process image into 4 variants (explicitly enable ORIGINAL for receipts)
      console.log('Processing new receipt image...');
      const { variants } = await processImage(req.file.buffer, {
        originalName: req.file.originalname,
        skipOriginal: false, // Enable ORIGINAL variant for receipts
      });

      // Step 2: Upload all variants to S3
      const baseFileName = uuidv4();
      const folder = `receipts/${userId}`;

      console.log('Uploading receipt variants to S3...');
      const uploadResult = await uploadVariantsToS3(
        variants,
        folder,
        baseFileName,
      );

      const imageVariants = uploadResult.variants;
      receiptImageUrl =
        imageVariants.medium ||
        imageVariants.fullscreen ||
        imageVariants.thumbnail;

      // Step 3: Calculate image hash
      const imageHash = crypto
        .createHash('md5')
        .update(req.file.buffer)
        .digest('hex');

      // Step 4: Find existing Receipt record linked to this Visit
      receiptRecord = await Receipt.findOne({
        where: { visitId: visit.id },
      });

      if (receiptRecord) {
        // Update existing Receipt record
        await receiptRecord.update({
          imageUrl: receiptImageUrl,
          thumbnailUrl: imageVariants.thumbnail,
          mediumUrl: imageVariants.medium,
          fullscreenUrl: imageVariants.fullscreen,
          originalUrl: imageVariants.original,
          imageHash: imageHash,
          status: 'pending',
          submittedAt: new Date(),
          rejectionReason: null,
        });
      } else {
        // Create new Receipt record if it doesn't exist
        receiptRecord = await Receipt.create({
          userId: userId,
          restaurantId: visit.restaurantId,
          visitId: visit.id,
          imageUrl: receiptImageUrl,
          thumbnailUrl: imageVariants.thumbnail,
          mediumUrl: imageVariants.medium,
          fullscreenUrl: imageVariants.fullscreen,
          originalUrl: imageVariants.original,
          imageHash: imageHash,
          status: 'pending',
          submittedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Error processing/uploading receipt:', error);
      return res.status(500).json({
        error: 'Failed to process receipt image',
        details: error.message,
      });
    }

    // Update visit with new receipt and reset to PENDING
    await visit.update({
      receiptImageUrl: receiptImageUrl,
      status: 'PENDING',
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
      retakeDeadline: null,
    });

    // Fetch updated visit with receipt details
    const updatedVisit = await Visit.findByPk(visit.id, {
      include: [
        {
          model: Receipt,
          as: 'receipt',
          attributes: [
            'id',
            'thumbnailUrl',
            'mediumUrl',
            'fullscreenUrl',
            'originalUrl',
            'status',
          ],
        },
      ],
    });

    const response = {
      ...updatedVisit.get(),
      receiptImageUrl: getMediaUrl(receiptImageUrl, 'image'),
      receipt: updatedVisit.receipt
        ? {
            id: updatedVisit.receipt.id,
            thumbnailUrl: updatedVisit.receipt.thumbnailUrl
              ? getMediaUrl(updatedVisit.receipt.thumbnailUrl, 'image')
              : null,
            mediumUrl: updatedVisit.receipt.mediumUrl
              ? getMediaUrl(updatedVisit.receipt.mediumUrl, 'image')
              : null,
            fullscreenUrl: updatedVisit.receipt.fullscreenUrl
              ? getMediaUrl(updatedVisit.receipt.fullscreenUrl, 'image')
              : null,
            originalUrl: updatedVisit.receipt.originalUrl
              ? getMediaUrl(updatedVisit.receipt.originalUrl, 'image')
              : null,
            status: updatedVisit.receipt.status,
          }
        : null,
    };

    res.status(200).json({
      message: 'Receipt updated successfully. Waiting for admin approval.',
      visit: response,
    });
  } catch (error) {
    console.error('Error retaking receipt:', error);
    res.status(500).json({ error: 'Failed to retake receipt' });
  }
};

// Check if user has visited a restaurant
const checkHasVisited = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const userId = req.user.id;

    const visit = await Visit.findOne({
      where: {
        userId: userId,
        restaurantId: restaurantId,
        status: 'APPROVED',
      },
    });

    res.status(200).json({ hasVisited: !!visit });
  } catch (error) {
    console.error('Error checking visit status:', error);
    res.status(500).json({ error: 'Failed to check visit status' });
  }
};

// Delete visit (user can delete within 14 days)
const deleteVisit = async (req, res) => {
  try {
    const { visitId } = req.params;
    const userId = req.user.id;

    // Find the visit
    const visit = await Visit.findOne({
      where: { id: visitId, userId: userId },
    });

    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    // Check if visit is within 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    if (visit.submittedAt < fourteenDaysAgo) {
      return res.status(403).json({
        error: 'Cannot delete visit older than 14 days',
        submittedAt: visit.submittedAt,
      });
    }

    // 1. Find and delete Receipt with S3 images
    const receipt = await Receipt.findOne({
      where: { visitId: visit.id },
    });

    if (receipt) {
      // Delete all 4 receipt image variants from S3
      const { deleteImageVariants } = require('../../utils/s3Upload');
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
    const { Experience, ExperienceMedia } = require('../../models');
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
          console.error(
            `Error deleting experience media from S3:`,
            s3Error.message,
          );
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
 * Upload receipt + Create Visit in ONE atomic operation (OPTIMIZED!)
 * POST /api/app/visits/upload-receipt
 *
 * Body (multipart/form-data):
 * - receiptImage: File (required)
 * - taggedBuddies: JSON string array (optional) ["uuid1", "uuid2"]
 * - locationLat: string (optional)
 * - locationLng: string (optional)
 * - gpsAccuracy: string (optional)
 *
 * Flow:
 * 1. Process image (1 variant only - FAST!)
 * 2. Upload to S3 (single file)
 * 3. Create Visit + Receipt atomically
 * 4. Return success immediately (2-3s!)
 * 5. Background OCR + restaurant matching
 */
const uploadReceiptAndCreateVisit = async (req, res) => {
  const { sequelize } = require('../../models');
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { taggedBuddies, locationLat, locationLng, gpsAccuracy } = req.body;
    const file = req.file;

    if (!file) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Receipt image is required' });
    }

    // === STEP 1: Calculate hash (duplicate detection) ===
    const imageHash = crypto
      .createHash('md5')
      .update(file.buffer)
      .digest('hex');

    const exactDuplicate = await Receipt.findOne({
      where: { imageHash, userId },
    });

    if (exactDuplicate) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Ovaj račun je već poslan na provjeru',
      });
    }

    // === STEP 2 & 3: Upload image (using existing proven method!) ===
    const folder = `receipts/${userId}`;
    let imageUploadResult;

    try {
      imageUploadResult = await uploadImage(file, folder, {
        strategy: UPLOAD_STRATEGY.QUICK,
        entityType: 'receipt',
        entityId: null,
        priority: 15,
        maxWidth: 2000, // Larger for OCR accuracy
        quality: 88, // Higher quality for text recognition
        mimeType: file.mimetype, // For HEIC conversion
      });
    } catch (uploadError) {
      await transaction.rollback();
      console.error(
        '[Upload & Create Visit] Image upload failed:',
        uploadError,
      );
      return res.status(500).json({
        error: 'Failed to upload receipt image',
        details: uploadError.message,
      });
    }

    const imageUrl = imageUploadResult.imageUrl;

    // === STEP 4: Create Visit (WITHOUT restaurant yet) ===
    const visit = await Visit.create(
      {
        userId,
        restaurantId: null, // Will be set by AI/Admin later
        receiptImageUrl: imageUrl,
        status: 'PENDING',
        submittedAt: new Date(),
        taggedBuddies: taggedBuddies ? JSON.parse(taggedBuddies) : [],
        wasInMustVisit: false,
      },
      { transaction },
    );

    // === STEP 5: Create Receipt (linked to Visit) ===
    const receipt = await Receipt.create(
      {
        userId,
        visitId: visit.id, // Linked immediately!
        restaurantId: null, // Will be set by AI/Admin
        imageUrl: imageUrl,
        imageHash,
        locationLat: locationLat ? parseFloat(locationLat) : null,
        locationLng: locationLng ? parseFloat(locationLng) : null,
        gpsAccuracy: gpsAccuracy ? parseFloat(gpsAccuracy) : null,
        status: 'pending',
        ocrMethod: 'claude',
        submittedAt: new Date(),
        modelVersion: MODEL_VERSION,
      },
      { transaction },
    );

    // === COMMIT TRANSACTION ===
    await transaction.commit();

    // === STEP 6: Background OCR (korisnik ne čeka!) ===
    // Copy buffer BEFORE sending response to ensure it persists
    const imageBufferCopy = Buffer.from(file.buffer);
    const receiptIdForOcr = receipt.id;
    const mimeTypeForOcr = file.mimetype;

    // Use setImmediate to defer OCR to next event loop tick
    // This ensures HTTP response is sent BEFORE OCR starts
    setImmediate(() => {
      processFullOcrInBackground(receiptIdForOcr, imageBufferCopy, mimeTypeForOcr)
        .then(() => {
          console.log(
            `[Background OCR] Successfully completed for receipt ${receiptIdForOcr}`,
          );
        })
        .catch((error) => {
          console.error(
            `[Background OCR] Failed for receipt ${receiptIdForOcr}:`,
            error.message,
          );
        });
    });

    // === STEP 7: Return SUCCESS immediately! ===
    return res.status(201).json({
      visitId: visit.id,
      receiptId: receipt.id,
      message: 'Račun uspješno poslan na provjeru!',
    });
  } catch (error) {
    await transaction.rollback();
    console.error('[Upload & Create Visit] Failed:', error);
    res.status(500).json({
      error: 'Failed to process receipt',
      details: error.message,
    });
  }
};

/**
 * Background processing: Full OCR extraction + Restaurant matching
 * Updates Receipt with OCR data and Visit with matched restaurant
 *
 * @param {string} receiptId - Receipt ID to update
 * @param {Buffer} imageBuffer - Receipt image buffer
 * @param {string} mimeType - Image MIME type
 */
async function processFullOcrInBackground(receiptId, imageBuffer, mimeType) {
  let matchMethod = null;

  try {
    const startTime = Date.now();

    // ========================================================================
    // STEP 1: OCR EXTRACTION
    // ========================================================================
    console.log('┌─ STEP 1: OCR Extraction ─────────────────────────────┐');
    console.log('│ Running Claude AI OCR on receipt image...');
    const claudeResult = await extractReceiptWithClaude(imageBuffer, mimeType);

    if (!claudeResult) {
      throw new Error('Claude OCR returned no results');
    }

    const ocrDuration = Date.now() - startTime;
    console.log(`│ ✅ OCR completed in ${ocrDuration}ms`);
    console.log('│');
    console.log('│ Extracted Data:');
    console.log(
      `│   • Merchant Name:    ${claudeResult.merchantName || '❌ NOT FOUND'}`,
    );
    console.log(
      `│   • Merchant Address: ${claudeResult.merchantAddress || '❌ NOT FOUND'}`,
    );
    console.log(
      `│   • OIB:              ${claudeResult.oib || '❌ NOT FOUND'}`,
    );
    console.log(
      `│   • JIR:              ${claudeResult.jir ? '✅ ' + claudeResult.jir.substring(0, 20) + '...' : '❌ NOT FOUND'}`,
    );
    console.log(
      `│   • ZKI:              ${claudeResult.zki ? '✅ ' + claudeResult.zki.substring(0, 20) + '...' : '❌ NOT FOUND'}`,
    );
    console.log(
      `│   • Total Amount:     ${claudeResult.totalAmount ? claudeResult.totalAmount + ' EUR' : '❌ NOT FOUND'}`,
    );
    console.log(
      `│   • Issue Date:       ${claudeResult.issueDate || '❌ NOT FOUND'}`,
    );
    console.log(
      `│   • Issue Time:       ${claudeResult.issueTime || '❌ NOT FOUND'}`,
    );
    console.log('└───────────────────────────────────────────────────────┘\n');

    // Get receipt
    const receipt = await Receipt.findByPk(receiptId);
    if (!receipt) {
      throw new Error('Receipt not found');
    }

    // ========================================================================
    // STEP 2: RESTAURANT MATCHING
    // ========================================================================
    console.log('┌─ STEP 2: Restaurant Matching ────────────────────────┐');
    let matchedRestaurant = null;
    let matchConfidence = null;

    // STRATEGY 1: OIB Match
    console.log('│');
    console.log('│ 🔍 Strategy 1: OIB Database Match');
    if (claudeResult.oib) {
      console.log(`│    Searching for OIB: ${claudeResult.oib}...`);
      matchedRestaurant = await Restaurant.findOne({
        where: { oib: claudeResult.oib },
      });

      if (matchedRestaurant) {
        matchConfidence = 1.0;
        matchMethod = 'OIB_MATCH';
        console.log(`│    ✅ SUCCESS!`);
        console.log(`│       Restaurant: ${matchedRestaurant.name}`);
        console.log(`│       ID: ${matchedRestaurant.id}`);
        console.log(`│       Confidence: 100% (Perfect OIB match)`);
      } else {
        console.log(`│    ❌ FAILED: No restaurant with this OIB in database`);
      }
    } else {
      console.log(`│    ⏭️  SKIPPED: No OIB was extracted from receipt`);
    }

    // STRATEGY 2: Name-based search + Claude matching
    if (!matchedRestaurant && claudeResult.merchantName) {
      console.log('│');
      console.log('│ 🔍 Strategy 2: Name-based Database Search');
      console.log(`│    Searching for name: "${claudeResult.merchantName}"...`);

      const { Op } = require('sequelize');

      // Normalize merchant name (remove diacritics for fuzzy matching)
      const normalizeName = (name) => {
        return name
          .toLowerCase()
          .normalize('NFD') // Decompose combined characters
          .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
          .trim();
      };

      const normalizedMerchantName = normalizeName(claudeResult.merchantName);
      console.log(`│    Normalized search: "${normalizedMerchantName}"`);

      // Try exact ILIKE match first
      let nameSearchResults = await Restaurant.findAll({
        where: {
          name: { [Op.iLike]: `%${claudeResult.merchantName}%` },
        },
        attributes: [
          'id',
          'name',
          'address',
          'place',
          'placeId',
          'rating',
          'latitude',
          'longitude',
        ],
        limit: 20,
      });

      // If no exact match, try fuzzy matching with normalized names
      if (nameSearchResults.length === 0) {
        console.log(`│    No exact match, trying fuzzy match...`);
        console.log(
          `│    Searching for normalized: "${normalizedMerchantName}"`,
        );
        const allRestaurants = await Restaurant.findAll({
          attributes: [
            'id',
            'name',
            'address',
            'place',
            'placeId',
            'rating',
            'latitude',
            'longitude',
          ],
          limit: 500, // Increased limit to include more restaurants
        });

        console.log(
          `│    Fetched ${allRestaurants.length} restaurants to compare`,
        );

        // Filter in JavaScript using normalized names with bidirectional matching
        nameSearchResults = allRestaurants
          .filter((r) => {
            const normalizedRestaurantName = normalizeName(r.name);

            // Check both directions: does A contain B OR does B contain A
            const matches =
              normalizedRestaurantName.includes(normalizedMerchantName) ||
              normalizedMerchantName.includes(normalizedRestaurantName);

            // Debug log for first 5 comparisons
            if (allRestaurants.indexOf(r) < 5) {
              console.log(
                `│       "${r.name}" → "${normalizedRestaurantName}" ${matches ? '✅' : '❌'}`,
              );
            }

            return matches;
          })
          .slice(0, 20);
      }

      console.log(
        `│    Found ${nameSearchResults.length} restaurant(s) with similar name`,
      );

      if (nameSearchResults.length > 0) {
        // Use Claude AI to find best match (no GPS filtering)
        console.log(`│    🤖 Using Claude AI to find best match...`);
        const claudeMatch = await findRestaurantWithClaude(
          claudeResult,
          nameSearchResults,
        );

        if (claudeMatch.restaurantId && claudeMatch.confidence >= 0.8) {
          matchedRestaurant = await Restaurant.findByPk(
            claudeMatch.restaurantId,
          );
          matchConfidence = claudeMatch.confidence;
          matchMethod = 'NAME_SEARCH_+_AI';
          console.log(`│    ✅ SUCCESS!`);
          console.log(`│       Restaurant: ${matchedRestaurant.name}`);
          console.log(`│       ID: ${matchedRestaurant.id}`);
          console.log(
            `│       Confidence: ${Math.round(matchConfidence * 100)}%`,
          );
        } else {
          console.log(
            `│    ❌ FAILED: AI confidence too low (${claudeMatch.confidence ? Math.round(claudeMatch.confidence * 100) : 0}% < 80%)`,
          );
        }
      } else {
        console.log(`│    ❌ FAILED: No restaurants found with similar name`);
      }
    } else if (!matchedRestaurant) {
      console.log('│');
      console.log('│ 🔍 Strategy 2: SKIPPED (No merchant name extracted)');
    }

    // STRATEGY 3: Google Places fallback
    if (!matchedRestaurant && claudeResult.merchantName) {
      console.log('│');
      console.log('│ 🔍 Strategy 3: Google Places Search (Fallback)');

      try {
        const searchQuery = claudeResult.merchantAddress
          ? `${claudeResult.merchantName}, ${claudeResult.merchantAddress}`
          : claudeResult.merchantName;

        console.log(`│    Query: "${searchQuery}"`);
        console.log(`│    Searching Google Places API...`);

        const placesResults = await searchPlacesByText(searchQuery);

        console.log(`│    Google found ${placesResults.length} place(s)`);

        if (placesResults.length > 0) {
          // Check if any already exist in DB
          console.log(`│    Checking if any exist in our database...`);
          for (const place of placesResults) {
            console.log(
              `│       Checking place: ${place.name} (placeId: ${place.placeId})`,
            );
            const existingRestaurant = await Restaurant.findOne({
              where: { placeId: place.placeId },
            });

            if (existingRestaurant) {
              matchedRestaurant = existingRestaurant;
              matchConfidence = 0.9;
              matchMethod = 'GOOGLE_EXISTING';
              console.log(
                `│    ✅ SUCCESS! Found existing restaurant from Google`,
              );
              console.log(`│       Restaurant: ${matchedRestaurant.name}`);
              console.log(`│       ID: ${matchedRestaurant.id}`);
              console.log(`│       Confidence: 90% (Google + existing in DB)`);
              break;
            }
          }

          // Create new restaurant from Google
          if (!matchedRestaurant && placesResults[0]) {
            console.log(`│    Creating new restaurant from Google Places...`);

            const placeDetails = await getPlaceDetails(
              placesResults[0].placeId,
            );
            const restaurantData = transformToRestaurantData(placeDetails);

            if (claudeResult.oib) {
              restaurantData.oib = claudeResult.oib;
            }

            restaurantData.slug = await generateSlug(restaurantData.name);
            matchedRestaurant = await Restaurant.create(restaurantData);
            matchConfidence = 0.85;
            matchMethod = 'GOOGLE_NEW';

            console.log(`│    ✅ SUCCESS! Created new restaurant from Google`);
            console.log(`│       Restaurant: ${matchedRestaurant.name}`);
            console.log(`│       ID: ${matchedRestaurant.id}`);
            console.log(`│       Place ID: ${restaurantData.placeId}`);
            console.log(`│       Confidence: 85% (Google Places)`);
          }
        } else {
          console.log(`│    ❌ FAILED: Google found no matching places`);
        }
      } catch (googleError) {
        console.log(`│    ❌ ERROR: ${googleError.message}`);
      }
    } else if (!matchedRestaurant) {
      console.log('│');
      console.log('│ 🔍 Strategy 3: SKIPPED (No merchant name extracted)');
    }

    console.log('│');
    console.log('└───────────────────────────────────────────────────────┘\n');

    // ========================================================================
    // STEP 3: UPDATE RECEIPT
    // ========================================================================
    console.log('┌─ STEP 3: Update Receipt ─────────────────────────────┐');
    await Receipt.update(
      {
        merchantName: claudeResult.merchantName,
        merchantAddress: claudeResult.merchantAddress,
        oib: claudeResult.oib,
        jir: claudeResult.jir,
        zki: claudeResult.zki,
        totalAmount: claudeResult.totalAmount,
        issueDate: claudeResult.issueDate,
        issueTime: claudeResult.issueTime,
        restaurantId: matchedRestaurant?.id || null,
        fieldConfidences: claudeResult.confidence || {},
        predictedData: {
          ocrPass: 'full',
          matchMethod: matchMethod,
          fullExtractionTime: claudeResult.extractionTime,
          fields: {
            oib: claudeResult.oib,
            jir: claudeResult.jir,
            zki: claudeResult.zki,
            totalAmount: claudeResult.totalAmount,
            issueDate: claudeResult.issueDate,
            issueTime: claudeResult.issueTime,
            merchantName: claudeResult.merchantName,
            merchantAddress: claudeResult.merchantAddress,
          },
          confidences: claudeResult.confidence,
          aiMatchConfidence: matchConfidence,
          extractionTime: claudeResult.extractionTime,
          notes: claudeResult.notes,
        },
        modelVersion: claudeResult.modelVersion || MODEL_VERSION,
      },
      {
        where: { id: receiptId },
      },
    );
    console.log('│ ✅ Receipt updated with OCR data');
    console.log('└───────────────────────────────────────────────────────┘\n');

    // ========================================================================
    // STEP 4: UPDATE VISIT
    // ========================================================================
    console.log('┌─ STEP 4: Update Visit ───────────────────────────────┐');
    if (matchedRestaurant) {
      await Visit.update(
        {
          restaurantId: matchedRestaurant.id,
        },
        {
          where: { id: receipt.visitId },
        },
      );
      console.log(`│ ✅ Visit linked to restaurant: ${matchedRestaurant.name}`);
    } else {
      console.log('│ ⚠️  No restaurant matched - Visit remains unlinked');
      console.log('│    → Admin will manually link restaurant');
    }
    console.log('└───────────────────────────────────────────────────────┘\n');

    const totalDuration = Date.now() - startTime;
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ SUCCESS                          ║');
    console.log(`║    Total Duration: ${totalDuration}ms                  ║`);
    console.log(`║    Match Method: ${matchMethod || 'NONE'}              ║`);
    console.log(
      `║    Confidence: ${matchConfidence ? Math.round(matchConfidence * 100) + '%' : 'N/A'}    ║`,
    );
    console.log('╚════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ❌ ERROR                            ║');
    console.log(`║    ${error.message.padEnd(50)}    ║`);
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Mark receipt for manual review
    try {
      await Receipt.update(
        {
          ocrMethod: 'manual',
          predictedData: {
            error: error.message,
            failedAt: new Date().toISOString(),
          },
        },
        {
          where: { id: receiptId },
        },
      );
    } catch (updateError) {
      console.error(
        `[Background OCR] Failed to update receipt ${receiptId} with error status:`,
        updateError.message,
      );
    }
  }
}

/**
 * Get user's buddies (mutual follows - users who follow each other)
 * GET /api/app/users/buddies
 */
const getUserBuddies = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all users that this user follows
    const following = await UserFollow.findAll({
      where: { followerId: userId },
      attributes: ['followingId'],
    });

    const followingIds = following.map((f) => f.followingId);

    if (followingIds.length === 0) {
      return res.json({ buddies: [] });
    }

    // Find which of those users follow back (mutual follow = buddy)
    const mutualFollows = await UserFollow.findAll({
      where: {
        followerId: followingIds,
        followingId: userId,
      },
      attributes: ['followerId'],
    });

    const buddyIds = mutualFollows.map((f) => f.followerId);

    if (buddyIds.length === 0) {
      return res.json({ buddies: [] });
    }

    // Fetch user details for all buddies
    const buddies = await User.findAll({
      where: { id: buddyIds },
      attributes: ['id', 'name', 'username', 'profileImage'],
    });

    // Add profile image URLs
    const buddiesWithUrls = buddies.map((buddy) => ({
      id: buddy.id,
      name: buddy.name,
      username: buddy.username,
      profileImage: buddy.profileImage
        ? getMediaUrl(buddy.profileImage, 'image')
        : null,
    }));

    res.json({ buddies: buddiesWithUrls });
  } catch (error) {
    console.error('Error fetching user buddies:', error);
    res.status(500).json({ error: 'Failed to fetch buddies' });
  }
};

/**
 * Helper function to check if viewer can see target user's profile
 * @param {string} targetUserId - User whose profile is being viewed
 * @param {string|null} viewerUserId - User viewing the profile (null if unauthenticated)
 * @returns {Promise<{canView: boolean, reason?: string}>}
 */
const canViewUserProfile = async (targetUserId, viewerUserId) => {
  // Owner can always view their own profile
  if (viewerUserId && targetUserId === viewerUserId) {
    return { canView: true };
  }

  // Get target user's privacy settings
  const userSettings = await UserSettings.findOne({
    where: { userId: targetUserId },
  });

  if (!userSettings) {
    return { canView: false, reason: 'User settings not found' };
  }

  const profileVisibility = userSettings.profileVisibility;

  // Public profile - everyone can see (including unauthenticated)
  if (profileVisibility === 'public') {
    return { canView: true };
  }

  // Private profiles require authentication
  if (!viewerUserId) {
    return { canView: false, reason: 'Authentication required for non-public profile' };
  }

  // Followers only - check if viewer follows target user
  if (profileVisibility === 'followers') {
    const isFollowing = await UserFollow.findOne({
      where: {
        followerId: viewerUserId,
        followingId: targetUserId,
      },
    });

    if (!isFollowing) {
      return { canView: false, reason: 'You must follow this user to view their profile' };
    }
    return { canView: true };
  }

  // Buddies only - check if users follow each other (mutual follow)
  if (profileVisibility === 'buddies') {
    const [viewerFollowsTarget, targetFollowsViewer] = await Promise.all([
      UserFollow.findOne({
        where: {
          followerId: viewerUserId,
          followingId: targetUserId,
        },
      }),
      UserFollow.findOne({
        where: {
          followerId: targetUserId,
          followingId: viewerUserId,
        },
      }),
    ]);

    if (!viewerFollowsTarget || !targetFollowsViewer) {
      return { canView: false, reason: 'You must be buddies (mutual follow) to view this profile' };
    }
    return { canView: true };
  }

  return { canView: false, reason: 'Invalid privacy setting' };
};

/**
 * Get other user's visits (with privacy check)
 * GET /api/app/users/:userId/visits
 */
const getOtherUserVisits = async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const viewerUserId = req.user?.id || null;

    // Check if target user exists
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check privacy settings
    const { canView, reason } = await canViewUserProfile(targetUserId, viewerUserId);
    if (!canView) {
      return res.status(403).json({ error: reason || 'Cannot view this profile' });
    }

    // Fetch APPROVED visits only (public shouldn't see pending/rejected)
    const visits = await Visit.findAll({
      where: {
        userId: targetUserId,
        status: 'APPROVED',
      },
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: [
            'id',
            'name',
            'rating',
            'priceLevel',
            'address',
            'place',
            'isClaimed',
            'thumbnailUrl',
            'userRatingsTotal',
          ],
        },
      ],
      order: [['submittedAt', 'DESC']],
    });

    const visitsWithUrls = visits.map((visit) => ({
      id: visit.id,
      submittedAt: visit.submittedAt,
      reviewedAt: visit.reviewedAt,
      wasInMustVisit: visit.wasInMustVisit,
      restaurant: visit.restaurant
        ? {
            ...visit.restaurant.get(),
            thumbnailUrl: visit.restaurant.thumbnailUrl
              ? getMediaUrl(visit.restaurant.thumbnailUrl, 'image')
              : null,
          }
        : null,
    }));

    res.status(200).json(visitsWithUrls);
  } catch (error) {
    console.error('Error fetching user visits:', error);
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
};

module.exports = {
  uploadReceiptAndCreateVisit,
  createVisitFromReceipt,
  createVisit,
  getUserVisits,
  getVisitById,
  retakeReceipt,
  checkHasVisited,
  deleteVisit,
  getUserBuddies,
  getOtherUserVisits,
};
