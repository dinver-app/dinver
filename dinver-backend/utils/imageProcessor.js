const sharp = require('sharp');

/**
 * Image size configurations for different use cases
 *
 * THUMBNAIL: Small preview images for lists, grids, avatars
 * MEDIUM: Standard display size for most UI contexts
 * FULLSCREEN: High quality for full-screen views and detail pages
 */
const IMAGE_SIZES = {
  THUMBNAIL: {
    width: 400,
    height: 400,
    quality: 75,
    suffix: '-thumb',
    fit: 'cover', // Crop to fill
  },
  MEDIUM: {
    width: 1200,
    height: null, // Maintain aspect ratio
    quality: 80,
    suffix: '-medium',
    fit: 'inside', // Scale to fit
  },
  FULLSCREEN: {
    width: 2400,
    height: null, // Maintain aspect ratio
    quality: 85,
    suffix: '-full',
    fit: 'inside', // Scale to fit
  },
};

/**
 * Maximum file size in bytes before compression (10MB)
 */
const MAX_ORIGINAL_SIZE = 10 * 1024 * 1024;

/**
 * Processes an image buffer into multiple size variants
 *
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {Object} options - Processing options
 * @param {string} options.originalName - Original filename
 * @param {boolean} options.skipThumbnail - Skip thumbnail generation (default: false)
 * @param {boolean} options.skipMedium - Skip medium generation (default: false)
 * @param {boolean} options.skipFullscreen - Skip fullscreen generation (default: false)
 * @returns {Promise<Object>} Processed image variants
 */
async function processImage(imageBuffer, options = {}) {
  const {
    originalName = 'image',
    skipThumbnail = false,
    skipMedium = false,
    skipFullscreen = false,
  } = options;

  try {
    // Get original image metadata
    const metadata = await sharp(imageBuffer, { failOn: 'none' }).metadata();

    if (!metadata || !metadata.format) {
      throw new Error('Invalid image format');
    }

    const { width, height, format, size } = metadata;

    console.log(`Processing image: ${originalName}`, {
      originalWidth: width,
      originalHeight: height,
      format,
      sizeKB: Math.round(size / 1024),
    });

    // Determine output format (always convert to JPEG for consistency and size)
    const outputFormat = 'jpeg';
    const variants = {};

    // Process thumbnail
    if (!skipThumbnail) {
      const thumbnailConfig = IMAGE_SIZES.THUMBNAIL;
      variants.thumbnail = await generateVariant(
        imageBuffer,
        thumbnailConfig,
        outputFormat,
      );
      console.log(
        `Generated thumbnail: ${Math.round(variants.thumbnail.buffer.length / 1024)}KB`,
      );
    }

    // Process medium
    if (!skipMedium) {
      const mediumConfig = IMAGE_SIZES.MEDIUM;
      // Only resize if original is larger
      if (width > mediumConfig.width) {
        variants.medium = await generateVariant(
          imageBuffer,
          mediumConfig,
          outputFormat,
        );
      } else {
        // Use optimized original if smaller than medium size
        variants.medium = await generateVariant(
          imageBuffer,
          { ...mediumConfig, width: null },
          outputFormat,
        );
      }
      console.log(
        `Generated medium: ${Math.round(variants.medium.buffer.length / 1024)}KB`,
      );
    }

    // Process fullscreen
    if (!skipFullscreen) {
      const fullscreenConfig = IMAGE_SIZES.FULLSCREEN;
      // Only resize if original is larger
      if (width > fullscreenConfig.width) {
        variants.fullscreen = await generateVariant(
          imageBuffer,
          fullscreenConfig,
          outputFormat,
        );
      } else {
        // Use optimized original if smaller than fullscreen size
        variants.fullscreen = await generateVariant(
          imageBuffer,
          { ...fullscreenConfig, width: null },
          outputFormat,
        );
      }
      console.log(
        `Generated fullscreen: ${Math.round(variants.fullscreen.buffer.length / 1024)}KB`,
      );
    }

    return {
      variants,
      metadata: {
        originalWidth: width,
        originalHeight: height,
        originalFormat: format,
        originalSizeBytes: size,
      },
    };
  } catch (error) {
    console.error('Error processing image:', error);
    throw new Error(`Image processing failed: ${error.message}`);
  }
}

/**
 * Generates a single image variant
 *
 * @param {Buffer} imageBuffer - Source image buffer
 * @param {Object} config - Size configuration
 * @param {string} outputFormat - Output format (jpeg, png, webp)
 * @returns {Promise<Object>} Processed variant with buffer and metadata
 */
async function generateVariant(imageBuffer, config, outputFormat = 'jpeg') {
  const { width, height, quality, fit, suffix } = config;

  let pipeline = sharp(imageBuffer, { failOn: 'none' });

  // Auto-rotate based on EXIF orientation
  pipeline = pipeline.rotate();

  // Resize if dimensions specified
  if (width || height) {
    pipeline = pipeline.resize({
      width,
      height,
      fit: fit || 'inside',
      withoutEnlargement: true, // Don't upscale small images
    });
  }

  // Apply format-specific optimizations
  switch (outputFormat) {
    case 'jpeg':
      pipeline = pipeline.jpeg({
        quality: quality || 80,
        mozjpeg: true, // Use mozjpeg for better compression
        progressive: true, // Progressive JPEG for better perceived loading
      });
      break;
    case 'webp':
      pipeline = pipeline.webp({
        quality: quality || 80,
        effort: 4, // Balance between compression and speed
      });
      break;
    case 'png':
      pipeline = pipeline.png({
        quality: quality || 80,
        compressionLevel: 9,
      });
      break;
    default:
      pipeline = pipeline.jpeg({ quality: quality || 80, mozjpeg: true });
  }

  const buffer = await pipeline.toBuffer();
  const metadata = await sharp(buffer).metadata();

  return {
    buffer,
    width: metadata.width,
    height: metadata.height,
    size: buffer.length,
    format: outputFormat,
    suffix: suffix || '',
  };
}

/**
 * Validates image buffer and checks if processing is needed
 *
 * @param {Buffer} imageBuffer - Image buffer to validate
 * @returns {Promise<Object>} Validation result with metadata
 */
async function validateImage(imageBuffer) {
  try {
    const metadata = await sharp(imageBuffer, { failOn: 'none' }).metadata();

    if (!metadata || !metadata.format) {
      return {
        valid: false,
        error: 'Invalid image format',
      };
    }

    const supportedFormats = [
      'jpeg',
      'png',
      'webp',
      'gif',
      'tiff',
      'heic',
      'heif',
    ];
    if (!supportedFormats.includes(metadata.format)) {
      return {
        valid: false,
        error: `Unsupported format: ${metadata.format}`,
      };
    }

    return {
      valid: true,
      metadata,
      needsProcessing: metadata.size > MAX_ORIGINAL_SIZE,
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
    };
  }
}

/**
 * Quick optimize without creating variants (for receipts, etc.)
 *
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {Object} options - Optimization options
 * @returns {Promise<Buffer>} Optimized image buffer
 */
async function quickOptimize(imageBuffer, options = {}) {
  const { maxWidth = 1600, quality = 80 } = options;

  try {
    const metadata = await sharp(imageBuffer).metadata();
    let pipeline = sharp(imageBuffer).rotate();

    if (metadata.width > maxWidth) {
      pipeline = pipeline.resize({ width: maxWidth });
    }

    return await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
  } catch (error) {
    console.error('Quick optimize failed:', error);
    return imageBuffer; // Return original on failure
  }
}

module.exports = {
  processImage,
  validateImage,
  quickOptimize,
  IMAGE_SIZES,
  MAX_ORIGINAL_SIZE,
};
