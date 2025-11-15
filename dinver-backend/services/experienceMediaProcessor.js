/**
 * Professional Experience Media Processor
 *
 * Combines:
 * - AWS MediaConvert for professional video transcoding
 * - Experience Image Processor for optimized 9:16 images
 * - Bull Queue for background processing
 * - S3 integration
 *
 * This is the main service used by the Experience controller
 */

const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} = require('@aws-sdk/client-s3');
const { Readable } = require('stream');
const path = require('path');
const sharp = require('sharp');
const {
  processExperienceImage,
  validateExperienceImage,
} = require('../utils/experienceImageProcessor');
const {
  createVideoTranscodingJob,
  getJobStatus,
  parseJobOutputs,
} = require('./awsMediaConvertService');
const { getCdnUrl } = require('../utils/experienceMediaUpload');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'dinver-restaurant-thumbnails';
const CLOUDFRONT_DOMAIN = process.env.AWS_CLOUDFRONT_DOMAIN;

/**
 * Process Experience image - optimized for vertical social media
 *
 * @param {string} storageKey - S3 key of original image
 * @param {string} experienceMediaId - Experience media ID for organization
 * @returns {Promise<Object>} - Processing result with URLs
 */
async function processImage(storageKey, experienceMediaId) {
  try {
    console.log(`Processing Experience image: ${storageKey}`);

    // Download original from S3
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storageKey,
    });
    const { Body, ContentType } = await s3Client.send(getCommand);

    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Validate image
    const validation = await validateExperienceImage(buffer);
    if (!validation.valid) {
      throw new Error(`Image validation failed: ${validation.error}`);
    }

    // Process image into variants
    const { variants, metadata } = await processExperienceImage(buffer, {
      originalName: storageKey,
    });

    // Upload variants to S3
    const outputFolder = path.dirname(storageKey).replace('/originals', '/processed');
    const baseFileName = path.basename(storageKey, path.extname(storageKey));

    const uploadedVariants = {};
    const thumbnails = [];

    for (const [variantName, variantData] of Object.entries(variants)) {
      const variantKey = `${outputFolder}/${baseFileName}${variantData.suffix}.jpg`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: variantKey,
          Body: variantData.buffer,
          ContentType: 'image/jpeg',
          CacheControl: 'public, max-age=31536000, immutable',
          Metadata: {
            originalKey: storageKey,
            variant: variantName,
            experienceMediaId: experienceMediaId || '',
          },
        }),
      );

      const cdnUrl = getCdnUrl(variantKey);
      uploadedVariants[variantName] = cdnUrl;

      // Store thumbnail info for database
      thumbnails.push({
        w: variantData.width,
        h: variantData.height,
        cdnUrl,
      });

      console.log(`  Uploaded ${variantName}: ${variantKey} (${(variantData.size / 1024).toFixed(0)}KB)`);
    }

    return {
      success: true,
      width: metadata.originalWidth,
      height: metadata.originalHeight,
      mimeType: 'image/jpeg',
      variants: uploadedVariants,
      thumbnails,
      metadata,
    };
  } catch (error) {
    console.error('Error processing Experience image:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Process Experience video using AWS MediaConvert
 *
 * This creates a MediaConvert job that will:
 * - Generate HLS adaptive streaming
 * - Create MP4 progressive downloads (480p, 720p)
 * - Generate thumbnails
 *
 * Processing happens asynchronously - use webhooks or polling to get completion status
 *
 * @param {string} storageKey - S3 key of original video
 * @param {string} experienceId - Experience ID for output organization
 * @returns {Promise<Object>} - Job details
 */
async function processVideo(storageKey, experienceId) {
  try {
    console.log(`Creating MediaConvert job for video: ${storageKey}`);

    // Validate video exists
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storageKey,
    });

    try {
      await s3Client.send(getCommand);
    } catch (error) {
      throw new Error(`Video not found in S3: ${storageKey}`);
    }

    // Create MediaConvert transcoding job
    const jobResult = await createVideoTranscodingJob(storageKey, experienceId);

    console.log(`MediaConvert job created: ${jobResult.jobId}`);

    return {
      success: true,
      jobId: jobResult.jobId,
      jobStatus: jobResult.jobStatus,
      outputPrefix: jobResult.outputPrefix,
      processing: true,
    };
  } catch (error) {
    console.error('Error processing Experience video:', error);
    return {
      success: false,
      error: error.message,
      processing: false,
    };
  }
}

/**
 * Check video processing status and get output URLs when complete
 *
 * @param {string} jobId - MediaConvert job ID
 * @returns {Promise<Object>} - Status and outputs
 */
async function checkVideoProcessingStatus(jobId) {
  try {
    const jobDetails = await getJobStatus(jobId);

    const result = {
      jobId,
      status: jobDetails.status,
      percentComplete: jobDetails.percentComplete,
      createdAt: jobDetails.createdAt,
      startedAt: jobDetails.startedAt,
      finishedAt: jobDetails.finishedAt,
      errorMessage: jobDetails.errorMessage,
    };

    // If job is complete, parse outputs
    if (jobDetails.status === 'COMPLETE') {
      const outputs = parseJobOutputs(jobDetails, CLOUDFRONT_DOMAIN);

      result.outputs = outputs;
      result.videoFormats = {
        hls: outputs.hls.masterPlaylist,
        mp4_480p: outputs.mp4['480p'] || null,
        mp4_720p: outputs.mp4['720p'] || null,
      };
      result.thumbnails = outputs.thumbnails.map((url, index) => ({
        w: 405,
        h: 720,
        cdnUrl: url,
        timestamp: index * 5, // Assuming thumbnails are 5 seconds apart
      }));
    }

    return result;
  } catch (error) {
    console.error('Error checking video processing status:', error);
    throw new Error(`Failed to get job status: ${error.message}`);
  }
}

/**
 * Main function to process media based on type
 *
 * @param {string} storageKey - S3 storage key
 * @param {string} kind - 'IMAGE' or 'VIDEO'
 * @param {string} entityId - Experience or ExperienceMedia ID
 * @returns {Promise<Object>}
 */
async function processMedia(storageKey, kind, entityId) {
  if (kind === 'IMAGE') {
    return await processImage(storageKey, entityId);
  } else if (kind === 'VIDEO') {
    return await processVideo(storageKey, entityId);
  } else {
    throw new Error('Invalid media kind. Must be IMAGE or VIDEO');
  }
}

/**
 * Generate quick thumbnail from video for immediate display
 * (While MediaConvert job is processing)
 *
 * @param {string} storageKey - S3 key of original video
 * @returns {Promise<Object>} - Thumbnail info
 */
async function generateQuickVideoThumbnail(storageKey) {
  try {
    // Download first 5MB of video (enough to extract thumbnail)
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storageKey,
      Range: 'bytes=0-5242880', // First 5MB
    });

    const { Body } = await s3Client.send(getCommand);

    const chunks = [];
    for await (const chunk of Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // For now, return null - MediaConvert will generate proper thumbnails
    // In future, could use FFmpeg to extract quick thumbnail
    return {
      quickThumbnail: null,
      message: 'Thumbnails will be generated by MediaConvert',
    };
  } catch (error) {
    console.error('Error generating quick thumbnail:', error);
    return {
      quickThumbnail: null,
      error: error.message,
    };
  }
}

module.exports = {
  processImage,
  processVideo,
  processMedia,
  checkVideoProcessingStatus,
  generateQuickVideoThumbnail,
};
