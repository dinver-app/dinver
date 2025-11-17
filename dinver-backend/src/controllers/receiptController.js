const {
  Receipt,
  User,
  Restaurant,
  UserSysadmin,
  UserPointsHistory,
  Reservation,
  UserSettings,
} = require('../../models');
const { getMediaUrl } = require('../../config/cdn');
const {
  uploadImage,
  getImageUrls,
  UPLOAD_STRATEGY,
} = require('../../services/imageUploadService');
const { extractReceiptData } = require('../services/ocrService');
const {
  extractReceiptWithVision,
  validateReceiptImage,
} = require('../services/visionOcrService');
const {
  normalizeWithGPT,
  extractWithGPTVision,
} = require('../services/gptNormalizerService');
const {
  extractReceiptWithClaude,
  findRestaurantWithClaude,
  MODEL_VERSION,
} = require('../services/claudeOcrService');
const {
  searchPlacesByText,
  getPlaceDetails,
} = require('../services/googlePlacesService');
const {
  calculateAutoApproveScore,
  calculateConsistencyScore,
} = require('../services/decisionEngine');
const {
  calculatePerceptualHash,
  checkGeofence,
  detectFraudPatterns,
  areSimilarImages,
} = require('../utils/antifraudUtils');
const {
  sendPushNotificationToUsers,
} = require('../../utils/pushNotificationService');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');
const { Op } = require('sequelize');
const crypto = require('crypto');

/**
 * Upload receipt image and create receipt record
 * NEW: Enhanced OCR flow with Vision + GPT + Decision Engine
 */
const uploadReceipt = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      locationLat,
      locationLng,
      gpsAccuracy,
      declaredTotal,
      restaurantId,
      restaurantData, // Optional: Google Places data for auto-creating restaurant
      deviceInfo,
    } = req.body;
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

    // === STEP 1: Image Processing & Hashing ===
    const sharp = require('sharp');
    const inputBuffer = file.buffer;
    let processedBuffer = inputBuffer;
    let contentType = 'image/jpeg';
    let imageMeta = null;

    // Validate image can be processed
    try {
      const metadata = await sharp(inputBuffer, { failOn: 'none' }).metadata();
      if (!metadata || !metadata.format) {
        return res.status(400).json({
          error:
            'Slika nije u ispravnom formatu. Molimo koristite JPG, PNG, WEBP ili HEIC.',
        });
      }
      console.log(`Image format detected: ${metadata.format}`);
    } catch (error) {
      console.error('Image validation failed:', error);
      return res.status(400).json({
        error: `Slika se ne može obraditi. Format: ${file.mimetype}. Molimo koristite JPG, PNG, WEBP ili HEIC.`,
      });
    }

    // Calculate MD5 hash for exact duplicate detection
    const imageHash = crypto
      .createHash('md5')
      .update(file.buffer)
      .digest('hex');

    // Check for exact duplicate
    const exactDuplicate = await Receipt.findOne({
      where: { imageHash },
    });

    if (exactDuplicate) {
      return res.status(400).json({
        error: 'Ovaj račun je već poslan na provjeru (exact duplicate)',
      });
    }

    // Calculate perceptual hash for near-duplicate detection
    let perceptualHash = null;
    try {
      perceptualHash = await calculatePerceptualHash(file.buffer);

      if (perceptualHash) {
        // Check for similar images
        const recentReceipts = await Receipt.findAll({
          where: {
            userId,
            perceptualHash: { [Op.ne]: null },
            submittedAt: {
              [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
          attributes: ['id', 'perceptualHash'],
        });

        for (const receipt of recentReceipts) {
          if (areSimilarImages(perceptualHash, receipt.perceptualHash, 5)) {
            return res.status(400).json({
              error:
                'Ovaj račun izgleda kao duplikat prethodnog računa (perceptual match)',
            });
          }
        }
      }
    } catch (error) {
      console.error('Error calculating perceptual hash:', error);
    }

    // Quick validation to ensure image looks like a receipt
    try {
      const { isReceipt, confidence, reason } =
        await validateReceiptImage(inputBuffer);
      if (isReceipt === false && confidence >= 0.8) {
        console.warn(
          `Receipt image rejected: ${reason} (confidence: ${confidence})`,
        );
        return res.status(400).json({
          error:
            'Slika nije prepoznata kao račun. Molimo učitajte jasnu fotografiju računa.',
        });
      }
    } catch (validationError) {
      console.error('Receipt image validation failed:', validationError);
    }

    // Image compression
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
      console.warn('Image compression failed:', e?.message);
    }

    // === STEP 2: Upload to S3 ===
    // Use QUICK strategy since receipts don't need multiple variants
    // The image is already processed by Sharp above
    const folder = `receipts/${userId}`;
    let imageUploadResult;
    try {
      imageUploadResult = await uploadImage(file, folder, {
        strategy: UPLOAD_STRATEGY.QUICK,
        entityType: 'receipt',
        entityId: null, // Will be set after receipt creation
        priority: 15, // High priority for receipts
      });
    } catch (uploadError) {
      console.error('Error uploading receipt:', uploadError);
      return res.status(500).json({ error: 'Failed to upload receipt image' });
    }
    const imageKey = imageUploadResult.imageUrl;

    // === STEP 3: OCR Processing with Claude 3.5 Sonnet ===
    let ocrMethod = 'claude';
    let rawOcrText = null;
    let visionConfidence = null;
    let parserConfidence = null;
    let extractedFields = {};
    let fieldConfidences = {};
    let predictedData = null; // For training/learning
    let modelVersion = MODEL_VERSION;

    try {
      // Try Claude OCR first (primary method)
      console.log('Attempting OCR with Claude 3.5 Sonnet...');
      const claudeResult = await extractReceiptWithClaude(
        processedBuffer,
        contentType,
      );

      if (claudeResult) {
        ocrMethod = 'claude';
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
        visionConfidence = claudeResult.confidence?.overall || 0.85;
        parserConfidence = claudeResult.confidence?.overall || 0.85;
        modelVersion = claudeResult.modelVersion;

        // Store predicted data for training
        predictedData = {
          fields: extractedFields,
          confidences: fieldConfidences,
          extractionTime: claudeResult.extractionTime,
          notes: claudeResult.notes,
        };

        console.log(
          `Claude OCR successful. Overall confidence: ${visionConfidence.toFixed(2)}`,
        );
      } else {
        // Claude failed, fallback to Vision + Parser
        console.log('Claude OCR failed, falling back to Vision...');
        const visionResult = await extractReceiptWithVision(processedBuffer);

        if (visionResult && visionResult.success) {
          ocrMethod = 'vision';
          rawOcrText = visionResult.rawText;
          visionConfidence = visionResult.visionConfidence;
          parserConfidence = visionResult.parserConfidence;
          extractedFields = visionResult.fields;
          fieldConfidences = visionResult.confidences;

          console.log(
            `Vision OCR fallback successful. Parser confidence: ${parserConfidence}`,
          );

          // If parser confidence is low, try GPT normalization
          if (parserConfidence < 0.6) {
            console.log('Parser confidence low, trying GPT normalization...');
            const gptResult = await normalizeWithGPT(rawOcrText, visionResult);

            if (gptResult) {
              ocrMethod = 'vision+gpt';
              // Merge GPT results with Vision results
              Object.keys(gptResult).forEach((key) => {
                if (gptResult[key] !== null && fieldConfidences[key] < 0.7) {
                  extractedFields[key] = gptResult[key];
                  fieldConfidences[key] = 0.8;
                }
              });
              console.log('GPT normalization applied');
            }
          }
        }
      }
    } catch (ocrError) {
      console.error('All OCR methods failed:', ocrError);
    }

    // === STEP 4: Geofence Check ===
    let geofenceResult = { withinGeofence: null, distance: null };
    if (
      locationLat &&
      locationLng &&
      restaurantId &&
      extractedFields.restaurantId
    ) {
      try {
        const restaurant = await Restaurant.findByPk(restaurantId);
        if (restaurant && restaurant.latitude && restaurant.longitude) {
          geofenceResult = checkGeofence(
            parseFloat(locationLat),
            parseFloat(locationLng),
            parseFloat(restaurant.latitude),
            parseFloat(restaurant.longitude),
          );
        }
      } catch (error) {
        console.error('Geofence check failed:', error);
      }
    }

    // === STEP 5: Fraud Detection ===
    const fraudFlags = detectFraudPatterns({
      ...extractedFields,
      geofenceCheck: geofenceResult,
    });

    // === STEP 6: Consistency Score ===
    const consistencyScore = calculateConsistencyScore(extractedFields);

    // === STEP 7: Auto-Approve Decision Engine ===
    let autoApproveScore = 0;
    let autoApproveDecision = 'pending_review';

    try {
      const decision = await calculateAutoApproveScore({
        extractedData: extractedFields,
        declaredTotal: declaredTotal ? parseFloat(declaredTotal) : null,
        userLocation: geofenceResult,
        restaurantId,
        fraudFlags,
        visionConfidence,
        parserConfidence,
      });

      autoApproveScore = decision.score;
      autoApproveDecision = decision.decision;

      console.log(
        `Auto-approve score: ${autoApproveScore}, Decision: ${autoApproveDecision}`,
      );
      console.log('Decision reasons:', decision.reasons);
    } catch (error) {
      console.error('Decision engine failed:', error);
    }

    // === STEP 8: Create Receipt Record ===
    // NOTE: Auto-approve is DISABLED - all receipts go to manual review
    // The autoApproveScore is calculated for tracking/monitoring purposes only
    const receiptData = {
      userId,
      imageUrl: imageKey,
      imageHash,
      perceptualHash,
      locationLat: locationLat ? parseFloat(locationLat) : null,
      locationLng: locationLng ? parseFloat(locationLng) : null,
      gpsAccuracy: gpsAccuracy ? parseFloat(gpsAccuracy) : null,
      declaredTotal: declaredTotal ? parseFloat(declaredTotal) : null,
      deviceInfo: deviceInfo || null,
      status: 'pending', // Always pending - no auto-approve
      // Extracted fields
      oib: extractedFields.oib || null,
      jir: extractedFields.jir || null,
      zki: extractedFields.zki || null,
      totalAmount: extractedFields.totalAmount || null,
      issueDate: extractedFields.issueDate || null,
      issueTime: extractedFields.issueTime || null,
      merchantName: extractedFields.merchantName || null,
      merchantAddress: extractedFields.merchantAddress || null,
      // OCR metadata
      rawOcrText,
      visionConfidence,
      parserConfidence,
      consistencyScore,
      autoApproveScore,
      fraudFlags,
      ocrMethod,
      fieldConfidences,
      // Learning/training fields for Claude OCR
      predictedData: predictedData,
      modelVersion: modelVersion,
      // Legacy ocrData for backwards compatibility
      ocrData: imageMeta
        ? {
            meta: imageMeta,
            fields: extractedFields,
            confidence: fieldConfidences,
          }
        : null,
    };

    // === STEP 8: Restaurant Matching & Auto-Creation ===
    let needsRestaurantSelection = false;
    let autoCreatedRestaurant = null;

    if (restaurantId) {
      // User manually selected restaurant
      receiptData.restaurantId = restaurantId;
    } else if (restaurantData) {
      // User provided restaurant data from Google Places - auto-create if needed
      try {
        console.log('[Restaurant Auto-Create] Processing restaurant data...');

        // Parse restaurantData if it's a string
        const parsedRestaurantData = typeof restaurantData === 'string'
          ? JSON.parse(restaurantData)
          : restaurantData;

        // Check if restaurant already exists by placeId
        const existingRestaurant = await Restaurant.findByPlaceId(
          parsedRestaurantData.placeId,
        );

        if (existingRestaurant) {
          console.log(
            `[Restaurant Auto-Create] Restaurant already exists: ${existingRestaurant.name}`,
          );
          receiptData.restaurantId = existingRestaurant.id;
        } else {
          // Create new restaurant from Google Places data
          console.log(
            `[Restaurant Auto-Create] Creating new restaurant: ${parsedRestaurantData.name}`,
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
            claimed: false, // Auto-created restaurants are unclaimed
            lastGoogleUpdate: new Date(),
          });

          autoCreatedRestaurant = newRestaurant;
          receiptData.restaurantId = newRestaurant.id;

          console.log(
            `[Restaurant Auto-Create] Created restaurant ID: ${newRestaurant.id}`,
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
                source: 'user_receipt_upload',
                placeId: newRestaurant.placeId,
              },
            },
          });
        }
      } catch (autoCreateError) {
        console.error(
          '[Restaurant Auto-Create] Failed:',
          autoCreateError.message,
        );
        needsRestaurantSelection = true;
      }
    } else {
      // Try auto-matching from database

      // Step 1: Try exact OIB match (fastest and most reliable, Croatia only)
      if (extractedFields.oib) {
        const matchedByOib = await Restaurant.findOne({
          where: { oib: extractedFields.oib },
        });
        if (matchedByOib) {
          console.log(`[Restaurant Match] Matched by OIB: ${matchedByOib.name}`);
          receiptData.restaurantId = matchedByOib.id;
        }
      }

      // Step 2: If no OIB match, try geographic + Claude intelligent matching
      if (!receiptData.restaurantId && ocrMethod === 'claude' && locationLat && locationLng) {
        try {
          console.log('[Restaurant Match] Attempting geographic + Claude matching...');

          // Find restaurants within 5km radius (geo-filtered search)
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

            // Use match if confidence is high enough
            if (claudeMatch.restaurantId && claudeMatch.confidence >= 0.80) {
              console.log(
                `[Restaurant Match] Matched by Claude: ${claudeMatch.restaurantId} (confidence: ${claudeMatch.confidence}, method: ${claudeMatch.matchedBy})`,
              );
              receiptData.restaurantId = claudeMatch.restaurantId;
            } else {
              console.log(
                '[Restaurant Match] Claude confidence too low, needs manual selection',
              );
              needsRestaurantSelection = true;
            }
          } else {
            console.log(
              '[Restaurant Match] No restaurants found nearby, needs manual selection',
            );
            needsRestaurantSelection = true;
          }
        } catch (claudeMatchError) {
          console.error(
            '[Restaurant Match] Claude matching failed:',
            claudeMatchError.message,
          );
          needsRestaurantSelection = true;
        }
      }

      // Step 2.5: Try Google Places proactive search with Claude matching
      // This step happens AFTER database matching fails and BEFORE manual fallback
      if (
        !receiptData.restaurantId &&
        ocrMethod === 'claude' &&
        extractedFields.merchantName &&
        extractedFields.merchantAddress
      ) {
        try {
          console.log('[Restaurant Match] Attempting Google Places proactive search...');

          // Build search query from receipt data
          const searchQuery = `${extractedFields.merchantName} ${extractedFields.merchantAddress}`;

          console.log(`[Restaurant Match] Google search query: "${searchQuery}"`);

          // Search Google Places (with location bias if GPS available)
          const googleResults = await searchPlacesByText(
            searchQuery,
            locationLat || null,
            locationLng || null,
          );

          console.log(
            `[Restaurant Match] Found ${googleResults.length} Google Places results`,
          );

          if (googleResults.length > 0) {
            // Use Claude to analyze Google results and find best match
            const claudeMatch = await findRestaurantWithClaude(
              extractedFields,
              googleResults,
            );

            console.log(
              `[Restaurant Match] Claude Google match confidence: ${claudeMatch.confidence}`,
            );

            // Auto-create if confidence is high enough
            if (claudeMatch.restaurantId && claudeMatch.confidence >= 0.85) {
              // The restaurantId here is actually the placeId from Google
              const matchedPlaceId = claudeMatch.restaurantId;

              console.log(
                `[Restaurant Match] High confidence match (${claudeMatch.confidence}), fetching place details...`,
              );

              // Check if restaurant already exists by placeId
              const existingRestaurant = await Restaurant.findByPlaceId(matchedPlaceId);

              if (existingRestaurant) {
                console.log(
                  `[Restaurant Match] Restaurant already exists in database: ${existingRestaurant.name}`,
                );
                receiptData.restaurantId = existingRestaurant.id;
              } else {
                // Fetch full details from Google Places
                const placeDetails = await getPlaceDetails(matchedPlaceId);

                if (placeDetails) {
                  console.log(
                    `[Restaurant Match] Creating new restaurant from Google Places: ${placeDetails.name}`,
                  );

                  // Auto-create restaurant
                  const newRestaurant = await Restaurant.create({
                    name: placeDetails.name,
                    address: placeDetails.address,
                    place: placeDetails.place || placeDetails.city,
                    country: placeDetails.country || 'Croatia',
                    latitude: placeDetails.latitude,
                    longitude: placeDetails.longitude,
                    phone: placeDetails.phone,
                    websiteUrl: placeDetails.websiteUrl,
                    placeId: placeDetails.placeId,
                    rating: placeDetails.rating,
                    priceLevel: placeDetails.priceLevel,
                    claimed: false,
                    lastGoogleUpdate: new Date(),
                  });

                  autoCreatedRestaurant = newRestaurant;
                  receiptData.restaurantId = newRestaurant.id;

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
                  console.log('[Restaurant Match] Failed to fetch place details from Google');
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
            console.log(
              '[Restaurant Match] No Google Places results found',
            );
            needsRestaurantSelection = true;
          }
        } catch (googleMatchError) {
          console.error(
            '[Restaurant Match] Google Places matching failed:',
            googleMatchError.message,
          );
          needsRestaurantSelection = true;
        }
      } else if (!receiptData.restaurantId) {
        // No OIB, no Claude OCR, or insufficient data - needs manual selection
        console.log('[Restaurant Match] Insufficient data for auto-matching');
        needsRestaurantSelection = true;
      }
    }

    const receipt = await Receipt.create(receiptData);

    // Log audit
    await logAudit({
      userId,
      action: ActionTypes.CREATE,
      entity: Entities.RECEIPT,
      entityId: receipt.id,
      changes: {
        new: {
          imageUrl: imageKey,
          status: 'pending',
          autoApproveScore,
          ocrMethod,
        },
      },
    });

    // Response - always pending for manual review
    let message =
      'Račun poslan na provjeru. Bodovi će biti dodijeljeni u roku 24 sata.';

    // Add warning if fraud flags detected
    if (fraudFlags.length > 0) {
      message =
        'Račun poslan na provjeru. Detektirana potencijalna nepodudaranja.';
    }

    // Add info about restaurant auto-creation
    if (autoCreatedRestaurant) {
      message = `Novi restoran "${autoCreatedRestaurant.name}" dodan u sustav! Račun poslan na provjeru.`;
    }

    const response = {
      message,
      receiptId: receipt.id,
      autoApproveScore: Math.round(autoApproveScore * 100) / 100,
      extractedData: {
        oib: extractedFields.oib,
        totalAmount: extractedFields.totalAmount,
        issueDate: extractedFields.issueDate,
        merchantName: extractedFields.merchantName,
        merchantAddress: extractedFields.merchantAddress,
      },
      needsRestaurantSelection: needsRestaurantSelection,
    };

    // Include restaurant info if matched or created
    if (receiptData.restaurantId) {
      const restaurant = autoCreatedRestaurant
        || await Restaurant.findByPk(receiptData.restaurantId, {
            attributes: ['id', 'name', 'place', 'address'],
          });

      if (restaurant) {
        response.restaurant = {
          id: restaurant.id,
          name: restaurant.name,
          place: restaurant.place,
          address: restaurant.address,
          isNew: !!autoCreatedRestaurant,
        };
      }
    }

    res.status(201).json(response);
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

    // Enhanced OCR metadata
    receiptData.ocr = {
      method: receipt.ocrMethod || 'unknown',
      rawText: receipt.rawOcrText || null,
      visionConfidence: receipt.visionConfidence || null,
      parserConfidence: receipt.parserConfidence || null,
      consistencyScore: receipt.consistencyScore || null,
      fieldConfidences: receipt.fieldConfidences || null,
      // Legacy support
      confidence: receipt.ocrData?.confidence || null,
    };

    // Auto-approve metadata
    receiptData.autoApprove = {
      score: receipt.autoApproveScore || null,
      fraudFlags: receipt.fraudFlags || [],
    };

    // Extracted fields
    receiptData.extracted = {
      oib: receipt.oib,
      jir: receipt.jir,
      zki: receipt.zki,
      totalAmount: receipt.totalAmount,
      issueDate: receipt.issueDate,
      issueTime: receipt.issueTime,
      merchantName: receipt.merchantName,
      merchantAddress: receipt.merchantAddress,
    };

    // User-declared data
    receiptData.declared = {
      total: receipt.declaredTotal,
    };

    // Location data
    receiptData.location = {
      lat: receipt.locationLat,
      lng: receipt.locationLng,
      accuracy: receipt.gpsAccuracy,
    };

    // Device info
    receiptData.device = receipt.deviceInfo || null;

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

/**
 * Search restaurants for receipt upload (Google Places + Database)
 * Used when AI cannot find a match
 * Works with or without GPS coordinates
 */
const searchRestaurantsForReceipt = async (req, res) => {
  try {
    const { query, lat, lng } = req.query;

    if (!query) {
      return res.status(400).json({
        error: 'Query is required',
      });
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
          attributes: ['id', 'name', 'address', 'place', 'placeId', 'rating', 'latitude', 'longitude'],
        },
      );

      // Filter by name similarity
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
 * Get restaurant details for receipt (prepare data for auto-creation)
 * Returns full restaurant data ready for auto-creation
 */
const getRestaurantDetailsForReceipt = async (req, res) => {
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
        },
      });
    }

    // Fetch from Google Places
    const placeDetails = await getPlaceDetails(placeId);

    if (!placeDetails) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Return data ready for auto-creation (will be sent back with receipt upload)
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

module.exports = {
  uploadReceipt,
  getUserReceipts,
  getAllReceipts,
  getReceiptById,
  updateReceiptData,
  approveReceipt,
  rejectReceipt,
  checkReservations,
  searchRestaurantsForReceipt,
  getRestaurantDetailsForReceipt,
};
