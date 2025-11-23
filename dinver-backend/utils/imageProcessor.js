const sharp = require('sharp');
const heicConvert = require('heic-convert');

/**
 * Image size configurations for different use cases
 *
 * THUMBNAIL: Small preview images for lists, grids, avatars
 * MEDIUM: Standard display size for most UI contexts
 * FULLSCREEN: High quality for full-screen views and detail pages
 * ORIGINAL: Highest quality for receipts, OCR, admin review, legal purposes
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
  ORIGINAL: {
    width: 3200,
    height: null, // Maintain aspect ratio
    quality: 92,
    suffix: '-original',
    fit: 'inside', // Scale to fit
  },
};

/**
 * Maximum file size in bytes before compression (10MB)
 */
const MAX_ORIGINAL_SIZE = 10 * 1024 * 1024;

/**
 * Detects if buffer is HEIC/HEIF format and converts to JPEG
 *
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {string} mimeType - MIME type (optional)
 * @returns {Promise<{buffer: Buffer, converted: boolean}>}
 */
async function convertHeicIfNeeded(imageBuffer, mimeType = '') {
  try {
    // Check if it's HEIC/HEIF format
    const isHeic =
      mimeType.toLowerCase().includes('heic') ||
      mimeType.toLowerCase().includes('heif') ||
      // Check file signature (HEIC files start with 'ftyp' at offset 4)
      (imageBuffer.length > 12 &&
       imageBuffer.toString('ascii', 4, 8).includes('ftyp') &&
       (imageBuffer.toString('ascii', 8, 12) === 'heic' ||
        imageBuffer.toString('ascii', 8, 12) === 'mif1'));

    if (!isHeic) {
      return { buffer: imageBuffer, converted: false };
    }

    console.log('[HEIC Converter] Detected HEIC format, converting to JPEG...');
    const startTime = Date.now();

    // Convert HEIC to JPEG
    const jpegBuffer = await heicConvert({
      buffer: imageBuffer,
      format: 'JPEG',
      quality: 0.95, // High quality for receipts
    });

    const duration = Date.now() - startTime;
    console.log(`[HEIC Converter] Converted to JPEG in ${duration}ms (${Math.round(jpegBuffer.length / 1024)}KB)`);

    return {
      buffer: Buffer.from(jpegBuffer),
      converted: true
    };
  } catch (error) {
    console.error('[HEIC Converter] Conversion failed:', error.message);
    // If conversion fails, try to process original anyway
    return { buffer: imageBuffer, converted: false };
  }
}

/**
 * Processes an image buffer into multiple size variants
 *
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {Object} options - Processing options
 * @param {string} options.originalName - Original filename
 * @param {boolean} options.skipThumbnail - Skip thumbnail generation (default: false)
 * @param {boolean} options.skipMedium - Skip medium generation (default: false)
 * @param {boolean} options.skipFullscreen - Skip fullscreen generation (default: false)
 * @param {boolean} options.skipOriginal - Skip original generation (default: false)
 * @returns {Promise<Object>} Processed image variants
 */
async function processImage(imageBuffer, options = {}) {
  const {
    originalName = 'image',
    skipThumbnail = false,
    skipMedium = false,
    skipFullscreen = false,
    skipOriginal = true, // Default TRUE - only create original for receipts
    mimeType = '',
  } = options;

  try {
    // Convert HEIC to JPEG if needed (before Sharp processing)
    const { buffer: processedBuffer, converted } = await convertHeicIfNeeded(imageBuffer, mimeType);
    if (converted) {
      imageBuffer = processedBuffer;
      console.log('[Image Processor] Using converted JPEG buffer');
    }

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

    // OPTIMIZATION: Process all variants in parallel (2-3x faster!)
    const variantPromises = [];
    const variantKeys = [];

    // Process thumbnail
    if (!skipThumbnail) {
      variantKeys.push('thumbnail');
      variantPromises.push(
        generateVariant(imageBuffer, IMAGE_SIZES.THUMBNAIL, outputFormat),
      );
    }

    // Process medium
    if (!skipMedium) {
      const mediumConfig = IMAGE_SIZES.MEDIUM;
      const config =
        width > mediumConfig.width
          ? mediumConfig
          : { ...mediumConfig, width: null };

      variantKeys.push('medium');
      variantPromises.push(generateVariant(imageBuffer, config, outputFormat));
    }

    // Process fullscreen
    if (!skipFullscreen) {
      const fullscreenConfig = IMAGE_SIZES.FULLSCREEN;
      const config =
        width > fullscreenConfig.width
          ? fullscreenConfig
          : { ...fullscreenConfig, width: null };

      variantKeys.push('fullscreen');
      variantPromises.push(generateVariant(imageBuffer, config, outputFormat));
    }

    // Process original (high quality for OCR, admin review, legal)
    if (!skipOriginal) {
      const originalConfig = IMAGE_SIZES.ORIGINAL;
      const config =
        width > originalConfig.width
          ? originalConfig
          : { ...originalConfig, width: null };

      variantKeys.push('original');
      variantPromises.push(generateVariant(imageBuffer, config, outputFormat));
    }

    // Wait for all variants to process in parallel
    const variantResults = await Promise.all(variantPromises);

    // Map results back to variants object
    const variants = {};
    variantResults.forEach((result, index) => {
      const key = variantKeys[index];
      variants[key] = result;
      console.log(
        `Generated ${key}: ${Math.round(result.buffer.length / 1024)}KB`,
      );
    });

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
  const { maxWidth = 1600, quality = 80, mimeType = '' } = options;

  try {
    // Convert HEIC to JPEG if needed
    const { buffer: processedBuffer, converted } = await convertHeicIfNeeded(imageBuffer, mimeType);
    if (converted) {
      imageBuffer = processedBuffer;
    }

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
  convertHeicIfNeeded,
  IMAGE_SIZES,
  MAX_ORIGINAL_SIZE,
};
