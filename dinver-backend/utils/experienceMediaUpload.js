const {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// Create an S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME =
  process.env.AWS_S3_BUCKET_NAME || 'dinver-restaurant-thumbnails';
const CLOUDFRONT_DOMAIN = process.env.AWS_CLOUDFRONT_DOMAIN;

// File size limits - increased for better quality uploads
// TikTok allows up to 287MB (iOS) / 72MB (Android)
// Instagram Reels allows up to 4GB
const MAX_IMAGE_SIZE = 100 * 1024 * 1024; // 100MB (for high quality photos)
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB (balance between quality and upload time)
const MAX_VIDEO_DURATION = 60; // seconds (increased to 60s like TikTok)

// Allowed MIME types
const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

const ALLOWED_VIDEO_MIMES = [
  'video/mp4',
  'video/quicktime',
  'video/x-m4v',
  'video/x-matroska',
];

/**
 * Generate a pre-signed URL for uploading Experience media
 * @param {Object} params
 * @param {string} params.userId - User ID
 * @param {string} params.kind - 'IMAGE' or 'VIDEO'
 * @param {string} params.mimeType - MIME type of the file
 * @param {number} params.bytes - File size in bytes
 * @param {string} [params.checksum] - Optional checksum for verification
 * @returns {Promise<{uploadUrl: string, storageKey: string, cdnUrl: string}>}
 */
async function generatePresignedUploadUrl({
  userId,
  kind,
  mimeType,
  bytes,
  checksum,
}) {
  // Validate kind
  if (!['IMAGE', 'VIDEO'].includes(kind)) {
    throw new Error('Invalid kind. Must be IMAGE or VIDEO');
  }

  // Validate MIME type
  if (kind === 'IMAGE' && !ALLOWED_IMAGE_MIMES.includes(mimeType)) {
    throw new Error(
      `Invalid image MIME type. Allowed: ${ALLOWED_IMAGE_MIMES.join(', ')}`,
    );
  }

  if (kind === 'VIDEO' && !ALLOWED_VIDEO_MIMES.includes(mimeType)) {
    throw new Error(
      `Invalid video MIME type. Allowed: ${ALLOWED_VIDEO_MIMES.join(', ')}`,
    );
  }

  // Validate file size
  const maxSize = kind === 'IMAGE' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
  if (bytes > maxSize) {
    throw new Error(
      `File size exceeds limit. Max size: ${maxSize / 1024 / 1024}MB`,
    );
  }

  // Generate storage key - optimized structure for fast feed loading
  // Structure: experiences/{YYYY-MM}/{userId}/{kind}/{fileId}.ext
  // This allows efficient cleanup and organization by date
  const extension = getExtensionFromMimeType(mimeType);
  const fileId = uuidv4();
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const storageKey = `experiences/${yearMonth}/${userId}/${kind.toLowerCase()}/${fileId}.${extension}`;

  // Generate CDN URL (will be accessible after upload)
  // Use CloudFront for faster delivery if available
  const cdnUrl = CLOUDFRONT_DOMAIN
    ? `https://${CLOUDFRONT_DOMAIN}/${storageKey}`
    : `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${storageKey}`;

  // Create pre-signed URL for upload with caching headers for fast feed loading
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: storageKey,
    ContentType: mimeType,
    ContentLength: bytes,
    // Cache for 1 year (immutable content)
    CacheControl: 'public, max-age=31536000, immutable',
    Metadata: {
      userId: userId,
      kind: kind,
      checksum: checksum || '',
    },
  });

  // Generate pre-signed URL with 15 minute expiration
  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 900, // 15 minutes
  });

  return {
    uploadUrl,
    storageKey,
    cdnUrl,
  };
}

/**
 * Verify that a file exists in S3
 * @param {string} storageKey - S3 storage key
 * @returns {Promise<boolean>}
 */
async function verifyFileExists(storageKey) {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storageKey,
    });
    const response = await s3Client.send(command);

    // Return file metadata
    return {
      exists: true,
      size: response.ContentLength,
      mimeType: response.ContentType,
      lastModified: response.LastModified,
    };
  } catch (error) {
    if (error.name === 'NotFound') {
      return { exists: false };
    }
    console.error('Error verifying file in S3:', error);
    throw error;
  }
}

/**
 * Get CDN URL for a storage key
 * @param {string} storageKey - S3 storage key
 * @returns {string}
 */
function getCdnUrl(storageKey) {
  if (CLOUDFRONT_DOMAIN) {
    return `https://${CLOUDFRONT_DOMAIN}/${storageKey}`;
  }
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${storageKey}`;
}

/**
 * Extract file extension from MIME type
 * @param {string} mimeType
 * @returns {string}
 */
function getExtensionFromMimeType(mimeType) {
  const extensions = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/x-m4v': 'm4v',
    'video/x-matroska': 'mkv',
  };
  return extensions[mimeType] || 'bin';
}

/**
 * Validate video duration (if provided)
 * @param {number} durationSec - Duration in seconds
 * @returns {boolean}
 */
function isValidVideoDuration(durationSec) {
  return durationSec > 0 && durationSec <= MAX_VIDEO_DURATION;
}

module.exports = {
  generatePresignedUploadUrl,
  verifyFileExists,
  getCdnUrl,
  getExtensionFromMimeType,
  isValidVideoDuration,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MAX_VIDEO_DURATION,
  ALLOWED_IMAGE_MIMES,
  ALLOWED_VIDEO_MIMES,
};
