const { v4: uuidv4 } = require('uuid');
const {
  addImageProcessingJob,
  processImageSync,
} = require('./imageQueue');
const { validateImage, quickOptimize } = require('../utils/imageProcessor');
const { uploadBufferToS3 } = require('../utils/s3Upload');
const { getMediaUrl, getMediaUrlVariants } = require('../config/cdn');

/**
 * Upload strategy enum
 */
const UPLOAD_STRATEGY = {
  OPTIMISTIC: 'optimistic', // Return immediately with placeholder, process in background
  SYNC: 'sync', // Process and upload synchronously
  QUICK: 'quick', // Quick optimize only, no variants
};

/**
 * Optimistic image upload
 * Returns immediately with a temporary placeholder, processes in background
 *
 * @param {Object} file - Multer file object
 * @param {string} folder - S3 folder path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result with jobId and placeholder
 */
async function uploadImageOptimistic(file, folder, options = {}) {
  const { entityType, entityId, priority = 10 } = options;

  try {
    // Validate image
    const validation = await validateImage(file.buffer);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Generate base filename
    const baseFileName = uuidv4();

    // Add job to queue
    const jobResult = await addImageProcessingJob({
      imageBuffer: file.buffer,
      folder,
      baseFileName,
      entityType,
      entityId,
      priority,
      options: {
        originalName: file.originalname,
      },
    });

    // Return placeholder URLs immediately
    // These will point to -medium variant which will be available shortly
    const placeholderKey = folder
      ? `${folder}/${baseFileName}-medium.jpg`
      : `${baseFileName}-medium.jpg`;

    return {
      status: 'processing',
      jobId: jobResult.jobId,
      baseFileName,
      folder,
      // Placeholder URLs (will work once processing completes)
      imageUrl: placeholderKey, // Store the base key in DB
      urls: {
        thumbnail: getMediaUrl(placeholderKey, 'image', 'thumbnail'),
        medium: getMediaUrl(placeholderKey, 'image', 'medium'),
        fullscreen: getMediaUrl(placeholderKey, 'image', 'fullscreen'),
      },
      // For client to show temporary local preview
      localPreview: `data:${file.mimetype};base64,${file.buffer.toString('base64').substring(0, 1000)}...`, // Truncated base64
    };
  } catch (error) {
    console.error('Optimistic upload failed:', error);
    throw error;
  }
}

/**
 * Synchronous image upload with variants
 * Processes all variants before returning
 *
 * @param {Object} file - Multer file object
 * @param {string} folder - S3 folder path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result with all URLs
 */
async function uploadImageSync(file, folder, options = {}) {
  const { entityType, entityId } = options;

  try {
    // Validate image
    const validation = await validateImage(file.buffer);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Generate base filename
    const baseFileName = uuidv4();

    // Process synchronously
    const result = await processImageSync({
      imageBuffer: file.buffer,
      folder,
      baseFileName,
      entityType,
      entityId,
      options: {
        originalName: file.originalname,
      },
    });

    // Get one of the variant keys to use as base (prefer medium)
    const baseKey = result.variants.medium || Object.values(result.variants)[0];

    return {
      status: 'completed',
      baseFileName,
      folder,
      imageUrl: baseKey, // Store medium variant key in DB
      variants: result.variants,
      urls: getMediaUrlVariants(baseKey),
      metadata: result.metadata,
    };
  } catch (error) {
    console.error('Sync upload failed:', error);
    throw error;
  }
}

/**
 * Quick upload with basic optimization only
 * No variants, just optimize and upload
 *
 * @param {Object} file - Multer file object
 * @param {string} folder - S3 folder path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
async function uploadImageQuick(file, folder, options = {}) {
  const { maxWidth = 1600, quality = 80, mimeType } = options;

  try {
    // Quick optimize
    const optimizedBuffer = await quickOptimize(file.buffer, {
      maxWidth,
      quality,
      mimeType: mimeType || file.mimetype, // Pass mimeType for HEIC conversion
    });

    // Generate filename
    const fileName = `${folder}/${uuidv4()}.jpg`;

    // Upload to S3
    const key = await uploadBufferToS3(optimizedBuffer, fileName, 'image/jpeg');

    return {
      status: 'completed',
      imageUrl: key,
      url: getMediaUrl(key, 'image', 'original'),
    };
  } catch (error) {
    console.error('Quick upload failed:', error);
    throw error;
  }
}

/**
 * Main upload function with strategy selection
 *
 * @param {Object} file - Multer file object
 * @param {string} folder - S3 folder path
 * @param {Object} options - Upload options
 * @param {string} options.strategy - Upload strategy (optimistic, sync, quick)
 * @returns {Promise<Object>} Upload result
 */
async function uploadImage(file, folder, options = {}) {
  const { strategy = UPLOAD_STRATEGY.OPTIMISTIC } = options;

  switch (strategy) {
    case UPLOAD_STRATEGY.OPTIMISTIC:
      return uploadImageOptimistic(file, folder, options);

    case UPLOAD_STRATEGY.SYNC:
      return uploadImageSync(file, folder, options);

    case UPLOAD_STRATEGY.QUICK:
      return uploadImageQuick(file, folder, options);

    default:
      throw new Error(`Unknown upload strategy: ${strategy}`);
  }
}

/**
 * Get image URLs from stored key
 * Supports both old single-file keys and new variant keys
 *
 * @param {string} imageKey - S3 key stored in database
 * @param {string} size - Requested size (thumbnail, medium, fullscreen)
 * @returns {string|Object} URL or object with all variant URLs
 */
function getImageUrls(imageKey, size = null) {
  if (!imageKey) return null;

  // If size is specified, return single URL
  if (size) {
    return getMediaUrl(imageKey, 'image', size);
  }

  // Return all variants
  return getMediaUrlVariants(imageKey);
}

/**
 * Migrate old image to new variant system
 * Downloads original, processes, and uploads variants
 *
 * @param {string} oldImageKey - Existing S3 key
 * @param {Object} options - Migration options
 * @returns {Promise<Object>} Migration result
 */
async function migrateImageToVariants(oldImageKey, options = {}) {
  const AWS = require('@aws-sdk/client-s3');
  const { S3Client, GetObjectCommand } = AWS;

  const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  try {
    const bucketName =
      process.env.AWS_S3_BUCKET_NAME || 'dinver-restaurant-thumbnails';

    // Download original image
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: oldImageKey,
    });

    const response = await s3Client.send(getCommand);
    const imageBuffer = await streamToBuffer(response.Body);

    // Extract folder and generate new base filename
    const folder = oldImageKey.substring(0, oldImageKey.lastIndexOf('/'));
    const baseFileName = uuidv4();

    // Process and upload variants
    const result = await processImageSync({
      imageBuffer,
      folder,
      baseFileName,
      options: {
        originalName: oldImageKey,
      },
    });

    return {
      success: true,
      oldKey: oldImageKey,
      newBaseKey: result.variants.medium,
      variants: result.variants,
    };
  } catch (error) {
    console.error('Migration failed for', oldImageKey, error);
    return {
      success: false,
      oldKey: oldImageKey,
      error: error.message,
    };
  }
}

/**
 * Helper to convert stream to buffer
 */
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

module.exports = {
  uploadImage,
  uploadImageOptimistic,
  uploadImageSync,
  uploadImageQuick,
  getImageUrls,
  migrateImageToVariants,
  UPLOAD_STRATEGY,
};
