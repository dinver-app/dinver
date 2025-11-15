/**
 * Experience Image Processor - Optimized for 9:16 vertical (TikTok/Instagram style)
 *
 * Generates 3 variants optimized for social media feeds:
 * - Thumbnail: 405x720 (feed preview, fast loading)
 * - Medium: 1080x1920 (full screen viewing on phones)
 * - Large: 1440x2560 (HD viewing, tablets)
 *
 * Uses the core imageProcessor but with aspect ratios optimized for Experiences
 */

const sharp = require('sharp');
const { processImage: coreProcessImage } = require('./imageProcessor');

// Experience-specific image sizes (9:16 aspect ratio)
const EXPERIENCE_IMAGE_SIZES = {
  THUMBNAIL: {
    width: 405,
    height: 720,
    quality: 75,
    suffix: '-thumb',
    fit: 'cover',
    position: 'center',
  },
  MEDIUM: {
    width: 1080,
    height: 1920,
    quality: 82,
    suffix: '-medium',
    fit: 'cover',
    position: 'center',
  },
  LARGE: {
    width: 1440,
    height: 2560,
    quality: 85,
    suffix: '-large',
    fit: 'cover',
    position: 'center',
  },
};

/**
 * Process an Experience image with optimized 9:16 variants
 *
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {Object} options - Processing options
 * @param {string} options.originalName - Original filename (for logging)
 * @returns {Promise<Object>} - {variants, metadata}
 *
 * Example output:
 * {
 *   variants: {
 *     thumbnail: { buffer: Buffer, width: 405, height: 720, suffix: '-thumb' },
 *     medium: { buffer: Buffer, width: 1080, height: 1920, suffix: '-medium' },
 *     large: { buffer: Buffer, width: 1440, height: 2560, suffix: '-large' }
 *   },
 *   metadata: {
 *     originalWidth: 3024,
 *     originalHeight: 4032,
 *     originalFormat: 'jpeg',
 *     originalSize: 2.5MB
 *   }
 * }
 */
async function processExperienceImage(imageBuffer, options = {}) {
  try {
    // Get original metadata
    const metadata = await sharp(imageBuffer).metadata();
    const { width: originalWidth, height: originalHeight, format, size } = metadata;

    console.log(`Processing Experience image: ${originalWidth}x${originalHeight} (${format})`);

    // Auto-rotate based on EXIF
    let processedBuffer = await sharp(imageBuffer)
      .rotate() // Auto-rotate based on EXIF
      .toBuffer();

    // Generate all variants
    const variants = {};

    for (const [variantName, config] of Object.entries(EXPERIENCE_IMAGE_SIZES)) {
      try {
        // Determine if we should upscale or not
        const shouldProcess = originalWidth >= config.width || originalHeight >= config.height;

        let variantBuffer;

        if (!shouldProcess && variantName === 'LARGE') {
          // If original is smaller than LARGE, skip LARGE variant
          console.log(`Skipping ${variantName} variant - original is smaller`);
          continue;
        }

        // Process the variant
        variantBuffer = await sharp(processedBuffer)
          .resize(config.width, config.height, {
            fit: config.fit,
            position: config.position,
            withoutEnlargement: false, // Allow upscaling for consistency
          })
          .jpeg({
            quality: config.quality,
            progressive: true,
            mozjpeg: true, // Use mozjpeg for better compression
          })
          .toBuffer();

        const variantMetadata = await sharp(variantBuffer).metadata();

        variants[variantName.toLowerCase()] = {
          buffer: variantBuffer,
          width: variantMetadata.width,
          height: variantMetadata.height,
          suffix: config.suffix,
          size: variantBuffer.length,
        };

        console.log(
          `  Generated ${variantName}: ${variantMetadata.width}x${variantMetadata.height} (${(variantBuffer.length / 1024).toFixed(0)}KB)`,
        );
      } catch (variantError) {
        console.error(`Error processing ${variantName} variant:`, variantError);
        // Continue with other variants even if one fails
      }
    }

    // Ensure at least thumbnail and medium exist
    if (!variants.thumbnail || !variants.medium) {
      throw new Error('Failed to generate required variants (thumbnail and medium)');
    }

    return {
      variants,
      metadata: {
        originalWidth,
        originalHeight,
        originalFormat: format,
        originalSize: size,
        aspectRatio: (originalWidth / originalHeight).toFixed(2),
        isPortrait: originalHeight > originalWidth,
      },
    };
  } catch (error) {
    console.error('Error processing Experience image:', error);
    throw new Error(`Image processing failed: ${error.message}`);
  }
}

/**
 * Quick validation of image before processing
 *
 * @param {Buffer} imageBuffer - Image buffer to validate
 * @returns {Promise<{valid: boolean, error?: string, metadata?: Object}>}
 */
async function validateExperienceImage(imageBuffer) {
  try {
    const metadata = await sharp(imageBuffer).metadata();

    // Check if it's a supported format
    const supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'heic', 'heif'];
    if (!supportedFormats.includes(metadata.format)) {
      return {
        valid: false,
        error: `Unsupported format: ${metadata.format}. Supported: ${supportedFormats.join(', ')}`,
      };
    }

    // Check minimum dimensions (should be at least 405x720 for thumbnail)
    if (metadata.width < 200 || metadata.height < 200) {
      return {
        valid: false,
        error: `Image too small: ${metadata.width}x${metadata.height}. Minimum: 200x200px`,
      };
    }

    // Check maximum dimensions (to prevent abuse)
    const MAX_DIMENSION = 10000;
    if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
      return {
        valid: false,
        error: `Image too large: ${metadata.width}x${metadata.height}. Maximum: ${MAX_DIMENSION}x${MAX_DIMENSION}px`,
      };
    }

    return {
      valid: true,
      metadata,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid image file: ${error.message}`,
    };
  }
}

/**
 * Get optimal variant for a specific use case
 *
 * @param {string} useCase - 'feed', 'detail', 'fullscreen'
 * @returns {string} - Variant name (thumbnail, medium, large)
 */
function getOptimalVariant(useCase) {
  const mapping = {
    feed: 'thumbnail', // Fast loading in feed
    detail: 'medium', // Full screen on phone
    fullscreen: 'large', // HD viewing
  };

  return mapping[useCase] || 'medium';
}

module.exports = {
  processExperienceImage,
  validateExperienceImage,
  getOptimalVariant,
  EXPERIENCE_IMAGE_SIZES,
};
