const {
  Visit,
  Restaurant,
  UserFavorite,
  User,
  Receipt,
  UserSettings,
  UserFollow,
  Experience,
  ExperienceLike,
} = require('../../models');
const { Op } = require('sequelize');
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

    let parsedTaggedBuddies = taggedBuddies;
    if (typeof taggedBuddies === 'string') {
      try {
        parsedTaggedBuddies = JSON.parse(taggedBuddies);
      } catch (e) {
        console.warn(
          '[Visit Create] Failed to parse taggedBuddies JSON, using raw value:',
          e.message,
        );
      }
    }

    if (parsedTaggedBuddies && !Array.isArray(parsedTaggedBuddies))
      parsedTaggedBuddies = [parsedTaggedBuddies];

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
      receiptImageUrl: receipt.mediumUrl || receipt.imageUrl,
      status: 'PENDING',
      wasInMustVisit: wasInMustVisit,
      submittedAt: new Date(),
      taggedBuddies: parsedTaggedBuddies || [],
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

    if (
      parsedTaggedBuddies &&
      parsedTaggedBuddies.length > 0 &&
      finalRestaurantId
    ) {
      for (const buddyId of parsedTaggedBuddies) {
        try {
          // Check if this buddy had restaurant in Must Visit
          const buddyMustVisitEntry = await UserFavorite.findOne({
            where: {
              userId: buddyId,
              restaurantId: finalRestaurantId,
              removedAt: null,
            },
          });

          const buddyWasInMustVisit = !!buddyMustVisitEntry;

          // If buddy had it in Must Visit, soft delete it
          if (buddyMustVisitEntry) {
            await buddyMustVisitEntry.update({
              removedAt: new Date(),
            });
          }

          // Create visit for buddy
          const buddyVisit = await Visit.create({
            userId: buddyId,
            restaurantId: finalRestaurantId || null,
            receiptImageUrl: receipt.mediumUrl || receipt.imageUrl,
            status: 'PENDING',
            wasInMustVisit: buddyWasInMustVisit,
            submittedAt: new Date(),
            taggedBuddies: [visit.id], // Link to main visit
            taggedBy: userId, // Who tagged this buddy
            manualRestaurantName: !finalRestaurantId
              ? manualRestaurantName
              : null,
            manualRestaurantCity: !finalRestaurantId
              ? manualRestaurantCity
              : null,
          });

          // Update Must Visit entry with visit ID if it was removed
          if (buddyMustVisitEntry) {
            await buddyMustVisitEntry.update({
              removedForVisitId: buddyVisit.id,
            });
          }
        } catch (e) {
          console.error(
            `[Visit Create] Failed to create visit for buddy ${buddyId}`,
            e,
          );
        }
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
            'dinverRating',
            'dinverReviewsCount',
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
            'dinverRating',
            'dinverReviewsCount',
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
            'dinverRating',
            'dinverReviewsCount',
            'priceLevel',
            'address',
            'place',
            'latitude',
            'longitude',
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
            'totalAmount',
            'pointsAwarded',
            'reservationId',
            'hasReservationBonus',
          ],
        },
        {
          model: User,
          as: 'tagger',
          attributes: ['id', 'name', 'username', 'profileImage'],
          required: false,
        },
        {
          model: Experience,
          as: 'experience',
          attributes: [
            'id',
            'foodRating',
            'ambienceRating',
            'serviceRating',
            'overallRating',
            'status',
            'publishedAt',
          ],
        },
      ],
      order: [['submittedAt', 'DESC']],
    });

    // Fetch all related visits to build complete participant lists
    const { Op } = require('sequelize');
    const mainVisitIds = new Set();
    visits.forEach((visit) => {
      if (
        visit.taggedBy &&
        visit.taggedBuddies &&
        visit.taggedBuddies.length > 0
      ) {
        mainVisitIds.add(visit.taggedBuddies[0]);
      } else if (
        !visit.taggedBy &&
        visit.taggedBuddies &&
        visit.taggedBuddies.length > 0
      ) {
        mainVisitIds.add(visit.id);
      }
    });

    let allRelatedVisits = [];
    if (mainVisitIds.size > 0) {
      allRelatedVisits = await Visit.findAll({
        where: {
          [Op.or]: [
            { id: { [Op.in]: Array.from(mainVisitIds) } },
            { taggedBuddies: { [Op.overlap]: Array.from(mainVisitIds) } },
          ],
          status: 'APPROVED',
        },
        include: [
          {
            model: User,
            as: 'tagger',
            attributes: ['id', 'name', 'username', 'profileImage'],
            required: false,
          },
        ],
      });
    }

    const visitGroups = new Map();
    const visitIdSet = new Set(visits.map((v) => v.id));
    const allVisits = [...visits, ...allRelatedVisits];

    const visitMap = new Map();
    allVisits.forEach((visit) => {
      if (!visitMap.has(visit.id)) {
        visitMap.set(visit.id, visit);
      }
    });
    const uniqueVisits = Array.from(visitMap.values());

    uniqueVisits.forEach((visit) => {
      if (visit.taggedBuddies && visit.taggedBuddies.length > 0) {
        const firstBuddy = visit.taggedBuddies[0];

        if (visitIdSet.has(firstBuddy)) {
          if (!visitGroups.has(firstBuddy)) {
            visitGroups.set(firstBuddy, {
              allParticipantIds: new Set(),
            });
          }
          visitGroups.get(firstBuddy).allParticipantIds.add(visit.userId);
        } else {
          if (!visitGroups.has(visit.id)) {
            visitGroups.set(visit.id, {
              allParticipantIds: new Set([
                visit.userId,
                ...visit.taggedBuddies,
              ]),
            });
          } else {
            visitGroups.get(visit.id).allParticipantIds.add(visit.userId);
            visit.taggedBuddies.forEach((id) =>
              visitGroups.get(visit.id).allParticipantIds.add(id),
            );
          }
        }
      }
    });

    const allUserIds = new Set();
    visitGroups.forEach((group) => {
      group.allParticipantIds.forEach((id) => allUserIds.add(id));
    });

    let usersMap = new Map();
    if (allUserIds.size > 0) {
      const users = await User.findAll({
        where: { id: Array.from(allUserIds) },
        attributes: ['id', 'name', 'username', 'profileImage'],
      });
      users.forEach((user) => {
        usersMap.set(user.id, {
          id: user.id,
          name: user.name,
          username: user.username,
          profileImage: user.profileImage
            ? getMediaUrl(user.profileImage, 'image', 'original')
            : null,
        });
      });
    }

    // Group visits by restaurant
    const restaurantMap = new Map();

    for (const visit of visits) {
      if (!visit.restaurant) continue;

      const restaurantId = visit.restaurant.id;

      // Find participants for this visit
      let participantIds = [];
      if (visitGroups.has(visit.id)) {
        const group = visitGroups.get(visit.id);
        participantIds = Array.from(group.allParticipantIds).filter(
          (id) => id !== userId && id !== visit.taggedBy,
        );
      } else if (visit.taggedBuddies && visit.taggedBuddies.length > 0) {
        const mainVisitId = visit.taggedBuddies[0];
        if (visitGroups.has(mainVisitId)) {
          const group = visitGroups.get(mainVisitId);
          participantIds = Array.from(group.allParticipantIds).filter(
            (id) => id !== userId && id !== visit.taggedBy,
          );
        }
      }

      // Transform visit data with experience rating
      const visitData = {
        id: visit.id,
        submittedAt: visit.submittedAt,
        reviewedAt: visit.reviewedAt,
        visitDate: visit.visitDate,
        wasInMustVisit: visit.wasInMustVisit,
        taggedBy: visit.tagger
          ? {
              id: visit.tagger.id,
              name: visit.tagger.name,
              username: visit.tagger.username,
              profileImage: visit.tagger.profileImage
                ? getMediaUrl(visit.tagger.profileImage, 'image', 'original')
                : null,
            }
          : null,
        taggedBuddies: participantIds
          .map((id) => usersMap.get(id))
          .filter((user) => user !== undefined),
        totalAmount: visit.receipt?.totalAmount || null,
        pointsAwarded: visit.receipt?.pointsAwarded || null,
        hasReservationBonus: visit.hasReservationBonus || false,
        reservationBonusPoints:
          visit.receipt?.hasReservationBonus &&
          visit.receipt?.pointsAwarded &&
          visit.receipt?.totalAmount
            ? (() => {
                // Calculate number of participants (main user + tagged buddies)
                const totalParticipants = 1 + (participantIds?.length || 0);
                // Calculate base points per person (without bonus)
                const basePointsPerPerson =
                  visit.receipt.totalAmount / totalParticipants / 10;
                // Bonus is the difference between awarded points and base points
                const bonus = visit.receipt.pointsAwarded - basePointsPerPerson;
                return parseFloat(bonus.toFixed(2));
              })()
            : null,
        // Experience rating for this visit
        experience: visit.experience
          ? {
              id: visit.experience.id,
              foodRating: parseFloat(visit.experience.foodRating) || null,
              ambienceRating:
                parseFloat(visit.experience.ambienceRating) || null,
              serviceRating: parseFloat(visit.experience.serviceRating) || null,
              overallRating: parseFloat(visit.experience.overallRating) || null,
              sharesCount: visit.experience.sharesCount || 0,
              likesCount: visit.experience.likesCount || 0,
              status: visit.experience.status,
              publishedAt: visit.experience.publishedAt,
            }
          : null,
      };

      if (restaurantMap.has(restaurantId)) {
        // Add to existing restaurant group
        const group = restaurantMap.get(restaurantId);
        group.visits.push(visitData);
        group.visitCount++;
        // Track experience ratings for average calculation
        if (visit.experience?.overallRating) {
          group._ratings.push(parseFloat(visit.experience.overallRating));
        }
        // Update first visit date if this is older
        const visitDateStr = visit.visitDate || visit.submittedAt;
        if (
          visitDateStr &&
          new Date(visitDateStr) < new Date(group.firstVisitDate)
        ) {
          group.firstVisitDate = visitDateStr;
        }
      } else {
        // Create new restaurant group
        const visitDateStr = visit.visitDate || visit.submittedAt;
        const restaurantData = visit.restaurant.get();
        restaurantMap.set(restaurantId, {
          restaurant: {
            ...restaurantData,
            thumbnailUrl: visit.restaurant.thumbnailUrl
              ? getMediaUrl(visit.restaurant.thumbnailUrl, 'image')
              : null,
            rating:
              restaurantData.rating != null
                ? Number(restaurantData.rating)
                : null,
            userRatingsTotal:
              restaurantData.userRatingsTotal != null
                ? Number(restaurantData.userRatingsTotal)
                : null,
            dinverRating:
              restaurantData.dinverRating != null
                ? Number(restaurantData.dinverRating)
                : null,
            dinverReviewsCount:
              restaurantData.dinverReviewsCount != null
                ? Number(restaurantData.dinverReviewsCount)
                : null,
          },
          visitCount: 1,
          lastVisitDate: visitDateStr,
          firstVisitDate: visitDateStr,
          visits: [visitData],
          // Track ratings for average calculation (internal, will be removed)
          _ratings: visit.experience?.overallRating
            ? [parseFloat(visit.experience.overallRating)]
            : [],
        });
      }
    }

    // Convert map to array, calculate average ratings, sorted by last visit date
    const visitedRestaurants = Array.from(restaurantMap.values())
      .map((group) => {
        // Calculate user's average rating for this restaurant
        const averageRating =
          group._ratings.length > 0
            ? parseFloat(
                (
                  group._ratings.reduce((a, b) => a + b, 0) /
                  group._ratings.length
                ).toFixed(1),
              )
            : null;

        // Remove internal _ratings array
        const { _ratings, ...rest } = group;

        return {
          ...rest,
          userAverageRating: averageRating, // User's average rating for this restaurant
          hasExperience: group._ratings.length > 0,
        };
      })
      .sort((a, b) => new Date(b.lastVisitDate) - new Date(a.lastVisitDate));

    res.status(200).json({
      visitedRestaurants,
      totalRestaurantsVisited: visitedRestaurants.length,
      totalVisits: visits.length,
    });
  } catch (error) {
    console.error('Error fetching visits:', error);
    res.status(500).json({ error: 'Failed to fetch visits' });
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

    const parsedTaggedBuddies = taggedBuddies ? JSON.parse(taggedBuddies) : [];
    if (parsedTaggedBuddies.length > 0) {
      for (const buddyId of parsedTaggedBuddies) {
        try {
          await Visit.create(
            {
              userId: buddyId,
              restaurantId: null,
              receiptImageUrl: imageUrl,
              status: 'PENDING',
              wasInMustVisit: false, // Will be updated after OCR identifies restaurant
              submittedAt: new Date(),
              taggedBuddies: [visit.id],
              taggedBy: userId, // Who tagged this buddy
            },
            { transaction },
          );
          console.log(
            `[Upload & Create Visit] Created buddy visit for user ${buddyId}`,
          );
        } catch (buddyError) {
          console.error(
            `[Upload & Create Visit] Failed to create buddy visit for ${buddyId}:`,
            buddyError.message,
          );
        }
      }
    }

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
      processFullOcrInBackground(
        receiptIdForOcr,
        imageBufferCopy,
        mimeTypeForOcr,
      )
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
    // STEP 4: UPDATE VISIT (and BUDDY VISITS)
    // ========================================================================
    console.log('┌─ STEP 4: Update Visit ───────────────────────────────┐');
    if (matchedRestaurant) {
      const allUserMustVisits = await UserFavorite.findAll({
        where: {
          userId: receipt.userId,
          removedAt: null,
        },
      });

      const mustVisitEntry = await UserFavorite.findOne({
        where: {
          userId: receipt.userId,
          restaurantId: matchedRestaurant.id,
          removedAt: null,
        },
      });

      const wasInMustVisit = !!mustVisitEntry;

      if (wasInMustVisit) {
        await mustVisitEntry.update({
          removedAt: new Date(),
          removedForVisitId: receipt.visitId,
        });
      }

      // Update main visit
      await Visit.update(
        {
          restaurantId: matchedRestaurant.id,
          wasInMustVisit: wasInMustVisit,
        },
        {
          where: { id: receipt.visitId },
        },
      );
      console.log(`│ ✅ Visit linked to restaurant: ${matchedRestaurant.name}`);

      // Find and update all buddy visits
      try {
        const { Op } = require('sequelize');
        const buddyVisits = await Visit.findAll({
          where: {
            taggedBuddies: { [Op.contains]: [receipt.visitId] },
            userId: { [Op.ne]: receipt.userId },
          },
        });

        if (buddyVisits.length > 0) {
          for (const buddyVisit of buddyVisits) {
            const allBuddyMustVisits = await UserFavorite.findAll({
              where: {
                userId: buddyVisit.userId,
                removedAt: null,
              },
            });

            const buddyMustVisitEntry = await UserFavorite.findOne({
              where: {
                userId: buddyVisit.userId,
                restaurantId: matchedRestaurant.id,
                removedAt: null,
              },
            });

            const buddyWasInMustVisit = !!buddyMustVisitEntry;

            if (buddyMustVisitEntry) {
              await buddyMustVisitEntry.update({
                removedAt: new Date(),
                removedForVisitId: buddyVisit.id,
              });
            }

            await buddyVisit.update({
              restaurantId: matchedRestaurant.id,
              wasInMustVisit: buddyWasInMustVisit,
            });
          }
        }
      } catch (buddyUpdateError) {
        console.log(
          '│ ⚠️  Failed to update buddy visits:',
          buddyUpdateError.message,
        );
      }
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
    // Profile images use QUICK strategy (no variants), so use 'original' size
    const buddiesWithUrls = buddies.map((buddy) => ({
      id: buddy.id,
      name: buddy.name,
      username: buddy.username,
      profileImage: buddy.profileImage
        ? getMediaUrl(buddy.profileImage, 'image', 'original')
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
    return {
      canView: false,
      reason: 'Authentication required for non-public profile',
    };
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
      return {
        canView: false,
        reason: 'You must follow this user to view their profile',
      };
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
      return {
        canView: false,
        reason: 'You must be buddies (mutual follow) to view this profile',
      };
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
    const { canView, reason } = await canViewUserProfile(
      targetUserId,
      viewerUserId,
    );
    if (!canView) {
      return res
        .status(403)
        .json({ error: reason || 'Cannot view this profile' });
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
            'dinverRating',
            'dinverReviewsCount',
            'priceLevel',
            'address',
            'place',
            'latitude',
            'longitude',
            'isClaimed',
            'thumbnailUrl',
            'userRatingsTotal',
          ],
        },
        {
          model: Experience,
          as: 'experience',
          attributes: [
            'id',
            'foodRating',
            'ambienceRating',
            'serviceRating',
            'overallRating',
            'status',
            'sharesCount',
            'likesCount',
          ],
        },
      ],
      order: [['submittedAt', 'DESC']],
    });

    // Group visits by restaurant
    const restaurantMap = new Map();

    for (const visit of visits) {
      if (!visit.restaurant) continue;

      const restaurantId = visit.restaurant.id;

      // Transform visit data with experience rating (no receipt info - privacy)
      const visitData = {
        id: visit.id,
        submittedAt: visit.submittedAt,
        reviewedAt: visit.reviewedAt,
        visitDate: visit.visitDate,
        wasInMustVisit: visit.wasInMustVisit,
        // Experience rating for this visit
        experience: visit.experience
          ? {
              id: visit.experience.id,
              overallRating: parseFloat(visit.experience.overallRating) || null,
              sharesCount: visit.experience.sharesCount || 0,
              likesCount: visit.experience.likesCount || 0,
            }
          : null,
      };

      if (restaurantMap.has(restaurantId)) {
        // Add to existing restaurant group
        const group = restaurantMap.get(restaurantId);
        group.visits.push(visitData);
        group.visitCount++;
        // Track experience ratings for average calculation
        if (visit.experience?.overallRating) {
          group._ratings.push(parseFloat(visit.experience.overallRating));
        }
        // Update first visit date if this is older
        const visitDateStr = visit.visitDate || visit.submittedAt;
        if (
          visitDateStr &&
          new Date(visitDateStr) < new Date(group.firstVisitDate)
        ) {
          group.firstVisitDate = visitDateStr;
        }
      } else {
        // Create new restaurant group
        const visitDateStr = visit.visitDate || visit.submittedAt;
        const restaurantData = visit.restaurant.get();
        restaurantMap.set(restaurantId, {
          restaurant: {
            ...restaurantData,
            thumbnailUrl: visit.restaurant.thumbnailUrl
              ? getMediaUrl(visit.restaurant.thumbnailUrl, 'image')
              : null,
            rating:
              restaurantData.rating != null
                ? Number(restaurantData.rating)
                : null,
            userRatingsTotal:
              restaurantData.userRatingsTotal != null
                ? Number(restaurantData.userRatingsTotal)
                : null,
            dinverRating:
              restaurantData.dinverRating != null
                ? Number(restaurantData.dinverRating)
                : null,
            dinverReviewsCount:
              restaurantData.dinverReviewsCount != null
                ? Number(restaurantData.dinverReviewsCount)
                : null,
          },
          visitCount: 1,
          lastVisitDate: visitDateStr,
          firstVisitDate: visitDateStr,
          visits: [visitData],
          // Track ratings for average calculation (internal)
          _ratings: visit.experience?.overallRating
            ? [parseFloat(visit.experience.overallRating)]
            : [],
        });
      }
    }

    // Convert map to array, calculate average ratings, sorted by last visit date
    const visitedRestaurants = Array.from(restaurantMap.values())
      .map((group) => {
        // Calculate user's average rating for this restaurant
        const averageRating =
          group._ratings.length > 0
            ? parseFloat(
                (
                  group._ratings.reduce((a, b) => a + b, 0) /
                  group._ratings.length
                ).toFixed(1),
              )
            : null;

        // Remove internal _ratings array
        const { _ratings, ...rest } = group;

        return {
          ...rest,
          userAverageRating: averageRating,
          hasExperience: group._ratings.length > 0,
        };
      })
      .sort((a, b) => new Date(b.lastVisitDate) - new Date(a.lastVisitDate));

    res.status(200).json({
      visitedRestaurants,
      totalRestaurantsVisited: visitedRestaurants.length,
      totalVisits: visits.length,
    });
  } catch (error) {
    console.error('Error fetching user visits:', error);
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
};

/**
 * GET /api/app/visits/:visitId
 * Returns visit details with restaurant info - used for navigation from notifications
 */
const getVisitById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { visitId } = req.params;

    const visit = await Visit.findOne({
      where: {
        id: visitId,
        userId: userId, 
      },
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: [
            'id',
            'name',
            'rating',
            'dinverRating',
            'dinverReviewsCount',
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
            'totalAmount',
            'pointsAwarded',
            'reservationId',
            'hasReservationBonus',
          ],
        },
        {
          model: User,
          as: 'tagger',
          attributes: ['id', 'name', 'username', 'profileImage'],
          required: false,
        },
        {
          model: Experience,
          as: 'experience',
          attributes: [
            'id',
            'foodRating',
            'ambienceRating',
            'serviceRating',
            'overallRating',
            'description',
            'mealType',
            'likesCount',
            'sharesCount',
            'status',
            'publishedAt',
          ],
        },
      ],
    });

    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    if (!visit.restaurant) {
      return res.status(404).json({ error: 'Restaurant not found for this visit' });
    }

    const response = {
      visit: {
        id: visit.id,
        submittedAt: visit.submittedAt,
        reviewedAt: visit.reviewedAt,
        visitDate: visit.visitDate,
        status: visit.status,
        wasInMustVisit: visit.wasInMustVisit,
        taggedBy: visit.tagger
          ? {
              id: visit.tagger.id,
              name: visit.tagger.name,
              username: visit.tagger.username,
              profileImage: visit.tagger.profileImage
                ? getMediaUrl(visit.tagger.profileImage, 'image', 'original')
                : null,
            }
          : null,
        totalAmount: visit.receipt?.totalAmount || null,
        pointsAwarded: visit.receipt?.pointsAwarded || null,
        hasReservationBonus: visit.hasReservationBonus || false,
        experience: visit.experience
          ? {
              id: visit.experience.id,
              foodRating: parseFloat(visit.experience.foodRating) || null,
              ambienceRating:
                parseFloat(visit.experience.ambienceRating) || null,
              serviceRating: parseFloat(visit.experience.serviceRating) || null,
              overallRating: parseFloat(visit.experience.overallRating) || null,
              description: visit.experience.description,
              mealType: visit.experience.mealType,
              likesCount: visit.experience.likesCount || 0,
              sharesCount: visit.experience.sharesCount || 0,
              status: visit.experience.status,
              publishedAt: visit.experience.publishedAt,
            }
          : null,
      },
      restaurant: {
        ...visit.restaurant.get(),
        thumbnailUrl: visit.restaurant.thumbnailUrl
          ? getMediaUrl(visit.restaurant.thumbnailUrl, 'image')
          : null,
        rating:
          visit.restaurant.rating != null
            ? Number(visit.restaurant.rating)
            : null,
        userRatingsTotal:
          visit.restaurant.userRatingsTotal != null
            ? Number(visit.restaurant.userRatingsTotal)
            : null,
        dinverRating:
          visit.restaurant.dinverRating != null
            ? Number(visit.restaurant.dinverRating)
            : null,
        dinverReviewsCount:
          visit.restaurant.dinverReviewsCount != null
            ? Number(visit.restaurant.dinverReviewsCount)
            : null,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching visit by ID:', error);
    res.status(500).json({ error: 'Failed to fetch visit' });
  }
};

/**
 * Get user's visits for a specific restaurant
 * GET /api/app/visits/restaurant/:restaurantId
 * Returns all visits to a specific restaurant for the current user
 */
const getVisitsByRestaurant = async (req, res) => {
  try {
    const userId = req.user.id;
    const { restaurantId } = req.params;

    // Get restaurant details
    const restaurant = await Restaurant.findByPk(restaurantId, {
      attributes: [
        'id',
        'name',
        'rating',
        'dinverRating',
        'dinverReviewsCount',
        'priceLevel',
        'address',
        'place',
        'isClaimed',
        'thumbnailUrl',
        'userRatingsTotal',
      ],
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Fetch user's APPROVED visits for this restaurant
    const userVisits = await Visit.findAll({
      where: {
        userId: userId,
        restaurantId: restaurantId,
        status: 'APPROVED',
      },
      include: [
        {
          model: Receipt,
          as: 'receipt',
          attributes: [
            'id',
            'totalAmount',
            'pointsAwarded',
            'reservationId',
            'hasReservationBonus',
          ],
        },
        {
          model: User,
          as: 'tagger',
          attributes: ['id', 'name', 'username', 'profileImage'],
          required: false,
        },
        {
          model: Experience,
          as: 'experience',
          attributes: [
            'id',
            'foodRating',
            'ambienceRating',
            'serviceRating',
            'overallRating',
            'description',
            'mealType',
            'likesCount',
            'sharesCount',
            'status',
            'publishedAt',
          ],
          include: [
            {
              model: require('../../models').ExperienceMedia,
              as: 'media',
              attributes: [
                'id',
                'kind',
                'cdnUrl',
                'width',
                'height',
                'orderIndex',
                'thumbnails',
                'caption',
                'isRecommended',
                'menuItemId',
              ],
              include: [
                {
                  model: require('../../models').MenuItem,
                  as: 'menuItem',
                  attributes: ['id', 'restaurantId'],
                  required: false,
                  include: [
                    {
                      model: require('../../models').MenuItemTranslation,
                      as: 'translations',
                      attributes: ['language', 'name'],
                    },
                  ],
                },
              ],
              order: [['orderIndex', 'ASC']],
            },
          ],
        },
      ],
      order: [['submittedAt', 'DESC']],
    });

    const mainVisitIds = new Set();
    userVisits.forEach((visit) => {
      if (
        visit.taggedBy &&
        visit.taggedBuddies &&
        visit.taggedBuddies.length > 0
      ) {
        mainVisitIds.add(visit.taggedBuddies[0]);
      } else if (
        !visit.taggedBy &&
        visit.taggedBuddies &&
        visit.taggedBuddies.length > 0
      ) {
        mainVisitIds.add(visit.id);
      }
    });

    let allRelatedVisits = [];
    if (mainVisitIds.size > 0) {
      const { Op } = require('sequelize');
      allRelatedVisits = await Visit.findAll({
        where: {
          [Op.or]: [
            { id: { [Op.in]: Array.from(mainVisitIds) } }, // Main visits
            { taggedBuddies: { [Op.overlap]: Array.from(mainVisitIds) } }, // Buddy visits
          ],
          restaurantId: restaurantId,
          status: 'APPROVED',
        },
        include: [
          {
            model: User,
            as: 'tagger',
            attributes: ['id', 'name', 'username', 'profileImage'],
            required: false,
          },
        ],
      });
    }

    const visitMap = new Map();
    [...userVisits, ...allRelatedVisits].forEach((visit) => {
      if (!visitMap.has(visit.id)) {
        visitMap.set(visit.id, visit);
      }
    });
    const visits = Array.from(visitMap.values());

    // Get hasLiked status for all experiences
    const experienceIds = visits
      .filter((v) => v.experience)
      .map((v) => v.experience.id);

    let likedIds = [];
    if (experienceIds.length > 0) {
      const likes = await ExperienceLike.findAll({
        where: {
          experienceId: { [Op.in]: experienceIds },
          userId: userId,
        },
        attributes: ['experienceId'],
      });
      likedIds = likes.map((l) => l.experienceId);
    }

    // Strategy: Create map of visit IDs, then identify main vs buddy visits
    const visitGroups = new Map();
    const visitIdSet = new Set(visits.map((v) => v.id));

    visits.forEach((visit) => {
      if (visit.taggedBuddies && visit.taggedBuddies.length > 0) {
        const firstBuddy = visit.taggedBuddies[0];

        // If first buddy is in our visit list, this is a buddy visit
        if (visitIdSet.has(firstBuddy)) {
          if (!visitGroups.has(firstBuddy)) {
            visitGroups.set(firstBuddy, {
              mainVisit: null,
              relatedVisits: [],
              allParticipantIds: new Set(),
            });
          }
          visitGroups.get(firstBuddy).relatedVisits.push(visit);
          visitGroups.get(firstBuddy).allParticipantIds.add(visit.userId);
        } else {
          // This is a main visit (tagged other users)
          if (!visitGroups.has(visit.id)) {
            visitGroups.set(visit.id, {
              mainVisit: visit,
              relatedVisits: [],
              allParticipantIds: new Set([
                visit.userId,
                ...visit.taggedBuddies,
              ]),
            });
          } else {
            visitGroups.get(visit.id).mainVisit = visit;
            visitGroups.get(visit.id).allParticipantIds.add(visit.userId);
            visit.taggedBuddies.forEach((id) =>
              visitGroups.get(visit.id).allParticipantIds.add(id),
            );
          }
        }
      }
    });

    // Collect all unique user IDs from all groups
    const allUserIds = new Set();
    visitGroups.forEach((group) => {
      group.allParticipantIds.forEach((userId) => allUserIds.add(userId));
    });

    // Fetch all users in one query
    let usersMap = new Map();
    if (allUserIds.size > 0) {
      const users = await User.findAll({
        where: { id: Array.from(allUserIds) },
        attributes: ['id', 'name', 'username', 'profileImage'],
      });

      users.forEach((user) => {
        usersMap.set(user.id, {
          id: user.id,
          name: user.name,
          username: user.username,
          profileImage: user.profileImage
            ? getMediaUrl(user.profileImage, 'image', 'original')
            : null,
        });
      });
    }

    // Filter to only show visits that belong to the current user
    // Each person has their own visit record (main or buddy visit)
    const currentUserVisits = visits.filter((visit) => visit.userId === userId);

    const visitsData = currentUserVisits.map((visit) => {
      // Find which group this visit belongs to
      let participantIds = [];

      // Check if this is a main visit
      if (visitGroups.has(visit.id)) {
        const group = visitGroups.get(visit.id);
        participantIds = Array.from(group.allParticipantIds).filter(
          (id) => id !== userId && id !== visit.taggedBy,
        );
      } else if (visit.taggedBuddies && visit.taggedBuddies.length > 0) {
        // Check if this is a related visit (tagged buddy)
        const mainVisitId = visit.taggedBuddies[0];
        if (visitGroups.has(mainVisitId)) {
          const group = visitGroups.get(mainVisitId);
          participantIds = Array.from(group.allParticipantIds).filter(
            (id) => id !== userId && id !== visit.taggedBy,
          );
        }
      }

      return {
        id: visit.id,
        submittedAt: visit.submittedAt,
        reviewedAt: visit.reviewedAt,
        visitDate: visit.visitDate,
        wasInMustVisit: visit.wasInMustVisit || false,
        taggedBy: visit.tagger
          ? {
              id: visit.tagger.id,
              name: visit.tagger.name,
              username: visit.tagger.username,
              profileImage: visit.tagger.profileImage
                ? getMediaUrl(visit.tagger.profileImage, 'image', 'original')
                : null,
            }
          : null,
        taggedBuddies: participantIds
          .map((userId) => usersMap.get(userId))
          .filter((user) => user !== undefined),
        totalAmount: visit.receipt?.totalAmount || null,
        pointsAwarded: visit.receipt?.pointsAwarded || null,
        hasReservationBonus: visit.hasReservationBonus || false,
        reservationBonusPoints:
          visit.receipt?.hasReservationBonus &&
          visit.receipt?.pointsAwarded &&
          visit.receipt?.totalAmount
            ? (() => {
                // Calculate number of participants (main user + tagged buddies)
                const totalParticipants = 1 + (participantIds?.length || 0);
                // Calculate base points per person (without bonus)
                const basePointsPerPerson =
                  visit.receipt.totalAmount / totalParticipants / 10;
                // Bonus is the difference between awarded points and base points
                const bonus = visit.receipt.pointsAwarded - basePointsPerPerson;
                return parseFloat(bonus.toFixed(2));
              })()
            : null,
        experience: visit.experience
          ? {
              id: visit.experience.id,
              foodRating: parseFloat(visit.experience.foodRating) || null,
              ambienceRating:
                parseFloat(visit.experience.ambienceRating) || null,
              serviceRating: parseFloat(visit.experience.serviceRating) || null,
              overallRating: parseFloat(visit.experience.overallRating) || null,
              description: visit.experience.description || null,
              mealType: visit.experience.mealType || null,
              likesCount: visit.experience.likesCount || 0,
              sharesCount: visit.experience.sharesCount || 0,
              publishedAt: visit.experience.publishedAt || null,
              hasLiked: likedIds.includes(visit.experience.id),
              media: visit.experience.media
                ? visit.experience.media.map((m) => ({
                    id: m.id,
                    kind: m.kind,
                    cdnUrl: m.cdnUrl
                      ? getMediaUrl(m.cdnUrl, 'image', 'original')
                      : null,
                    width: m.width,
                    height: m.height,
                    orderIndex: m.orderIndex,
                    caption: m.caption,
                    isRecommended: m.isRecommended,
                    menuItemId: m.menuItemId,
                    menuItem: m.menuItem
                      ? {
                          id: m.menuItem.id,
                          restaurantId: m.menuItem.restaurantId,
                          translations: m.menuItem.translations || [],
                        }
                      : null,
                  }))
                : [],
            }
          : null,
      };
    });

    res.status(200).json({
      restaurant: {
        ...restaurant.get(),
        thumbnailUrl: restaurant.thumbnailUrl
          ? getMediaUrl(restaurant.thumbnailUrl, 'image', 'thumbnail')
          : null,
      },
      visitCount: currentUserVisits.length,
      visits: visitsData,
    });
  } catch (error) {
    console.error('Error fetching visits by restaurant:', error);
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
};

/**
 * Get other user's visits for a specific restaurant (with privacy check)
 * GET /api/app/users/:userId/visits/restaurant/:restaurantId
 * Returns all visits to a specific restaurant for another user
 */
const getOtherUserVisitsByRestaurant = async (req, res) => {
  try {
    const { userId: targetUserId, restaurantId } = req.params;
    const viewerUserId = req.user?.id || null;

    // Check if target user exists
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check privacy settings
    const { canView, reason } = await canViewUserProfile(
      targetUserId,
      viewerUserId,
    );
    if (!canView) {
      return res
        .status(403)
        .json({ error: reason || 'Cannot view this profile' });
    }

    // Get restaurant details
    const restaurant = await Restaurant.findByPk(restaurantId, {
      attributes: [
        'id',
        'name',
        'rating',
        'dinverRating',
        'dinverReviewsCount',
        'priceLevel',
        'address',
        'place',
        'isClaimed',
        'thumbnailUrl',
        'userRatingsTotal',
      ],
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Fetch all APPROVED visits for this restaurant and user
    const visits = await Visit.findAll({
      where: {
        userId: targetUserId,
        restaurantId: restaurantId,
        status: 'APPROVED',
      },
      include: [
        {
          model: User,
          as: 'tagger',
          attributes: ['id', 'name', 'username', 'profileImage'],
          required: false,
        },
        {
          model: Experience,
          as: 'experience',
          attributes: [
            'id',
            'foodRating',
            'ambienceRating',
            'serviceRating',
            'overallRating',
            'description',
            'mealType',
            'likesCount',
            'sharesCount',
            'status',
            'publishedAt',
          ],
          include: [
            {
              model: require('../../models').ExperienceMedia,
              as: 'media',
              attributes: [
                'id',
                'kind',
                'cdnUrl',
                'width',
                'height',
                'orderIndex',
                'thumbnails',
                'caption',
                'isRecommended',
                'menuItemId',
              ],
              include: [
                {
                  model: require('../../models').MenuItem,
                  as: 'menuItem',
                  attributes: ['id', 'restaurantId'],
                  required: false,
                  include: [
                    {
                      model: require('../../models').MenuItemTranslation,
                      as: 'translations',
                      attributes: ['language', 'name'],
                    },
                  ],
                },
              ],
              order: [['orderIndex', 'ASC']],
            },
          ],
        },
      ],
      order: [['submittedAt', 'DESC']],
    });

    const mainVisitIds = new Set();
    visits.forEach((visit) => {
      if (
        visit.taggedBy &&
        visit.taggedBuddies &&
        visit.taggedBuddies.length > 0
      ) {
        mainVisitIds.add(visit.taggedBuddies[0]);
      } else if (
        !visit.taggedBy &&
        visit.taggedBuddies &&
        visit.taggedBuddies.length > 0
      ) {
        mainVisitIds.add(visit.id);
      }
    });

    let allRelatedVisits = [];
    if (mainVisitIds.size > 0) {
      allRelatedVisits = await Visit.findAll({
        where: {
          [Op.or]: [
            { id: { [Op.in]: Array.from(mainVisitIds) } },
            { taggedBuddies: { [Op.overlap]: Array.from(mainVisitIds) } },
          ],
          restaurantId: restaurantId,
          status: 'APPROVED',
        },
        include: [
          {
            model: User,
            as: 'tagger',
            attributes: ['id', 'name', 'username', 'profileImage'],
            required: false,
          },
        ],
      });
    }

    const allVisits = [...visits, ...allRelatedVisits];
    const visitMap = new Map();
    allVisits.forEach((visit) => {
      if (!visitMap.has(visit.id)) {
        visitMap.set(visit.id, visit);
      }
    });
    const uniqueVisits = Array.from(visitMap.values());

    // Get hasLiked status for all experiences if viewer is authenticated
    const experienceIds = visits
      .filter((v) => v.experience)
      .map((v) => v.experience.id);

    let likedIds = [];
    if (viewerUserId && experienceIds.length > 0) {
      const likes = await ExperienceLike.findAll({
        where: {
          experienceId: { [Op.in]: experienceIds },
          userId: viewerUserId,
        },
        attributes: ['experienceId'],
      });
      likedIds = likes.map((l) => l.experienceId);
    }

    const visitGroups = new Map();
    const visitIdSet = new Set(visits.map((v) => v.id));

    // First pass: identify main visits and buddy visits using all unique visits
    uniqueVisits.forEach((visit) => {
      if (visit.taggedBuddies && visit.taggedBuddies.length > 0) {
        const firstBuddy = visit.taggedBuddies[0];

        if (visitIdSet.has(firstBuddy)) {
          // This is a buddy's visit
          if (!visitGroups.has(firstBuddy)) {
            visitGroups.set(firstBuddy, {
              mainVisit: null,
              relatedVisits: [],
              allParticipantIds: new Set(),
            });
          }
          visitGroups.get(firstBuddy).relatedVisits.push(visit);
          visitGroups.get(firstBuddy).allParticipantIds.add(visit.userId);
        } else {
          // This is a main visit
          if (!visitGroups.has(visit.id)) {
            visitGroups.set(visit.id, {
              mainVisit: visit,
              relatedVisits: [],
              allParticipantIds: new Set([
                visit.userId,
                ...visit.taggedBuddies,
              ]),
            });
          } else {
            visitGroups.get(visit.id).mainVisit = visit;
            visitGroups.get(visit.id).allParticipantIds.add(visit.userId);
            visit.taggedBuddies.forEach((id) =>
              visitGroups.get(visit.id).allParticipantIds.add(id),
            );
          }
        }
      }
    });

    const allUserIds = new Set();
    visitGroups.forEach((group) => {
      group.allParticipantIds.forEach((userId) => allUserIds.add(userId));
    });

    let usersMap = new Map();
    if (allUserIds.size > 0) {
      const users = await User.findAll({
        where: { id: Array.from(allUserIds) },
        attributes: ['id', 'name', 'username', 'profileImage'],
      });

      users.forEach((user) => {
        usersMap.set(user.id, {
          id: user.id,
          name: user.name,
          username: user.username,
          profileImage: user.profileImage
            ? getMediaUrl(user.profileImage, 'image', 'original')
            : null,
        });
      });
    }

    // Don't include receipt info (totalAmount, pointsAwarded) for privacy
    const visitsData = visits.map((visit) => {
      let participantIds = [];

      if (visitGroups.has(visit.id)) {
        const group = visitGroups.get(visit.id);
        participantIds = Array.from(group.allParticipantIds).filter(
          (id) => id !== targetUserId && id !== visit.taggedBy,
        );
      } else if (visit.taggedBuddies && visit.taggedBuddies.length > 0) {
        const mainVisitId = visit.taggedBuddies[0];
        if (visitGroups.has(mainVisitId)) {
          const group = visitGroups.get(mainVisitId);
          participantIds = Array.from(group.allParticipantIds).filter(
            (id) => id !== targetUserId && id !== visit.taggedBy,
          );
        }
      }

      return {
        id: visit.id,
        submittedAt: visit.submittedAt,
        reviewedAt: visit.reviewedAt,
        visitDate: visit.visitDate,
        wasInMustVisit: visit.wasInMustVisit || false,
        hasReservationBonus: visit.hasReservationBonus || false,
        taggedBy: visit.tagger
          ? {
              id: visit.tagger.id,
              name: visit.tagger.name,
              username: visit.tagger.username,
              profileImage: visit.tagger.profileImage
                ? getMediaUrl(visit.tagger.profileImage, 'image', 'original')
                : null,
            }
          : null,
        taggedBuddies: participantIds
          .map((userId) => usersMap.get(userId))
          .filter((user) => user !== undefined),
        experience: visit.experience
          ? {
              id: visit.experience.id,
              foodRating: parseFloat(visit.experience.foodRating) || null,
              ambienceRating:
                parseFloat(visit.experience.ambienceRating) || null,
              serviceRating: parseFloat(visit.experience.serviceRating) || null,
              overallRating: parseFloat(visit.experience.overallRating) || null,
              description: visit.experience.description || null,
              mealType: visit.experience.mealType || null,
              likesCount: visit.experience.likesCount || 0,
              sharesCount: visit.experience.sharesCount || 0,
              publishedAt: visit.experience.publishedAt || null,
              hasLiked: likedIds.includes(visit.experience.id),
              media: visit.experience.media
                ? visit.experience.media.map((m) => ({
                    id: m.id,
                    kind: m.kind,
                    cdnUrl: m.cdnUrl ? getMediaUrl(m.cdnUrl, 'image') : null,
                    storageKey: m.storageKey,
                    width: m.width,
                    height: m.height,
                    orderIndex: m.orderIndex,
                    thumbnails: m.thumbnails
                      ? {
                          small: m.thumbnails.small
                            ? getMediaUrl(m.thumbnails.small, 'image')
                            : null,
                          medium: m.thumbnails.medium
                            ? getMediaUrl(m.thumbnails.medium, 'image')
                            : null,
                          large: m.thumbnails.large
                            ? getMediaUrl(m.thumbnails.large, 'image')
                            : null,
                        }
                      : null,
                    caption: m.caption,
                    isRecommended: m.isRecommended,
                    menuItemId: m.menuItemId,
                    menuItem: m.menuItem
                      ? {
                          id: m.menuItem.id,
                          restaurantId: m.menuItem.restaurantId,
                          translations: m.menuItem.translations || [],
                        }
                      : null,
                  }))
                : [],
            }
          : null,
      };
    });

    res.status(200).json({
      restaurant: {
        ...restaurant.get(),
        thumbnailUrl: restaurant.thumbnailUrl
          ? getMediaUrl(restaurant.thumbnailUrl, 'image')
          : null,
      },
      visitCount: visits.length,
      visits: visitsData,
    });
  } catch (error) {
    console.error('Error fetching visits by restaurant:', error);
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
};

/**
 * Get restaurant visitors (users who visited this restaurant)
 * GET /api/app/restaurants/:restaurantId/visitors
 *
 * Returns list of users who visited the restaurant, grouped by user,
 * with their average rating and visit count.
 *
 * Example response:
 * {
 *   visitors: [
 *     {
 *       user: { id, name, username, profileImage },
 *       visitCount: 3,
 *       userAverageRating: 8.5,
 *       lastVisitDate: "2025-11-25",
 *       visits: [
 *         { id, visitDate, experience: { overallRating: 8.0 } },
 *         { id, visitDate, experience: { overallRating: 9.0 } }
 *       ]
 *     }
 *   ]
 * }
 */
const getRestaurantVisitors = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Check restaurant exists
    const restaurant = await Restaurant.findByPk(restaurantId, {
      attributes: ['id', 'name', 'place', 'isClaimed'],
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Get all APPROVED visits for this restaurant
    const visits = await Visit.findAll({
      where: {
        restaurantId,
        status: 'APPROVED',
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'username', 'profileImage'],
        },
        {
          model: Experience,
          as: 'experience',
          attributes: [
            'id',
            'overallRating',
            'status',
            'sharesCount',
            'likesCount',
          ],
          where: { status: 'APPROVED' },
          required: false,
        },
      ],
      order: [['submittedAt', 'DESC']],
    });

    // Group by user
    const userMap = new Map();

    for (const visit of visits) {
      if (!visit.user) continue;

      const visitorId = visit.user.id;
      const visitDateStr = visit.visitDate || visit.submittedAt;

      const visitData = {
        id: visit.id,
        visitDate: visitDateStr,
        experience: visit.experience
          ? {
              id: visit.experience.id,
              overallRating: parseFloat(visit.experience.overallRating) || null,
              sharesCount: visit.experience.sharesCount || 0,
              likesCount: visit.experience.likesCount || 0,
            }
          : null,
      };

      if (userMap.has(visitorId)) {
        const group = userMap.get(visitorId);
        group.visits.push(visitData);
        group.visitCount++;
        if (visit.experience?.overallRating) {
          group._ratings.push(parseFloat(visit.experience.overallRating));
        }
        // Update last visit date if this is more recent
        if (
          visitDateStr &&
          new Date(visitDateStr) > new Date(group.lastVisitDate)
        ) {
          group.lastVisitDate = visitDateStr;
        }
      } else {
        userMap.set(visitorId, {
          user: {
            id: visit.user.id,
            name: visit.user.name,
            username: visit.user.username,
            profileImage: visit.user.profileImage
              ? getMediaUrl(visit.user.profileImage, 'image', 'original')
              : null,
          },
          visitCount: 1,
          lastVisitDate: visitDateStr,
          visits: [visitData],
          _ratings: visit.experience?.overallRating
            ? [parseFloat(visit.experience.overallRating)]
            : [],
        });
      }
    }

    // Convert map to array with calculated averages
    const visitors = Array.from(userMap.values())
      .map((group) => {
        const averageRating =
          group._ratings.length > 0
            ? parseFloat(
                (
                  group._ratings.reduce((a, b) => a + b, 0) /
                  group._ratings.length
                ).toFixed(1),
              )
            : null;

        const { _ratings, ...rest } = group;

        return {
          ...rest,
          userAverageRating: averageRating,
          hasExperience: group._ratings.length > 0,
        };
      })
      // Sort by visit count (most visits first), then by last visit date
      .sort((a, b) => {
        if (b.visitCount !== a.visitCount) {
          return b.visitCount - a.visitCount;
        }
        return new Date(b.lastVisitDate) - new Date(a.lastVisitDate);
      });

    // Apply pagination
    const paginatedVisitors = visitors.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit),
    );

    res.status(200).json({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        place: restaurant.place,
        isClaimed: restaurant.isClaimed,
      },
      visitors: paginatedVisitors,
      totalVisitors: visitors.length,
      totalVisits: visits.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < visitors.length,
      },
    });
  } catch (error) {
    console.error('Error fetching restaurant visitors:', error);
    res.status(500).json({ error: 'Failed to fetch visitors' });
  }
};

/**
 * Get user's visits for map (optimized - only ID, lat, lng)
 * GET /api/app/visits/map

 */
const getUserVisitsForMap = async (req, res) => {
  try {
    const userId = req.user.id;

    const visits = await Visit.findAll({
      where: {
        userId: userId,
        status: 'APPROVED',
        restaurantId: { [Op.not]: null },
      },
      attributes: ['id'],
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'latitude', 'longitude', 'place', 'country'],
          where: {
            latitude: { [Op.not]: null },
            longitude: { [Op.not]: null },
          },
          required: true,
        },
      ],
      raw: true,
    });

    const mapVisits = visits.map((visit) => ({
      visitId: visit.id,
      restaurantId: visit['restaurant.id'],
      latitude: parseFloat(visit['restaurant.latitude']),
      longitude: parseFloat(visit['restaurant.longitude']),
    }));

    const uniqueRestaurants = new Set(mapVisits.map((v) => v.restaurantId));
    
    const uniqueCities = new Set(
      visits
        .map((v) => v['restaurant.place'])
        .filter((place) => place && place.trim() !== '')
    );
    
    const uniqueCountries = new Set(
      visits
        .map((v) => v['restaurant.country'])
        .filter((country) => country && country.trim() !== '')
    );

    res.status(200).json({
      visits: mapVisits,
      total: uniqueRestaurants.size,
      cityCount: uniqueCities.size,
      countries: Array.from(uniqueCountries),
    });
  } catch (error) {
    console.error('Error fetching visits for map:', error);
    res.status(500).json({ error: 'Failed to fetch visits for map' });
  }
};

/**
 * Get other user's visits for map (optimized - only ID, lat, lng)
 * GET /api/app/users/:userId/visits/map
 */
const getOtherUserVisitsForMap = async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const viewerUserId = req.user?.id || null;

    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const { canView, reason } = await canViewUserProfile(
      targetUserId,
      viewerUserId,
    );
    if (!canView)
      return res
        .status(403)
        .json({ error: reason || 'Cannot view this profile' });

    const visits = await Visit.findAll({
      where: {
        userId: targetUserId,
        status: 'APPROVED',
        restaurantId: { [Op.not]: null },
      },
      attributes: ['id'],
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'latitude', 'longitude', 'place', 'country'],
          where: {
            latitude: { [Op.not]: null },
            longitude: { [Op.not]: null },
          },
          required: true,
        },
      ],
      raw: true,
    });

    const mapVisits = visits.map((visit) => ({
      visitId: visit.id,
      restaurantId: visit['restaurant.id'],
      latitude: parseFloat(visit['restaurant.latitude']),
      longitude: parseFloat(visit['restaurant.longitude']),
    }));

    const uniqueRestaurants = new Set(mapVisits.map((v) => v.restaurantId));
    
    const uniqueCities = new Set(
      visits
        .map((v) => v['restaurant.place'])
        .filter((place) => place && place.trim() !== '')
    );
    
    const uniqueCountries = new Set(
      visits
        .map((v) => v['restaurant.country'])
        .filter((country) => country && country.trim() !== '')
    );

    res.status(200).json({
      visits: mapVisits,
      total: uniqueRestaurants.size,
      cityCount: uniqueCities.size,
      countries: Array.from(uniqueCountries),
    });
  } catch (error) {
    console.error('Error fetching user visits for map:', error);
    res.status(500).json({ error: 'Failed to fetch visits for map' });
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
  getOtherUserVisitsByRestaurant,
  getVisitsByRestaurant,
  getRestaurantVisitors,
  getUserVisitsForMap,
  getOtherUserVisitsForMap,
};
