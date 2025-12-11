const {
  Receipt,
  User,
  Restaurant,
  UserSysadmin,
  UserPointsHistory,
  Reservation,
  UserSettings,
  Visit,
  Experience,
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
  searchPlacesWithCache,
} = require('../services/googlePlacesCache');
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
  createAndSendNotification,
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

        // Store predicted data for training (including items!)
        predictedData = {
          fields: extractedFields,
          items: claudeResult.items || [], // Store extracted line items
          confidences: fieldConfidences,
          extractionTime: claudeResult.extractionTime,
          notes: claudeResult.notes,
        };

        console.log(
          `Claude OCR successful. Overall confidence: ${visionConfidence.toFixed(2)}. Items extracted: ${claudeResult.items?.length || 0}`,
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
            // Lowered threshold from 0.80 to 0.75 to reduce false negatives and avoid unnecessary Google API calls
            if (claudeMatch.restaurantId && claudeMatch.confidence >= 0.75) {
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

      // Step 2.25: Try name-based database search before Google Places
      // This catches restaurants that exist in DB but are outside the 5km geo-radius
      // or when GPS accuracy is poor. Much cheaper than Google Places API.
      if (!receiptData.restaurantId && extractedFields.merchantName) {
        try {
          console.log('[Restaurant Match] Attempting name-based DB search...');

          const nameResults = await Restaurant.findAll({
            where: {
              name: {
                [Op.iLike]: `%${extractedFields.merchantName}%`, // Case-insensitive LIKE
              },
            },
            attributes: ['id', 'name', 'oib', 'address', 'place', 'placeId'],
            limit: 10,
          });

          if (nameResults.length > 0) {
            console.log(
              `[Restaurant Match] Found ${nameResults.length} potential name matches in DB`,
            );

            const claudeMatch = await findRestaurantWithClaude(
              extractedFields,
              nameResults,
            );

            // Accept match if confidence is reasonable (0.75+)
            // If only 1 result with good name match, accept even with 0.70+ confidence
            const confidenceThreshold = nameResults.length === 1 ? 0.70 : 0.75;

            if (claudeMatch.restaurantId && claudeMatch.confidence >= confidenceThreshold) {
              console.log(
                `[Restaurant Match] Matched by name search: ${claudeMatch.restaurantId} (confidence: ${claudeMatch.confidence}, matches: ${nameResults.length})`,
              );
              receiptData.restaurantId = claudeMatch.restaurantId;
            } else {
              console.log(
                `[Restaurant Match] Name search confidence too low (${claudeMatch.confidence}), trying Google Places`,
              );
            }
          } else {
            console.log('[Restaurant Match] No name matches in DB, trying Google Places');
          }
        } catch (nameMatchError) {
          console.error(
            '[Restaurant Match] Name-based search failed:',
            nameMatchError.message,
          );
          // Continue to Google Places fallback
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

          // Search Google Places with cache (with location bias if GPS available)
          // Cache saves ~30% of API calls ($0.032 each) for popular restaurants
          const googleResults = await searchPlacesWithCache(
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
 * Delete user's own pending receipt
 * User can only delete receipts that are still pending (not yet reviewed)
 */
const deleteUserReceipt = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const receipt = await Receipt.findByPk(id);

    if (!receipt) {
      return res.status(404).json({ error: 'Račun nije pronađen' });
    }

    // Check ownership
    if (receipt.userId !== userId) {
      return res.status(403).json({ error: 'Nemate pristup ovom računu' });
    }

    // Only allow deleting pending receipts
    if (receipt.status !== 'pending') {
      return res.status(400).json({
        error: 'Možete obrisati samo račune koji čekaju provjeru. Već pregledani računi ne mogu se obrisati.',
      });
    }

    // Delete associated Visit if exists
    if (receipt.visitId) {
      const Visit = require('../../models').Visit;
      await Visit.destroy({ where: { id: receipt.visitId } });
    }

    // Delete receipt images from S3
    if (
      receipt.thumbnailUrl ||
      receipt.mediumUrl ||
      receipt.fullscreenUrl ||
      receipt.originalUrl ||
      receipt.imageUrl
    ) {
      try {
        const { deleteImageVariants } = require('../utils/s3Upload');
        await deleteImageVariants(
          receipt.thumbnailUrl,
          receipt.mediumUrl,
          receipt.fullscreenUrl,
          receipt.originalUrl,
        );
        // Also try to delete the main imageUrl if it's different
        if (receipt.imageUrl && receipt.imageUrl !== receipt.originalUrl) {
          const { deleteFile } = require('../utils/s3Upload');
          await deleteFile(receipt.imageUrl);
        }
      } catch (s3Error) {
        console.error('Error deleting receipt images from S3:', s3Error.message);
        // Continue with deletion even if S3 cleanup fails
      }
    }

    // Log audit before deletion
    await logAudit({
      userId,
      action: ActionTypes.DELETE,
      entity: Entities.RECEIPT,
      entityId: receipt.id,
      changes: {
        old: {
          status: receipt.status,
          totalAmount: receipt.totalAmount,
          merchantName: receipt.merchantName,
        },
        reason: 'User deleted pending receipt',
      },
    });

    // Delete the receipt
    await receipt.destroy();

    res.json({ message: 'Račun uspješno obrisan' });
  } catch (error) {
    console.error('Error deleting user receipt:', error);
    res.status(500).json({ error: 'Brisanje računa nije uspjelo' });
  }
};

/**
 * Get user's receipts (all statuses - pending, approved, rejected)
 * This is for the "My Receipts" list where user sees all their uploaded receipts
 */
const getUserReceipts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status } = req.query;

    const whereClause = { userId };
    if (status) {
      whereClause.status = status;
    }

    const receipts = await Receipt.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address', 'place', 'thumbnailUrl', 'isClaimed'],
        },
        {
          model: Visit,
          as: 'visit',
          attributes: ['id', 'status', 'taggedBuddies'],
        },
      ],
      order: [['submittedAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    // Collect all buddy IDs to fetch in one query
    const allBuddyIds = new Set();
    receipts.rows.forEach((receipt) => {
      if (receipt.visit?.taggedBuddies) {
        receipt.visit.taggedBuddies.forEach((id) => allBuddyIds.add(id));
      }
    });

    // Fetch all buddy users at once
    let buddyUsersMap = {};
    if (allBuddyIds.size > 0) {
      const buddyUsers = await User.findAll({
        where: { id: Array.from(allBuddyIds) },
        attributes: ['id', 'username', 'name', 'profileImage'],
      });
      buddyUsersMap = buddyUsers.reduce((acc, buddy) => {
        acc[buddy.id] = {
          id: buddy.id,
          username: buddy.username,
          name: buddy.name,
          profileImage: buddy.profileImage
            ? getMediaUrl(buddy.profileImage, 'image', 'original')
            : null,
        };
        return acc;
      }, {});
    }

    // Transform receipts with image URLs
    const transformedReceipts = receipts.rows.map((receipt) => {
      // Map tagged buddy IDs to user objects
      let taggedBuddies = [];
      if (receipt.visit?.taggedBuddies && receipt.visit.taggedBuddies.length > 0) {
        taggedBuddies = receipt.visit.taggedBuddies
          .map((id) => buddyUsersMap[id])
          .filter(Boolean);
      }

      return {
        id: receipt.id,
        status: receipt.status,
        submittedAt: receipt.submittedAt,
        verifiedAt: receipt.verifiedAt,
        rejectionReason: receipt.rejectionReason,
        rejectionReasonEn: receipt.rejectionReasonEn,
        totalAmount: receipt.totalAmount,
        merchantName: receipt.merchantName,
        issueDate: receipt.issueDate,
        pointsAwarded: receipt.pointsAwarded,
        imageUrl: receipt.imageUrl ? getMediaUrl(receipt.imageUrl, 'image') : null,
        thumbnailUrl: receipt.thumbnailUrl ? getMediaUrl(receipt.thumbnailUrl, 'image') : null,
        restaurant: receipt.restaurant
          ? {
              id: receipt.restaurant.id,
              name: receipt.restaurant.name,
              address: receipt.restaurant.address,
              place: receipt.restaurant.place,
              thumbnailUrl: receipt.restaurant.thumbnailUrl
                ? getMediaUrl(receipt.restaurant.thumbnailUrl, 'image')
                : null,
              isClaimed: receipt.restaurant.isClaimed,
            }
          : null,
        visitId: receipt.visit?.id || null,
        visitStatus: receipt.visit?.status || null,
        taggedBuddies,
      };
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
          attributes: ['id', 'name', 'email'],
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
              attributes: ['id', 'name'],
            },
          ],
        },
        {
          model: Visit,
          as: 'visit',
          attributes: ['id', 'status', 'taggedBuddies'],
        },
      ],
      order: [['submittedAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    // Collect all buddy IDs to fetch in one query
    const allBuddyIds = new Set();
    receipts.rows.forEach((receipt) => {
      if (receipt.visit?.taggedBuddies) {
        receipt.visit.taggedBuddies.forEach((id) => allBuddyIds.add(id));
      }
    });

    // Fetch all buddy users at once
    let buddyUsersMap = {};
    if (allBuddyIds.size > 0) {
      const buddyUsers = await User.findAll({
        where: { id: Array.from(allBuddyIds) },
        attributes: ['id', 'username', 'name', 'profileImage'],
      });
      buddyUsersMap = buddyUsers.reduce((acc, buddy) => {
        acc[buddy.id] = {
          id: buddy.id,
          username: buddy.username,
          name: buddy.name,
          profileImage: buddy.profileImage
            ? getMediaUrl(buddy.profileImage, 'image', 'original')
            : null,
        };
        return acc;
      }, {});
    }

    // Transform image URLs to signed URLs and add tagged buddies
    const transformedReceipts = receipts.rows.map((receipt) => {
      const receiptData = receipt.toJSON();
      receiptData.imageUrl = getMediaUrl(receipt.imageUrl, 'image');

      // Map tagged buddy IDs to user objects
      if (receipt.visit?.taggedBuddies && receipt.visit.taggedBuddies.length > 0) {
        receiptData.taggedBuddies = receipt.visit.taggedBuddies
          .map((id) => buddyUsersMap[id])
          .filter(Boolean);
      } else {
        receiptData.taggedBuddies = [];
      }

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
          attributes: ['id', 'name', 'email'],
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
              attributes: ['id', 'name'],
            },
          ],
        },
        {
          model: Visit,
          as: 'visit',
          attributes: ['id', 'status', 'taggedBuddies'],
        },
      ],
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const receiptData = receipt.toJSON();
    receiptData.imageUrl = getMediaUrl(receipt.imageUrl, 'image');

    // Fetch tagged buddies user info if visit has taggedBuddies
    let taggedBuddies = [];
    if (receipt.visit?.taggedBuddies && receipt.visit.taggedBuddies.length > 0) {
      const buddyUsers = await User.findAll({
        where: { id: receipt.visit.taggedBuddies },
        attributes: ['id', 'username', 'name', 'profileImage'],
      });
      taggedBuddies = buddyUsers.map((buddy) => ({
        id: buddy.id,
        username: buddy.username,
        name: buddy.name,
        profileImage: buddy.profileImage
          ? getMediaUrl(buddy.profileImage, 'image', 'original')
          : null,
      }));
    }
    receiptData.taggedBuddies = taggedBuddies;

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
      items: receipt.predictedData?.items || [],
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
 * Calculate how many fields were corrected by comparing predicted vs corrected data
 * @param {Object} predictedFields - Original AI predicted fields
 * @param {Object} correctedFields - Human corrected fields
 * @returns {number} Number of fields that were corrected
 */
const calculateCorrections = (predictedFields, correctedFields) => {
  if (!predictedFields || !correctedFields) return 0;

  let corrections = 0;
  // NOTE: restaurantId is NOT included because it's not extracted by OCR - it's matched afterward
  const fieldsToCompare = ['oib', 'jir', 'zki', 'totalAmount', 'issueDate', 'issueTime'];

  for (const field of fieldsToCompare) {
    const predicted = predictedFields[field];
    const corrected = correctedFields[field];

    // Skip comparison if predicted value doesn't exist (OCR didn't extract it)
    if (predicted === null || predicted === undefined) {
      continue;
    }

    // Special handling for issueTime - normalize HH:MM and HH:MM:SS to just HH:MM
    if (field === 'issueTime') {
      const predictedTime = String(predicted || '').trim().substring(0, 5); // HH:MM
      const correctedTime = String(corrected || '').trim().substring(0, 5); // HH:MM
      if (predictedTime !== correctedTime && corrected != null) {
        corrections++;
        console.log(`[Accuracy] Field "${field}" corrected: "${predicted}" -> "${corrected}"`);
      }
      continue;
    }

    // Normalize for comparison
    const predictedStr = String(predicted || '').trim().toLowerCase();
    const correctedStr = String(corrected || '').trim().toLowerCase();

    // If values differ, count as correction
    if (predictedStr !== correctedStr && corrected != null) {
      corrections++;
      console.log(`[Accuracy] Field "${field}" corrected: "${predicted}" -> "${corrected}"`);
    }
  }

  return corrections;
};

/**
 * Calculate accuracy percentage
 * @param {number} correctionsMade - Number of fields corrected
 * @param {number} totalFields - Total number of fields checked (default 6: oib, jir, zki, totalAmount, issueDate, issueTime)
 * @returns {number} Accuracy percentage (0-100)
 */
const calculateAccuracy = (correctionsMade, totalFields = 6) => {
  if (totalFields === 0) return 100;
  const correctFields = totalFields - correctionsMade;
  return Math.round((correctFields / totalFields) * 100 * 100) / 100; // 2 decimals
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
          attributes: ['id', 'name', 'email'],
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

    // Build corrected data for ML training comparison
    const correctedFields = {
      restaurantId,
      totalAmount: parseFloat(totalAmount),
      jir: jir?.trim() || null,
      zki: zki?.trim() || null,
      oib: oib?.trim() || null,
      issueDate,
      issueTime,
    };

    // Calculate accuracy metrics for ML tracking
    const predictedFields = receipt.predictedData?.fields || null;
    const correctionsMade = predictedFields
      ? calculateCorrections(predictedFields, correctedFields)
      : null;
    const accuracy = correctionsMade !== null
      ? calculateAccuracy(correctionsMade)
      : null;

    // Get Visit to check for tagged buddies BEFORE updating receipt
    let visit = null;
    let taggedBuddiesCount = 0;

    if (receipt.visitId) {
      visit = await Visit.findByPk(receipt.visitId);
      if (visit && visit.taggedBuddies && visit.taggedBuddies.length > 0) {
        taggedBuddiesCount = visit.taggedBuddies.length;
      }
    }

    // Calculate points per person (split among user + buddies)
    const totalPeople = 1 + taggedBuddiesCount; // User + buddies
    const pointsPerPerson = Math.round((pointsAwarded / totalPeople) * 100) / 100;

    console.log(`[Receipt Approval] Points distribution: ${pointsAwarded} total points / ${totalPeople} people = ${pointsPerPerson} points each`);

    // Update receipt - save pointsPerPerson (what user actually gets), not total
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
      pointsAwarded: pointsPerPerson, // Save per-person points, not total
      hasReservationBonus: hasReservationBonus || false,
      reservationId: reservationId || null,
      // ML Training fields
      correctedData: correctedFields,
      correctionsMade: correctionsMade,
      accuracy: accuracy,
    });

    // Award points to main user
    await UserPointsHistory.logPoints({
      userId: receipt.userId,
      actionType: 'receipt_approved',
      points: pointsPerPerson,
      referenceId: receipt.id,
      restaurantId: receipt.restaurantId,
      description: taggedBuddiesCount > 0
        ? `Račun odobren - ${restaurant.name} (${totalAmount}€) - podijeljeno sa ${taggedBuddiesCount} buddies`
        : `Račun odobren - ${restaurant.name} (${totalAmount}€)`,
    });

    // Award points to tagged buddies
    if (visit && visit.taggedBuddies && visit.taggedBuddies.length > 0) {
      console.log(`[Receipt Approval] Awarding ${pointsPerPerson} points to each of ${visit.taggedBuddies.length} buddies`);

      for (const buddyId of visit.taggedBuddies) {
        await UserPointsHistory.logPoints({
          userId: buddyId,
          actionType: 'receipt_approved_buddy',
          points: pointsPerPerson,
          referenceId: receipt.id,
          restaurantId: receipt.restaurantId,
          description: `Račun odobren - ${restaurant.name} (${totalAmount}€) - tagovan od ${receipt.userId}`,
        });
      }
    }

    // Update existing Visit or create new one when receipt is approved
    // (visit variable already declared above for buddy points)
    try {
      if (receipt.visitId && !visit) {
        // Re-fetch if not already loaded
        visit = await Visit.findByPk(receipt.visitId);
      }

      if (receipt.visitId && visit) {
        // Visit already exists (user created it before approval)
        // Update existing Visit to APPROVED with restaurant
        await visit.update({
          status: 'APPROVED',
          restaurantId: restaurantId, // Set the restaurant from approved receipt
          visitDate: visit.visitDate || new Date(issueDate),
          reviewedAt: new Date(),
          reviewedBy: req.user.id,
        });

        console.log(`[Receipt Approval] Updated existing Visit ${visit.id} to APPROVED status with restaurant ${restaurantId}`);

        // Update associated Experience with restaurantId if it exists
        const experience = await Experience.findOne({
          where: { visitId: visit.id },
        });

        if (experience) {
          await experience.update({
            restaurantId: restaurantId,
            status: 'APPROVED',
            publishedAt: experience.publishedAt || new Date(),
          });
          console.log(`[Receipt Approval] Updated Experience ${experience.id} with restaurant ${restaurantId} and set to APPROVED`);
        }
      }

      // If no existing Visit, create one (backward compatibility for old receipts)
      if (!visit) {
        visit = await Visit.create({
          userId: receipt.userId,
          restaurantId: restaurantId,
          receiptImageUrl: receipt.originalUrl || receipt.imageUrl,
          status: 'APPROVED',
          wasInMustVisit: false,
          visitDate: new Date(issueDate),
          submittedAt: receipt.submittedAt,
          reviewedAt: new Date(),
          reviewedBy: req.user.id,
        });

        console.log(`[Receipt Approval] Created new Visit ${visit.id} for Receipt ${receipt.id}`);

        // Link the visit to the receipt
        await receipt.update({ visitId: visit.id });
      }
    } catch (visitError) {
      console.error('[Receipt Approval] Failed to process Visit:', visitError);
      // Don't fail the receipt approval if visit processing fails
      // The receipt is still approved and points are awarded
    }

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

    // Send push notification to main user (using i18n)
    try {
      // Determine which notification type to use based on buddies count
      let notificationType = 'receipt_approved';
      if (taggedBuddiesCount === 1) {
        notificationType = 'receipt_approved_shared';
      } else if (taggedBuddiesCount > 1) {
        notificationType = 'receipt_approved_shared_plural';
      }

      await createAndSendNotification(receipt.userId, {
        type: notificationType,
        data: {
          points: pointsPerPerson,
          restaurantName: restaurant.name,
          buddyCount: taggedBuddiesCount,
          receiptId: receipt.id,
          totalPoints: pointsAwarded,
          sharedWith: taggedBuddiesCount,
        },
        restaurantId: receipt.restaurantId,
      });
    } catch (notificationError) {
      console.error('Error sending push notification:', notificationError);
    }

    // Send push notifications to tagged buddies (using i18n)
    if (visit && visit.taggedBuddies && visit.taggedBuddies.length > 0) {
      try {
        // Get main user's name for the notification
        const mainUser = await User.findByPk(receipt.userId, {
          attributes: ['name', 'username'],
        });
        const mainUserName = mainUser?.name || mainUser?.username || 'Prijatelj';

        // Send notification to each buddy individually (for i18n support)
        for (const buddyId of visit.taggedBuddies) {
          await createAndSendNotification(buddyId, {
            type: 'receipt_approved_buddy',
            data: {
              actorName: mainUserName,
              restaurantName: restaurant.name,
              points: pointsPerPerson,
              receiptId: receipt.id,
            },
            actorUserId: receipt.userId,
            restaurantId: receipt.restaurantId,
          });
        }

        console.log(`[Receipt Approval] Sent notifications to ${visit.taggedBuddies.length} buddies`);
      } catch (buddyNotificationError) {
        console.error('Error sending buddy push notifications:', buddyNotificationError);
      }
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
          pointsAwarded: pointsPerPerson,
          totalPointsBeforeSplit: pointsAwarded,
          buddyCount: taggedBuddiesCount,
          verifierId: req.user.id,
        },
      },
    });

    res.json({
      message: 'Receipt approved successfully',
      pointsAwarded: pointsPerPerson, // Points user actually gets
      totalPoints: pointsAwarded, // Total before split (for display)
      buddyCount: taggedBuddiesCount,
      visitId: visit?.id || null, // Include created/updated visit ID
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
    const { rejectionReason, rejectionReasonEn } = req.body;

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      return res.status(400).json({
        error: 'Rejection reason (Croatian) is required',
      });
    }

    if (!rejectionReasonEn || rejectionReasonEn.trim().length === 0) {
      return res.status(400).json({
        error: 'Rejection reason (English) is required',
      });
    }

    const receipt = await Receipt.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
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
      rejectionReasonEn: rejectionReasonEn.trim(),
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
          rejectionReasonEn,
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
          attributes: ['id', 'name', 'address', 'place', 'placeId', 'rating', 'userRatingsTotal', 'dinverRating', 'dinverReviewsCount', 'latitude', 'longitude'],
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
          rating: r.rating != null ? Number(r.rating) : null,
          userRatingsTotal: r.userRatingsTotal != null ? Number(r.userRatingsTotal) : null,
          dinverRating: r.dinverRating != null ? Number(r.dinverRating) : null,
          dinverReviewsCount: r.dinverReviewsCount != null ? Number(r.dinverReviewsCount) : null,
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

/**
 * Get OCR Analytics for sysadmin dashboard
 * Returns overall stats, accuracy metrics, and model performance
 */
const getOcrAnalytics = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const whereClause = {
      status: 'approved', // Only approved receipts have correctedData (ground truth)
      ocrMethod: { [Op.ne]: null }, // Only receipts with OCR data
    };

    // Add date filter if provided (use verifiedAt for approved receipts)
    if (dateFrom || dateTo) {
      whereClause.verifiedAt = {};
      if (dateFrom) {
        whereClause.verifiedAt[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        whereClause.verifiedAt[Op.lte] = new Date(dateTo);
      }
    }

    // Get all approved receipts with OCR data
    const receipts = await Receipt.findAll({
      where: whereClause,
      attributes: [
        'id',
        'status',
        'ocrMethod',
        'modelVersion',
        'predictedData',
        'correctedData',
        'correctionsMade',
        'accuracy',
        'visionConfidence',
        'parserConfidence',
        'autoApproveScore',
        'submittedAt',
        'verifiedAt',
      ],
      order: [['submittedAt', 'DESC']],
    });

    // Calculate overall statistics (all receipts are already approved)
    const totalReceipts = receipts.length;
    const totalApproved = receipts.length; // All are approved due to whereClause filter

    // Only calculate accuracy for receipts with correctedData
    const receiptsWithAccuracy = receipts.filter(
      (r) => r.accuracy !== null && r.accuracy !== undefined,
    );

    const avgAccuracy =
      receiptsWithAccuracy.length > 0
        ? receiptsWithAccuracy.reduce((sum, r) => sum + parseFloat(r.accuracy || 0), 0) /
          receiptsWithAccuracy.length
        : null;

    const avgCorrections =
      receiptsWithAccuracy.length > 0
        ? receiptsWithAccuracy.reduce((sum, r) => sum + (r.correctionsMade || 0), 0) /
          receiptsWithAccuracy.length
        : null;

    // Stats by OCR method (all receipts are already approved)
    const methodStats = {};
    ['claude', 'vision', 'vision+gpt', 'gpt', 'manual'].forEach((method) => {
      const methodReceipts = receipts.filter((r) => r.ocrMethod === method);
      const methodWithAccuracy = methodReceipts.filter(
        (r) => r.accuracy !== null && r.accuracy !== undefined,
      );

      methodStats[method] = {
        total: methodReceipts.length,
        approved: methodReceipts.length, // All are approved
        avgAccuracy:
          methodWithAccuracy.length > 0
            ? methodWithAccuracy.reduce((sum, r) => sum + parseFloat(r.accuracy || 0), 0) /
              methodWithAccuracy.length
            : null,
        avgCorrections:
          methodWithAccuracy.length > 0
            ? methodWithAccuracy.reduce((sum, r) => sum + (r.correctionsMade || 0), 0) /
              methodWithAccuracy.length
            : null,
      };
    });

    // Stats by model version (for Claude)
    const modelStats = {};
    const claudeReceipts = receipts.filter((r) => r.ocrMethod === 'claude');
    claudeReceipts.forEach((receipt) => {
      const version = receipt.modelVersion || 'unknown';
      if (!modelStats[version]) {
        modelStats[version] = [];
      }
      modelStats[version].push(receipt);
    });

    const modelVersionStats = {};
    Object.entries(modelStats).forEach(([version, versionReceipts]) => {
      const withAccuracy = versionReceipts.filter(
        (r) => r.accuracy !== null && r.accuracy !== undefined,
      );

      modelVersionStats[version] = {
        total: versionReceipts.length,
        approved: versionReceipts.length, // All are approved
        avgAccuracy:
          withAccuracy.length > 0
            ? withAccuracy.reduce((sum, r) => sum + parseFloat(r.accuracy || 0), 0) /
              withAccuracy.length
            : null,
        avgCorrections:
          withAccuracy.length > 0
            ? withAccuracy.reduce((sum, r) => sum + (r.correctionsMade || 0), 0) /
              withAccuracy.length
            : null,
      };
    });

    // Accuracy distribution (buckets: 100%, 90-99%, 80-89%, 70-79%, <70%)
    const accuracyDistribution = {
      perfect: 0, // 100%
      excellent: 0, // 90-99%
      good: 0, // 80-89%
      fair: 0, // 70-79%
      poor: 0, // <70%
    };

    receiptsWithAccuracy.forEach((receipt) => {
      const acc = parseFloat(receipt.accuracy);
      if (acc === 100) accuracyDistribution.perfect++;
      else if (acc >= 90) accuracyDistribution.excellent++;
      else if (acc >= 80) accuracyDistribution.good++;
      else if (acc >= 70) accuracyDistribution.fair++;
      else accuracyDistribution.poor++;
    });

    // Most common corrections (which fields are corrected most often)
    // Field correction stats (restaurantId excluded - not part of OCR)
    const fieldCorrectionStats = {
      oib: 0,
      jir: 0,
      zki: 0,
      totalAmount: 0,
      issueDate: 0,
      issueTime: 0,
    };

    receiptsWithAccuracy.forEach((receipt) => {
      const predicted = receipt.predictedData?.fields;
      const corrected = receipt.correctedData;

      if (predicted && corrected) {
        Object.keys(fieldCorrectionStats).forEach((field) => {
          // Special handling for issueTime - normalize HH:MM and HH:MM:SS
          if (field === 'issueTime') {
            const predictedTime = String(predicted[field] || '').trim().substring(0, 5);
            const correctedTime = String(corrected[field] || '').trim().substring(0, 5);
            if (predictedTime !== correctedTime && corrected[field] != null) {
              fieldCorrectionStats[field]++;
            }
            return;
          }

          const predictedVal = String(predicted[field] || '').trim().toLowerCase();
          const correctedVal = String(corrected[field] || '').trim().toLowerCase();

          if (predictedVal !== correctedVal && corrected[field] != null) {
            fieldCorrectionStats[field]++;
          }
        });
      }
    });

    // Recent receipts with low accuracy (for investigation)
    const lowAccuracyReceipts = receiptsWithAccuracy
      .filter((r) => parseFloat(r.accuracy) < 80)
      .slice(0, 10)
      .map((r) => ({
        id: r.id,
        accuracy: r.accuracy,
        correctionsMade: r.correctionsMade,
        ocrMethod: r.ocrMethod,
        modelVersion: r.modelVersion,
        submittedAt: r.submittedAt,
      }));

    res.json({
      overview: {
        totalReceipts,
        totalApproved,
        totalWithAccuracy: receiptsWithAccuracy.length,
        avgAccuracy: avgAccuracy ? Math.round(avgAccuracy * 100) / 100 : null,
        avgCorrections: avgCorrections ? Math.round(avgCorrections * 100) / 100 : null,
      },
      methodStats,
      modelVersionStats,
      accuracyDistribution,
      fieldCorrectionStats,
      lowAccuracyReceipts,
    });
  } catch (error) {
    console.error('Error getting OCR analytics:', error);
    res.status(500).json({ error: 'Failed to get OCR analytics' });
  }
};

/**
 * Get training data export for ML improvement
 * Returns receipts with both predicted and corrected data
 */
const getTrainingData = async (req, res) => {
  try {
    const { limit = 100, offset = 0, minAccuracy, maxAccuracy, ocrMethod } = req.query;

    const whereClause = {
      status: 'approved', // Only approved receipts
      predictedData: { [Op.ne]: null }, // Must have predicted data
      correctedData: { [Op.ne]: null }, // Must have corrected data
    };

    // Filter by accuracy range
    if (minAccuracy !== undefined || maxAccuracy !== undefined) {
      whereClause.accuracy = {};
      if (minAccuracy !== undefined) {
        whereClause.accuracy[Op.gte] = parseFloat(minAccuracy);
      }
      if (maxAccuracy !== undefined) {
        whereClause.accuracy[Op.lte] = parseFloat(maxAccuracy);
      }
    }

    // Filter by OCR method
    if (ocrMethod) {
      whereClause.ocrMethod = ocrMethod;
    }

    const receipts = await Receipt.findAll({
      where: whereClause,
      attributes: [
        'id',
        'ocrMethod',
        'modelVersion',
        'predictedData',
        'correctedData',
        'correctionsMade',
        'accuracy',
        'fieldConfidences',
        'visionConfidence',
        'parserConfidence',
        'submittedAt',
        'verifiedAt',
        'usedForTraining',
      ],
      order: [['verifiedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const totalCount = await Receipt.count({ where: whereClause });

    // Format training data
    const trainingData = receipts.map((receipt) => ({
      id: receipt.id,
      ocrMethod: receipt.ocrMethod,
      modelVersion: receipt.modelVersion,
      input: {
        // What Claude predicted
        fields: receipt.predictedData?.fields || {},
        confidences: receipt.fieldConfidences || {},
      },
      groundTruth: {
        // What sysadmin corrected to
        fields: receipt.correctedData || {},
      },
      metrics: {
        accuracy: receipt.accuracy,
        correctionsMade: receipt.correctionsMade,
        visionConfidence: receipt.visionConfidence,
        parserConfidence: receipt.parserConfidence,
      },
      metadata: {
        submittedAt: receipt.submittedAt,
        verifiedAt: receipt.verifiedAt,
        usedForTraining: receipt.usedForTraining,
      },
    }));

    res.json({
      trainingData,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < totalCount,
      },
    });
  } catch (error) {
    console.error('Error getting training data:', error);
    res.status(500).json({ error: 'Failed to get training data' });
  }
};

/**
 * Mark receipts as used for training
 */
const markAsUsedForTraining = async (req, res) => {
  try {
    const { receiptIds } = req.body;

    if (!Array.isArray(receiptIds) || receiptIds.length === 0) {
      return res.status(400).json({ error: 'receiptIds array is required' });
    }

    await Receipt.update(
      { usedForTraining: true },
      { where: { id: { [Op.in]: receiptIds } } },
    );

    res.json({
      message: `Marked ${receiptIds.length} receipts as used for training`,
      count: receiptIds.length,
    });
  } catch (error) {
    console.error('Error marking receipts as used for training:', error);
    res.status(500).json({ error: 'Failed to mark receipts' });
  }
};

/**
 * Get receipt analytics - business insights about items sold per restaurant
 * GET /api/sysadmin/receipt-analytics?restaurantId=X&dateFrom=Y&dateTo=Z
 */
const getReceiptAnalytics = async (req, res) => {
  try {
    const { restaurantId, dateFrom, dateTo } = req.query;

    // Build where clause for filtering
    const whereClause = {
      status: 'approved', // Only approved receipts have valid items
    };

    // If restaurantId is provided, filter by it (otherwise show all restaurants)
    if (restaurantId && restaurantId !== 'all') {
      whereClause.restaurantId = restaurantId;
    }

    if (dateFrom) {
      whereClause.verifiedAt = { ...whereClause.verifiedAt, [Op.gte]: new Date(dateFrom) };
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      whereClause.verifiedAt = { ...whereClause.verifiedAt, [Op.lte]: endDate };
    }

    // Fetch all approved receipts for this restaurant
    const receipts = await Receipt.findAll({
      where: whereClause,
      attributes: [
        'id',
        'predictedData',
        'totalAmount',
        'issueDate',
        'issueTime',
        'verifiedAt',
        'submittedAt',
      ],
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name'],
        },
      ],
      order: [['verifiedAt', 'DESC']],
    });

    // Extract all items from receipts
    const itemsMap = new Map(); // itemName -> { count, totalRevenue, prices, dates }
    const categoryMap = new Map(); // category -> count (if we add categories later)
    let totalItems = 0;
    let totalReceipts = receipts.length;
    let totalRevenue = 0;
    const dailyStats = new Map(); // date -> { items, revenue, receipts }

    receipts.forEach((receipt) => {
      const receiptDate = receipt.issueDate || receipt.verifiedAt?.toISOString().split('T')[0];
      const items = receipt.predictedData?.items || [];
      const receiptTotal = parseFloat(receipt.totalAmount) || 0;

      totalRevenue += receiptTotal;

      // Initialize daily stats
      if (receiptDate) {
        if (!dailyStats.has(receiptDate)) {
          dailyStats.set(receiptDate, { items: 0, revenue: 0, receipts: 0 });
        }
        const dayStats = dailyStats.get(receiptDate);
        dayStats.receipts += 1;
        dayStats.revenue += receiptTotal;
      }

      items.forEach((item) => {
        // Skip items without a name
        if (!item.name) return;

        totalItems += item.quantity || 1;

        if (receiptDate) {
          dailyStats.get(receiptDate).items += item.quantity || 1;
        }

        const itemName = item.name.trim();
        const itemPrice = item.totalPrice || 0;

        if (!itemsMap.has(itemName)) {
          itemsMap.set(itemName, {
            name: itemName,
            count: 0,
            totalRevenue: 0,
            prices: [],
            firstSeen: receiptDate,
            lastSeen: receiptDate,
          });
        }

        const itemData = itemsMap.get(itemName);
        itemData.count += item.quantity || 1;
        itemData.totalRevenue += itemPrice;
        itemData.prices.push(itemPrice);
        if (receiptDate > itemData.lastSeen) {
          itemData.lastSeen = receiptDate;
        }
      });
    });

    // Calculate top items
    const topItems = Array.from(itemsMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map((item) => ({
        name: item.name,
        count: item.count,
        revenue: Math.round(item.totalRevenue * 100) / 100,
        avgPrice: Math.round((item.totalRevenue / item.count) * 100) / 100,
        firstSeen: item.firstSeen,
        lastSeen: item.lastSeen,
      }));

    // Calculate price distribution
    const priceRanges = {
      '0-5': 0,
      '5-10': 0,
      '10-20': 0,
      '20-50': 0,
      '50+': 0,
    };

    itemsMap.forEach((item) => {
      const avgPrice = item.totalRevenue / item.count;
      if (avgPrice < 5) priceRanges['0-5'] += item.count;
      else if (avgPrice < 10) priceRanges['5-10'] += item.count;
      else if (avgPrice < 20) priceRanges['10-20'] += item.count;
      else if (avgPrice < 50) priceRanges['20-50'] += item.count;
      else priceRanges['50+'] += item.count;
    });

    // Format daily trends
    const dailyTrends = Array.from(dailyStats.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, stats]) => ({
        date,
        items: stats.items,
        revenue: Math.round(stats.revenue * 100) / 100,
        receipts: stats.receipts,
        avgItemsPerReceipt: Math.round((stats.items / stats.receipts) * 100) / 100,
      }));

    // Overview stats
    const overview = {
      totalReceipts,
      totalItems,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      uniqueItems: itemsMap.size,
      avgItemsPerReceipt: totalReceipts > 0 ? Math.round((totalItems / totalReceipts) * 100) / 100 : 0,
      avgRevenuePerReceipt: totalReceipts > 0 ? Math.round((totalRevenue / totalReceipts) * 100) / 100 : 0,
    };

    res.json({
      overview,
      topItems,
      priceDistribution: priceRanges,
      dailyTrends,
      restaurant: receipts[0]?.Restaurant
        ? {
            id: receipts[0].Restaurant.id,
            name: receipts[0].Restaurant.name,
          }
        : null,
    });
  } catch (error) {
    console.error('Error getting receipt analytics:', error);
    res.status(500).json({ error: 'Failed to get receipt analytics' });
  }
};

/**
 * Delete receipt permanently (sysadmin only)
 * DELETE /api/sysadmin/receipts/:id/delete
 */
const deleteReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await Receipt.findByPk(id);
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Delete all receipt image variants from S3
    if (
      receipt.thumbnailUrl ||
      receipt.mediumUrl ||
      receipt.fullscreenUrl ||
      receipt.originalUrl
    ) {
      try {
        const { deleteImageVariants } = require('../utils/s3Upload');
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

    // Delete the Receipt record
    await Receipt.destroy({ where: { id: receipt.id } });

    res.status(200).json({
      message: 'Receipt deleted successfully',
      deletedReceiptId: receipt.id,
    });
  } catch (error) {
    console.error('Error deleting receipt:', error);
    res.status(500).json({ error: 'Failed to delete receipt' });
  }
};

module.exports = {
  uploadReceipt,
  getUserReceipts,
  deleteUserReceipt,
  getAllReceipts,
  getReceiptById,
  updateReceiptData,
  approveReceipt,
  rejectReceipt,
  deleteReceipt,
  checkReservations,
  searchRestaurantsForReceipt,
  getRestaurantDetailsForReceipt,
  // OCR Analytics & Training
  getOcrAnalytics,
  getTrainingData,
  markAsUsedForTraining,
  // Receipt Analytics (Business Insights)
  getReceiptAnalytics,
};
