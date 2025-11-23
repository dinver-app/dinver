const { getSignedUrl } = require('@aws-sdk/cloudfront-signer');

// Cache za spremanje URL-ova
const urlCache = new Map();

// Statistika za praćenje učinkovitosti cachea
const cacheStats = {
  hits: 0,
  misses: 0,
  reset: () => {
    cacheStats.hits = 0;
    cacheStats.misses = 0;
  },
};

// Čišćenje cachea svakih sat vremena
setInterval(
  () => {
    const now = Date.now();
    for (const [key, value] of urlCache.entries()) {
      if (value.expiresAt <= now) {
        urlCache.delete(key);
      }
    }

    cacheStats.reset();
  },
  60 * 60 * 1000,
); // Svaki sat

function normalizePrivateKey(rawKey) {
  if (!rawKey) return '';
  let key = String(rawKey).trim();
  // Strip accidental surrounding quotes from dashboard inputs
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'")) ||
    (key.startsWith('`') && key.endsWith('`'))
  ) {
    key = key.slice(1, -1);
  }
  // Replace escaped newlines if provided via env (e.g., HEROKU config vars)
  key = key.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
  // Normalize CRLF to LF
  key = key.replace(/\r\n/g, '\n');
  return key;
}

function getSignedUrlForCloudFront(mediaKey) {
  try {
    // Provjeri cache
    const cached = urlCache.get(mediaKey);
    if (cached && cached.expiresAt > Date.now()) {
      cacheStats.hits++;
      return cached.url;
    }
    cacheStats.misses++;

    const baseUrl = (process.env.CLOUDFRONT_URL || '').replace(/\/+$/, '');

    if (!baseUrl || !process.env.CLOUDFRONT_KEY_PAIR_ID || !process.env.CLOUDFRONT_PRIVATE_KEY) {
      return getS3Url(mediaKey);
    }

    const url = `${baseUrl}/${mediaKey}`;
    const expiresIn = 23 * 60 * 60 * 1000; // 23h (malo manje od stvarnog isteka)

    // Normalize private key content from env
    const normalizedPrivateKey = normalizePrivateKey(
      process.env.CLOUDFRONT_PRIVATE_KEY || '',
    );

    const signedUrl = getSignedUrl({
      url,
      keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID,
      privateKey: normalizedPrivateKey,
      dateLessThan: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h za stvarni URL
    });

    // Spremi u cache
    urlCache.set(mediaKey, {
      url: signedUrl,
      expiresAt: Date.now() + expiresIn,
    });

    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return getS3Url(mediaKey);
  }
}

function getS3Url(mediaKey) {
  return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${mediaKey}`;
}

/**
 * Helper za generiranje URL-a ovisno o tipu medija
 *
 * @param {string} mediaKey - S3 key or base key
 * @param {string} mediaType - Type of media (image, video)
 * @param {string} size - Image size variant (thumbnail, medium, fullscreen, original)
 * @returns {string|null} Media URL
 */
function getMediaUrl(mediaKey, mediaType = 'image', size = 'medium') {
  if (!mediaKey) return null;

  // Remove any full URLs if they were accidentally stored
  if (mediaKey.startsWith('http')) {
    mediaKey = mediaKey.split('.com/').pop();
  }

  // Receipts use QUICK strategy without variants, so don't add size suffix
  const isReceipt = mediaKey.startsWith('receipts/');

  // If requesting a specific size and mediaKey doesn't already have a size suffix
  if (
    mediaType === 'image' &&
    size &&
    size !== 'original' &&
    !isReceipt && // Don't add suffix for receipts
    !mediaKey.match(/-(thumb|medium|full)\.(jpg|jpeg|png|webp)$/i)
  ) {
    // Try to construct the variant key
    const sizeSuffix = getSizeSuffix(size);
    if (sizeSuffix) {
      // Extract base path and extension
      const lastDotIndex = mediaKey.lastIndexOf('.');
      const basePath =
        lastDotIndex > 0 ? mediaKey.substring(0, lastDotIndex) : mediaKey;
      const extension =
        lastDotIndex > 0 ? mediaKey.substring(lastDotIndex) : '.jpg';

      // Check if base path already has a variant suffix
      if (!basePath.match(/-(thumb|medium|full)$/)) {
        mediaKey = `${basePath}${sizeSuffix}${extension}`;
      }
    }
  }

  // Za video i slike koristimo CloudFront s cachiranjem
  if (process.env.CLOUDFRONT_URL) {
    return getSignedUrlForCloudFront(mediaKey);
  }

  // Fallback na direktni S3 URL
  return getS3Url(mediaKey);
}

/**
 * Get all image variants for a base key
 *
 * @param {string} baseKey - Base S3 key (without size suffix)
 * @param {string} mediaType - Type of media
 * @returns {Object} Object with URLs for all variants
 */
function getMediaUrlVariants(baseKey, mediaType = 'image') {
  if (!baseKey || mediaType !== 'image') {
    return {
      thumbnail: getMediaUrl(baseKey, mediaType, 'thumbnail'),
      medium: getMediaUrl(baseKey, mediaType, 'medium'),
      fullscreen: getMediaUrl(baseKey, mediaType, 'fullscreen'),
      original: getMediaUrl(baseKey, mediaType, 'original'),
    };
  }

  // Extract base path without variant suffix
  const cleanBaseKey = baseKey.replace(/-(thumb|medium|full)\.(jpg|jpeg|png|webp)$/i, '');
  const extension = baseKey.match(/\.(jpg|jpeg|png|webp)$/i)?.[0] || '.jpg';
  const basePath = cleanBaseKey.replace(new RegExp(`\\${extension}$`), '');

  return {
    thumbnail: getMediaUrl(`${basePath}-thumb${extension}`, mediaType, 'original'),
    medium: getMediaUrl(`${basePath}-medium${extension}`, mediaType, 'original'),
    fullscreen: getMediaUrl(`${basePath}-full${extension}`, mediaType, 'original'),
    original: getMediaUrl(baseKey, mediaType, 'original'),
  };
}

/**
 * Get size suffix for variant
 *
 * @param {string} size - Size name
 * @returns {string} Size suffix
 */
function getSizeSuffix(size) {
  const suffixes = {
    thumbnail: '-thumb',
    thumb: '-thumb',
    medium: '-medium',
    fullscreen: '-full',
    full: '-full',
  };
  return suffixes[size.toLowerCase()] || '';
}

module.exports = {
  getSignedUrl: getSignedUrlForCloudFront,
  getMediaUrl,
  getMediaUrlVariants,
  getSizeSuffix,
};
