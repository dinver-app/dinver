const { Visit, Restaurant, UserFavorite, User, Receipt } = require('../../models');
const { getMediaUrl } = require('../../config/cdn');
const { uploadVariantsToS3 } = require('../../utils/s3Upload');
const { processImage } = require('../../utils/imageProcessor');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');
const {
  searchPlacesByText,
  getPlaceDetails,
  transformToRestaurantData,
} = require('../services/googlePlacesService');
const { findRestaurantWithClaude } = require('../services/claudeOcrService');

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
    const { receiptId, restaurantId, taggedBuddies, restaurantData, manualRestaurantName, manualRestaurantCity } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!receiptId) {
      return res.status(400).json({ error: 'Receipt ID is required' });
    }

    console.log(`[Visit Create] Creating visit from receipt ${receiptId} for user ${userId}`);

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

        const parsedRestaurantData = typeof restaurantData === 'string'
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
            websiteUrl: parsedRestaurantData.websiteUrl || parsedRestaurantData.website,
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
            const existingRestaurant = await Restaurant.findByPlaceId(matchedPlaceId);

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
          console.log('[Visit Create] No Google Places results for manual search');
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
    if (!finalRestaurantId && (!manualRestaurantName || !manualRestaurantCity)) {
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

    console.log(`[Visit Create] Visit created: ${visit.id}${!finalRestaurantId ? ' (with manual restaurant data)' : ''}`);

    // Update Receipt with visitId and restaurantId
    await receipt.update({
      visitId: visit.id,
      restaurantId: finalRestaurantId,
    });

    console.log(`[Visit Create] Receipt ${receipt.id} linked to visit ${visit.id}`);

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
      receipt: visitWithDetails.receipt ? {
        id: visitWithDetails.receipt.id,
        thumbnailUrl: visitWithDetails.receipt.thumbnailUrl ? getMediaUrl(visitWithDetails.receipt.thumbnailUrl, 'image') : null,
        mediumUrl: visitWithDetails.receipt.mediumUrl ? getMediaUrl(visitWithDetails.receipt.mediumUrl, 'image') : null,
        fullscreenUrl: visitWithDetails.receipt.fullscreenUrl ? getMediaUrl(visitWithDetails.receipt.fullscreenUrl, 'image') : null,
        originalUrl: visitWithDetails.receipt.originalUrl ? getMediaUrl(visitWithDetails.receipt.originalUrl, 'image') : null,
        status: visitWithDetails.receipt.status,
        oib: visitWithDetails.receipt.oib,
        totalAmount: visitWithDetails.receipt.totalAmount,
        issueDate: visitWithDetails.receipt.issueDate,
      } : null,
      restaurant: visitWithDetails.restaurant ? {
        ...visitWithDetails.restaurant.get(),
        thumbnailUrl: visitWithDetails.restaurant.thumbnailUrl
          ? getMediaUrl(visitWithDetails.restaurant.thumbnailUrl, 'image')
          : null,
        isNew: !!autoCreatedRestaurant,
      } : null,
    };

    let message;
    if (autoCreatedRestaurant) {
      message = `Visit created! Novi restoran "${autoCreatedRestaurant.name}" dodan u sustav.`;
    } else if (!finalRestaurantId) {
      message = 'Visit created! Restoran će biti spojen od strane administratora.';
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
      const uploadResult = await uploadVariantsToS3(variants, folder, baseFileName);

      imageVariants = uploadResult.variants;

      // Use medium variant as the main URL (for backward compatibility)
      receiptImageUrl = imageVariants.medium || imageVariants.fullscreen || imageVariants.thumbnail;

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
        details: error.message
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
      receipt: visitWithRestaurant.receipt ? {
        id: visitWithRestaurant.receipt.id,
        thumbnailUrl: visitWithRestaurant.receipt.thumbnailUrl ? getMediaUrl(visitWithRestaurant.receipt.thumbnailUrl, 'image') : null,
        mediumUrl: visitWithRestaurant.receipt.mediumUrl ? getMediaUrl(visitWithRestaurant.receipt.mediumUrl, 'image') : null,
        fullscreenUrl: visitWithRestaurant.receipt.fullscreenUrl ? getMediaUrl(visitWithRestaurant.receipt.fullscreenUrl, 'image') : null,
        originalUrl: visitWithRestaurant.receipt.originalUrl ? getMediaUrl(visitWithRestaurant.receipt.originalUrl, 'image') : null,
        status: visitWithRestaurant.receipt.status,
      } : null,
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

// Get user's visited list
const getUserVisits = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query; // Optional filter by status

    const whereClause = { userId: userId };
    if (status) {
      whereClause.status = status;
    }

    const visits = await Visit.findAll({
      where: whereClause,
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

    const visitsWithUrls = visits.map((visit) => ({
      ...visit.get(),
      receiptImageUrl: getMediaUrl(visit.receiptImageUrl, 'image'),
      receipt: visit.receipt ? {
        id: visit.receipt.id,
        thumbnailUrl: visit.receipt.thumbnailUrl ? getMediaUrl(visit.receipt.thumbnailUrl, 'image') : null,
        mediumUrl: visit.receipt.mediumUrl ? getMediaUrl(visit.receipt.mediumUrl, 'image') : null,
        fullscreenUrl: visit.receipt.fullscreenUrl ? getMediaUrl(visit.receipt.fullscreenUrl, 'image') : null,
        originalUrl: visit.receipt.originalUrl ? getMediaUrl(visit.receipt.originalUrl, 'image') : null,
        status: visit.receipt.status,
      } : null,
      restaurant: {
        ...visit.restaurant.get(),
        thumbnailUrl: visit.restaurant.thumbnailUrl
          ? getMediaUrl(visit.restaurant.thumbnailUrl, 'image')
          : null,
      },
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
      receipt: visit.receipt ? {
        id: visit.receipt.id,
        thumbnailUrl: visit.receipt.thumbnailUrl ? getMediaUrl(visit.receipt.thumbnailUrl, 'image') : null,
        mediumUrl: visit.receipt.mediumUrl ? getMediaUrl(visit.receipt.mediumUrl, 'image') : null,
        fullscreenUrl: visit.receipt.fullscreenUrl ? getMediaUrl(visit.receipt.fullscreenUrl, 'image') : null,
        originalUrl: visit.receipt.originalUrl ? getMediaUrl(visit.receipt.originalUrl, 'image') : null,
        status: visit.receipt.status,
      } : null,
      restaurant: {
        ...visit.restaurant.get(),
        thumbnailUrl: visit.restaurant.thumbnailUrl
          ? getMediaUrl(visit.restaurant.thumbnailUrl, 'image')
          : null,
      },
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
      const uploadResult = await uploadVariantsToS3(variants, folder, baseFileName);

      const imageVariants = uploadResult.variants;
      receiptImageUrl = imageVariants.medium || imageVariants.fullscreen || imageVariants.thumbnail;

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
        details: error.message
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
      receipt: updatedVisit.receipt ? {
        id: updatedVisit.receipt.id,
        thumbnailUrl: updatedVisit.receipt.thumbnailUrl ? getMediaUrl(updatedVisit.receipt.thumbnailUrl, 'image') : null,
        mediumUrl: updatedVisit.receipt.mediumUrl ? getMediaUrl(updatedVisit.receipt.mediumUrl, 'image') : null,
        fullscreenUrl: updatedVisit.receipt.fullscreenUrl ? getMediaUrl(updatedVisit.receipt.fullscreenUrl, 'image') : null,
        originalUrl: updatedVisit.receipt.originalUrl ? getMediaUrl(updatedVisit.receipt.originalUrl, 'image') : null,
        status: updatedVisit.receipt.status,
      } : null,
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
      if (receipt.thumbnailUrl || receipt.mediumUrl || receipt.fullscreenUrl || receipt.originalUrl) {
        try {
          const deleteResult = await deleteImageVariants(
            receipt.thumbnailUrl,
            receipt.mediumUrl,
            receipt.fullscreenUrl,
            receipt.originalUrl,
          );
          console.log(`Deleted ${deleteResult.deletedCount} receipt image variant(s) from S3`);
        } catch (s3Error) {
          console.error('Error deleting receipt images from S3:', s3Error.message);
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

module.exports = {
  createVisitFromReceipt, // NEW: Create visit from existing receipt
  createVisit, // LEGACY: Old flow (kept for backward compatibility)
  getUserVisits,
  getVisitById,
  retakeReceipt,
  checkHasVisited,
  deleteVisit,
};
