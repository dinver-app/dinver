const { Receipt, Restaurant, User } = require('../../models');
const { uploadVariantsToS3 } = require('../../utils/s3Upload');
const { processImage } = require('../../utils/imageProcessor');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const {
  extractReceiptWithClaude,
  findRestaurantWithClaude,
  validateReceiptWithClaude,
  MODEL_VERSION,
} = require('../services/claudeOcrService');
const {
  searchPlacesByText,
  getPlaceDetails,
  transformToRestaurantData,
} = require('../services/googlePlacesService');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');

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
 * Upload receipt and process with Claude OCR
 * Does NOT create Visit - only creates Receipt with extracted data
 * Returns restaurant match or needsRestaurantSelection flag
 *
 * POST /api/app/receipts
 */
const uploadReceipt = async (req, res) => {
  try {
    const userId = req.user.id;
    const { locationLat, locationLng, gpsAccuracy } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Receipt image is required' });
    }

    console.log(
      '[Receipt Upload] Starting receipt processing for user:',
      userId,
    );

    // === STEP 1: Validate image is actually a receipt (BEFORE processing/uploading) ===
    // OPTIMIZATION: Validation disabled for app uploads to save $0.01 + 3.4s per receipt
    // Users upload from "receipt upload" screen, so they already expect to upload receipts
    // Re-enable by uncommenting the code below if needed for fraud prevention
    /*
    try {
      console.log('[Receipt Upload] Validating image is a receipt...');
      const validation = await validateReceiptWithClaude(
        req.file.buffer,
        file.mimetype,
      );

      if (!validation.isReceipt) {
        console.log(
          '[Receipt Upload] Image is not a receipt:',
          validation.reason,
        );
        return res.status(400).json({
          error:
            'Slika ne izgleda kao račun. Molimo učitajte jasnu fotografiju računa.',
          details: validation.reason,
          confidence: validation.confidence,
        });
      }

      console.log(
        '[Receipt Upload] Image validated as receipt (confidence:',
        validation.confidence,
        ')',
      );
    } catch (validationError) {
      console.error('[Receipt Upload] Validation failed:', validationError);
      // Continue processing even if validation fails (fail open)
    }
    */
    console.log('[Receipt Upload] Skipping validation (optimization enabled)');

    // === STEP 2: Calculate image hash for duplicate detection ===
    const imageHash = crypto
      .createHash('md5')
      .update(req.file.buffer)
      .digest('hex');

    // Check for exact duplicate
    const exactDuplicate = await Receipt.findOne({
      where: { imageHash, userId },
    });

    if (exactDuplicate) {
      return res.status(400).json({
        error: 'Ovaj račun je već poslan na provjeru',
      });
    }

    // === STEP 3: Process image into 4 variants ===
    let imageVariants;
    let receiptImageUrl;

    try {
      console.log('[Receipt Upload] Processing image...');
      const { variants } = await processImage(req.file.buffer, {
        originalName: req.file.originalname,
        skipOriginal: false, // Enable ORIGINAL variant for OCR
      });

      // Upload all variants to S3
      const baseFileName = uuidv4();
      const folder = `receipts/${userId}`;

      console.log('[Receipt Upload] Uploading variants to S3...');
      const uploadResult = await uploadVariantsToS3(
        variants,
        folder,
        baseFileName,
      );

      imageVariants = uploadResult.variants;
      receiptImageUrl =
        imageVariants.medium ||
        imageVariants.fullscreen ||
        imageVariants.thumbnail;

      console.log('[Receipt Upload] Image uploaded successfully');
    } catch (error) {
      console.error('[Receipt Upload] Image processing failed:', error);
      return res.status(500).json({
        error: 'Failed to process receipt image',
        details: error.message,
      });
    }

    // === STEP 4: Claude OCR Processing ===
    let ocrMethod = 'claude';
    let extractedFields = {};
    let fieldConfidences = {};
    let predictedData = null;
    let modelVersion = MODEL_VERSION;

    try {
      console.log('[Receipt Upload] Starting Claude OCR...');
      const claudeResult = await extractReceiptWithClaude(
        req.file.buffer,
        file.mimetype,
      );

      if (claudeResult) {
        extractedFields = {
          oib: claudeResult.oib,
          jir: claudeResult.jir,
          zki: claudeResult.zki,
          totalAmount: claudeResult.totalAmount,
          issueDate: claudeResult.issueDate,
          issueTime: claudeResult.issueTime,
          merchantName: claudeResult.merchantName,
          merchantAddress: claudeResult.merchantAddress,
        };
        fieldConfidences = claudeResult.confidence || {};
        modelVersion = claudeResult.modelVersion;

        // Store predicted data for training
        predictedData = {
          fields: extractedFields,
          confidences: fieldConfidences,
          extractionTime: claudeResult.extractionTime,
          notes: claudeResult.notes,
        };

        console.log('[Receipt Upload] Claude OCR completed successfully');
      } else {
        throw new Error('Claude OCR failed');
      }
    } catch (ocrError) {
      console.error('[Receipt Upload] OCR failed:', ocrError);
      // Continue without OCR data - receipt can still be processed manually
      ocrMethod = 'manual';
    }

    // === STEP 5: Restaurant Matching (5-step algorithm) ===
    let matchedRestaurant = null;
    let needsRestaurantSelection = false;
    let autoCreatedRestaurant = null;

    // Step 1: Try exact OIB match (Croatia only)
    if (extractedFields.oib) {
      console.log('[Restaurant Match] Attempting OIB match...');
      const matchedByOib = await Restaurant.findOne({
        where: { oib: extractedFields.oib },
        attributes: ['id', 'name', 'address', 'place', 'placeId', 'rating'],
      });

      if (matchedByOib) {
        console.log(`[Restaurant Match] Matched by OIB: ${matchedByOib.name}`);
        matchedRestaurant = matchedByOib;
      }
    }

    // Step 1.5: Try name-based search in database (case-insensitive)
    if (
      !matchedRestaurant &&
      ocrMethod === 'claude' &&
      extractedFields.merchantName
    ) {
      try {
        console.log('[Restaurant Match] Attempting name-based search...');
        const { Op } = require('sequelize');

        // Search for restaurants with similar name (case-insensitive)
        const nameSearchResults = await Restaurant.findAll({
          where: {
            name: {
              [Op.iLike]: `%${extractedFields.merchantName}%`,
            },
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

        console.log(
          `[Restaurant Match] Found ${nameSearchResults.length} restaurants by name`,
        );

        if (nameSearchResults.length > 0) {
          // If GPS available and multiple results, filter by distance
          let filteredResults = nameSearchResults;

          if (locationLat && locationLng && nameSearchResults.length > 1) {
            console.log(
              '[Restaurant Match] Filtering by distance (within 50km)...',
            );
            const userLat = parseFloat(locationLat);
            const userLng = parseFloat(locationLng);

            filteredResults = nameSearchResults.filter((r) => {
              if (!r.latitude || !r.longitude) return false;

              // Calculate distance using Haversine formula
              const R = 6371; // Earth radius in km
              const dLat = ((r.latitude - userLat) * Math.PI) / 180;
              const dLng = ((r.longitude - userLng) * Math.PI) / 180;
              const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos((userLat * Math.PI) / 180) *
                  Math.cos((r.latitude * Math.PI) / 180) *
                  Math.sin(dLng / 2) *
                  Math.sin(dLng / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              const distance = R * c;

              return distance <= 50; // Within 50km
            });

            console.log(
              `[Restaurant Match] After distance filter: ${filteredResults.length} restaurants`,
            );
          }

          // Use Claude to find best match
          if (filteredResults.length > 0) {
            const claudeMatch = await findRestaurantWithClaude(
              extractedFields,
              filteredResults,
            );

            if (claudeMatch.restaurantId && claudeMatch.confidence >= 0.8) {
              matchedRestaurant = await Restaurant.findByPk(
                claudeMatch.restaurantId,
                {
                  attributes: [
                    'id',
                    'name',
                    'address',
                    'place',
                    'placeId',
                    'rating',
                  ],
                },
              );
              console.log(
                `[Restaurant Match] Matched by name: ${matchedRestaurant.name} (confidence: ${claudeMatch.confidence})`,
              );
            }
          }
        }
      } catch (nameMatchError) {
        console.error(
          '[Restaurant Match] Name-based matching failed:',
          nameMatchError.message,
        );
      }
    }

    // Step 2: Try geographic + Claude matching (existing restaurants in DB)
    if (
      !matchedRestaurant &&
      ocrMethod === 'claude' &&
      locationLat &&
      locationLng
    ) {
      try {
        console.log(
          '[Restaurant Match] Attempting geographic + Claude matching...',
        );

        const nearbyRestaurants = await Restaurant.findNearby(
          parseFloat(locationLat),
          parseFloat(locationLng),
          5, // 5km radius
          {
            limit: 50,
            attributes: ['id', 'name', 'oib', 'address', 'place', 'placeId'],
          },
        );

        console.log(
          `[Restaurant Match] Found ${nearbyRestaurants.length} restaurants within 5km`,
        );

        if (nearbyRestaurants.length > 0) {
          const claudeMatch = await findRestaurantWithClaude(
            extractedFields,
            nearbyRestaurants,
          );

          if (claudeMatch.restaurantId && claudeMatch.confidence >= 0.8) {
            matchedRestaurant = await Restaurant.findByPk(
              claudeMatch.restaurantId,
              {
                attributes: [
                  'id',
                  'name',
                  'address',
                  'place',
                  'placeId',
                  'rating',
                ],
              },
            );
            console.log(
              `[Restaurant Match] Matched by Claude: ${matchedRestaurant.id} (confidence: ${claudeMatch.confidence})`,
            );
          }
        }
      } catch (claudeMatchError) {
        console.error(
          '[Restaurant Match] Claude matching failed:',
          claudeMatchError.message,
        );
      }
    }

    // Step 2.5: Try Google Places + Claude matching (auto-create new restaurants)
    if (
      !matchedRestaurant &&
      ocrMethod === 'claude' &&
      extractedFields.merchantName &&
      extractedFields.merchantAddress
    ) {
      try {
        console.log(
          '[Restaurant Match] Attempting Google Places proactive search...',
        );

        const searchQuery = `${extractedFields.merchantName} ${extractedFields.merchantAddress}`;
        console.log(`[Restaurant Match] Google search query: "${searchQuery}"`);

        const googleResults = await searchPlacesByText(
          searchQuery,
          locationLat || null,
          locationLng || null,
        );

        console.log(
          `[Restaurant Match] Found ${googleResults.length} Google Places results`,
        );

        if (googleResults.length > 0) {
          const claudeMatch = await findRestaurantWithClaude(
            extractedFields,
            googleResults,
          );

          console.log(
            `[Restaurant Match] Claude Google match confidence: ${claudeMatch.confidence}`,
          );

          if (claudeMatch.confidence >= 0.6) {
            const matchedPlaceId = claudeMatch.restaurantId;

            console.log(
              `[Restaurant Match] High confidence match (${claudeMatch.confidence}), fetching place details...`,
            );

            // Check if restaurant already exists by placeId
            const existingRestaurant =
              await Restaurant.findByPlaceId(matchedPlaceId);

            if (existingRestaurant) {
              console.log(
                `[Restaurant Match] Restaurant already exists in database: ${existingRestaurant.name}`,
              );
              matchedRestaurant = existingRestaurant;
            } else {
              // Fetch full details from Google Places
              const placeDetails = await getPlaceDetails(matchedPlaceId);

              if (placeDetails) {
                // Transform Google data to our format
                const restaurantData = transformToRestaurantData(placeDetails);

                console.log(
                  `[Restaurant Match] Creating new restaurant from Google Places: ${restaurantData.name}`,
                );

                // Generate unique slug
                const slug = await generateSlug(restaurantData.name);

                // Auto-create restaurant
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
                matchedRestaurant = newRestaurant;

                console.log(
                  `[Restaurant Match] Auto-created restaurant ID: ${newRestaurant.id} (via Google Places + Claude)`,
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
                      source: 'receipt_google_places_auto_match',
                      placeId: newRestaurant.placeId,
                      confidence: claudeMatch.confidence,
                    },
                  },
                });
              } else {
                console.log(
                  '[Restaurant Match] Failed to fetch place details from Google',
                );
                needsRestaurantSelection = true;
              }
            }
          } else {
            console.log(
              '[Restaurant Match] Claude Google confidence too low, needs manual selection',
            );
            needsRestaurantSelection = true;
          }
        } else {
          console.log('[Restaurant Match] No Google Places results found');
          needsRestaurantSelection = true;
        }
      } catch (googleMatchError) {
        console.error(
          '[Restaurant Match] Google Places matching failed:',
          googleMatchError.message,
        );
        needsRestaurantSelection = true;
      }
    } else if (!matchedRestaurant) {
      // Step 3: Manual search fallback
      console.log(
        '[Restaurant Match] Insufficient data for auto-matching, needs manual selection',
      );
      needsRestaurantSelection = true;
    }

    // === STEP 6: Create Receipt (without visitId yet) ===
    const receiptData = {
      userId,
      visitId: null, // Will be set when Visit is created
      restaurantId: matchedRestaurant ? matchedRestaurant.id : null,
      imageUrl: receiptImageUrl,
      thumbnailUrl: imageVariants.thumbnail,
      mediumUrl: imageVariants.medium,
      fullscreenUrl: imageVariants.fullscreen,
      originalUrl: imageVariants.original,
      imageHash,
      locationLat: locationLat ? parseFloat(locationLat) : null,
      locationLng: locationLng ? parseFloat(locationLng) : null,
      gpsAccuracy: gpsAccuracy ? parseFloat(gpsAccuracy) : null,
      status: 'pending',
      oib: extractedFields.oib || null,
      jir: extractedFields.jir || null,
      zki: extractedFields.zki || null,
      totalAmount: extractedFields.totalAmount || null,
      issueDate: extractedFields.issueDate || null,
      issueTime: extractedFields.issueTime || null,
      merchantName: extractedFields.merchantName || null,
      merchantAddress: extractedFields.merchantAddress || null,
      ocrMethod,
      fieldConfidences,
      predictedData,
      modelVersion,
      submittedAt: new Date(),
    };

    const receipt = await Receipt.create(receiptData);

    console.log(`[Receipt Upload] Receipt created: ${receipt.id}`);

    // === STEP 7: Prepare response ===
    const response = {
      receiptId: receipt.id,
      needsRestaurantSelection: needsRestaurantSelection,
      extractedData: {
        oib: extractedFields.oib,
        jir: extractedFields.jir,
        zki: extractedFields.zki,
        totalAmount: extractedFields.totalAmount,
        issueDate: extractedFields.issueDate,
        issueTime: extractedFields.issueTime,
        merchantName: extractedFields.merchantName,
        merchantAddress: extractedFields.merchantAddress,
      },
    };

    // Include restaurant info if matched
    if (matchedRestaurant) {
      response.restaurant = {
        id: matchedRestaurant.id,
        name: matchedRestaurant.name,
        address: matchedRestaurant.address,
        place: matchedRestaurant.place,
        placeId: matchedRestaurant.placeId,
        rating: matchedRestaurant.rating,
        isNew: !!autoCreatedRestaurant,
      };
      response.message = autoCreatedRestaurant
        ? `Novi restoran "${autoCreatedRestaurant.name}" pronađen!`
        : `Restoran "${matchedRestaurant.name}" pronađen!`;
    } else {
      response.message = 'Račun obrađen. Molimo odaberite restoran.';
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('[Receipt Upload] Failed:', error);
    res.status(500).json({ error: 'Failed to upload receipt' });
  }
};

/**
 * Search restaurants for manual selection
 * GET /api/app/receipts/search-restaurants
 */
const searchRestaurants = async (req, res) => {
  try {
    const { query, lat, lng } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const hasGPS = lat && lng;

    console.log(
      `[Restaurant Search] Searching for: "${query}"${hasGPS ? ` near ${lat},${lng}` : ' (no GPS)'}`,
    );

    let databaseResults = [];

    // Step 1: Search in database (only if GPS available)
    if (hasGPS) {
      const nearbyRestaurants = await Restaurant.findNearby(
        parseFloat(lat),
        parseFloat(lng),
        10, // 10km radius for manual search
        {
          limit: 10,
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
        },
      );

      const normalizedQuery = query.toLowerCase().trim();
      databaseResults = nearbyRestaurants
        .filter((r) => r.name.toLowerCase().includes(normalizedQuery))
        .map((r) => ({
          source: 'database',
          restaurantId: r.id,
          placeId: r.placeId,
          name: r.name,
          address: r.address,
          place: r.place,
          rating: r.rating,
          distance: r.get('distance'),
          existsInDatabase: true,
        }));
    }

    // Step 2: Search Google Places (with or without GPS bias)
    const googleResults = await searchPlacesByText(
      query,
      hasGPS ? lat : null,
      hasGPS ? lng : null,
    );

    // Check which Google Places results already exist in database
    const enrichedGoogleResults = await Promise.all(
      googleResults.map(async (place) => {
        const existsInDb = await Restaurant.findByPlaceId(place.placeId);

        return {
          source: 'google',
          restaurantId: existsInDb?.id || null,
          placeId: place.placeId,
          name: place.name,
          address: place.address,
          place: place.place,
          rating: place.rating,
          userRatingsTotal: place.userRatingsTotal,
          photoUrl: place.photoUrl,
          existsInDatabase: !!existsInDb,
        };
      }),
    );

    // Merge results (prioritize database, then unique Google results)
    const allResults = [...databaseResults];
    const existingPlaceIds = new Set(
      databaseResults.map((r) => r.placeId).filter(Boolean),
    );

    for (const googleResult of enrichedGoogleResults) {
      if (!existingPlaceIds.has(googleResult.placeId)) {
        allResults.push(googleResult);
      }
    }

    console.log(
      `[Restaurant Search] Found ${allResults.length} results (${databaseResults.length} from DB, ${enrichedGoogleResults.length} from Google)`,
    );

    res.status(200).json({
      results: allResults,
      totalResults: allResults.length,
    });
  } catch (error) {
    console.error('[Restaurant Search] Failed:', error);
    res.status(500).json({ error: 'Failed to search restaurants' });
  }
};

/**
 * Get restaurant details for manual selection
 * GET /api/app/receipts/restaurant-details/:placeId
 */
const getRestaurantDetails = async (req, res) => {
  try {
    const { placeId } = req.params;

    if (!placeId) {
      return res.status(400).json({ error: 'Place ID is required' });
    }

    // Check if already exists in database
    const existingRestaurant = await Restaurant.findByPlaceId(placeId);

    if (existingRestaurant) {
      return res.status(200).json({
        existsInDatabase: true,
        restaurant: {
          id: existingRestaurant.id,
          name: existingRestaurant.name,
          address: existingRestaurant.address,
          place: existingRestaurant.place,
          country: existingRestaurant.country,
          placeId: existingRestaurant.placeId,
          rating: existingRestaurant.rating,
        },
      });
    }

    // Fetch from Google Places
    const placeDetails = await getPlaceDetails(placeId);

    if (!placeDetails) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Return data ready for auto-creation
    res.status(200).json({
      existsInDatabase: false,
      restaurantData: {
        placeId: placeDetails.placeId,
        name: placeDetails.name,
        address: placeDetails.address,
        place: placeDetails.place,
        city: placeDetails.city,
        country: placeDetails.country,
        latitude: placeDetails.latitude,
        longitude: placeDetails.longitude,
        phone: placeDetails.phone,
        websiteUrl: placeDetails.websiteUrl,
        rating: placeDetails.rating,
        priceLevel: placeDetails.priceLevel,
        photoUrl: placeDetails.photoUrl,
      },
    });
  } catch (error) {
    console.error('[Restaurant Details] Failed:', error);
    res.status(500).json({ error: 'Failed to get restaurant details' });
  }
};

/**
 * Helper: Normalize text for diacritic-insensitive search
 * Converts "Čingi Lingi Čarda" → "cingi lingi carda"
 */
const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .trim();
};

/**
 * Simple restaurant search - all restaurants with diacritic-insensitive search
 * GET /api/app/restaurants/search?q=cingi
 */
const searchRestaurantsSimple = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        error: 'Unesite najmanje 2 znaka za pretragu'
      });
    }

    console.log(`[Restaurant Search] Simple search query: "${q}"`);

    // Normalize search query (remove diacritics, lowercase)
    const normalizedQuery = normalizeText(q);

    // Get restaurants from database (use ILIKE for initial filter)
    const { Op } = require('sequelize');

    const restaurants = await Restaurant.findAll({
      attributes: ['id', 'name', 'address', 'place', 'country'],
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: `%${q}%` } },
          { place: { [Op.iLike]: `%${q}%` } },
          { address: { [Op.iLike]: `%${q}%` } },
        ],
      },
      limit: 200,
      order: [['name', 'ASC']],
    });

    // Further filter by normalized text (diacritic-insensitive)
    const filtered = restaurants.filter(r => {
      const normalizedName = normalizeText(r.name);
      const normalizedPlace = normalizeText(r.place || '');
      const normalizedAddress = normalizeText(r.address || '');

      return (
        normalizedName.includes(normalizedQuery) ||
        normalizedPlace.includes(normalizedQuery) ||
        normalizedAddress.includes(normalizedQuery)
      );
    });

    console.log(`[Restaurant Search] Found ${filtered.length} restaurants`);

    res.json({
      results: filtered.map(r => ({
        id: r.id,
        name: r.name,
        address: r.address,
        place: r.place,
        country: r.country,
      })),
    });
  } catch (error) {
    console.error('[Restaurant Search] Failed:', error);
    res.status(500).json({ error: 'Pretraga nije uspjela' });
  }
};

module.exports = {
  uploadReceipt,
  searchRestaurants, // Old complex search (keep for backward compatibility)
  searchRestaurantsSimple, // NEW: Simple search for all restaurants
  getRestaurantDetails,
};
