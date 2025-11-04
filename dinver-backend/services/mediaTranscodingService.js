const ffmpeg = require('fluent-ffmpeg');
const sharp = require('sharp');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Readable } = require('stream');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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
 * Process an image: compress, resize, generate thumbnails
 * @param {string} storageKey - S3 key of the original image
 * @returns {Promise<Object>} - Processed image data
 */
async function processImage(storageKey) {
  try {
    // Download image from S3
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

    // Get image metadata
    const metadata = await sharp(buffer).metadata();
    const { width, height, format } = metadata;

    // Process main image (compress and optimize)
    const processedBuffer = await sharp(buffer)
      .resize(1080, 1920, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    // Upload processed image
    const processedKey = storageKey.replace('/originals/', '/processed/');
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: processedKey,
      Body: processedBuffer,
      ContentType: 'image/jpeg',
    }));

    // Generate thumbnails
    const thumbnails = await generateImageThumbnails(buffer, storageKey);

    return {
      width,
      height,
      mimeType: ContentType,
      processedKey,
      cdnUrl: getCdnUrl(processedKey),
      thumbnails,
    };
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

/**
 * Generate thumbnails for an image
 * @param {Buffer} buffer - Image buffer
 * @param {string} storageKey - Original storage key
 * @returns {Promise<Array>} - Array of thumbnail objects
 */
async function generateImageThumbnails(buffer, storageKey) {
  const sizes = [
    { width: 320, height: 568, name: 'small' },
    { width: 640, height: 1136, name: 'medium' },
  ];

  const thumbnails = [];

  for (const size of sizes) {
    const thumbnailBuffer = await sharp(buffer)
      .resize(size.width, size.height, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    const thumbnailKey = storageKey.replace(
      path.basename(storageKey),
      `thumb_${size.name}_${path.basename(storageKey)}`,
    );

    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: thumbnailKey,
      Body: thumbnailBuffer,
      ContentType: 'image/jpeg',
    }));

    thumbnails.push({
      w: size.width,
      h: size.height,
      cdnUrl: getCdnUrl(thumbnailKey),
    });
  }

  return thumbnails;
}

/**
 * Process a video: transcode, generate thumbnails, extract metadata
 * @param {string} storageKey - S3 key of the original video
 * @returns {Promise<Object>} - Processed video data
 */
async function processVideo(storageKey) {
  return new Promise(async (resolve, reject) => {
    try {
      // Download video from S3
      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: storageKey,
      });
      const { Body } = await s3Client.send(getCommand);

      // Convert stream to buffer for processing
      const chunks = [];
      for await (const chunk of Body) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      // Create a temporary stream from buffer
      const inputStream = Readable.from(buffer);

      // Get video metadata
      ffmpeg.ffprobe(storageKey, async (err, metadata) => {
        if (err) {
          return reject(new Error('Failed to get video metadata: ' + err.message));
        }

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        const width = videoStream.width;
        const height = videoStream.height;
        const durationSec = parseFloat(metadata.format.duration);

        // Validate duration
        if (durationSec > 30) {
          return reject(new Error('Video duration exceeds 30 seconds'));
        }

        // Generate video formats
        const formats = await generateVideoFormats(storageKey, buffer);

        // Generate video thumbnails
        const thumbnails = await generateVideoThumbnails(storageKey, buffer);

        resolve({
          width,
          height,
          durationSec,
          videoFormats: formats,
          thumbnails,
        });
      });
    } catch (error) {
      console.error('Error processing video:', error);
      reject(error);
    }
  });
}

/**
 * Generate different video format transcodes
 * @param {string} storageKey - Original storage key
 * @param {Buffer} buffer - Video buffer
 * @returns {Promise<Object>} - Video formats with CDN URLs
 */
async function generateVideoFormats(storageKey, buffer) {
  // For MVP, we'll just optimize the original MP4
  // In production, you'd generate HLS, multiple resolutions, etc.

  const formats = {};

  // Generate optimized MP4
  const mp4Key = storageKey.replace('/originals/', '/processed/').replace(/\.[^.]+$/, '.mp4');

  // Note: In a real implementation, you'd use FFmpeg to transcode
  // For now, we'll just copy the original as "processed"
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: mp4Key,
    Body: buffer,
    ContentType: 'video/mp4',
  }));

  formats.mp4 = getCdnUrl(mp4Key);

  return formats;
}

/**
 * Generate thumbnail from video
 * @param {string} storageKey - Original storage key
 * @param {Buffer} buffer - Video buffer
 * @returns {Promise<Array>} - Array of thumbnail objects
 */
async function generateVideoThumbnails(storageKey, buffer) {
  return new Promise((resolve, reject) => {
    // For MVP, generate a single thumbnail at 1 second
    const thumbnailKey = storageKey.replace(
      path.basename(storageKey),
      `thumb_${path.basename(storageKey, path.extname(storageKey))}.jpg`,
    );

    const inputStream = Readable.from(buffer);
    const chunks = [];

    ffmpeg(inputStream)
      .screenshots({
        count: 1,
        timestamps: ['00:00:01'],
        size: '320x568',
      })
      .on('filenames', (filenames) => {
        console.log('Generated thumbnails:', filenames);
      })
      .on('end', async () => {
        // In a real implementation, you'd upload the generated thumbnail to S3
        // For now, return a placeholder
        resolve([
          {
            w: 320,
            h: 568,
            cdnUrl: getCdnUrl(thumbnailKey),
          },
        ]);
      })
      .on('error', (err) => {
        console.error('Error generating video thumbnail:', err);
        reject(err);
      });
  });
}

/**
 * Get CDN URL for a storage key
 * @param {string} storageKey
 * @returns {string}
 */
function getCdnUrl(storageKey) {
  if (CLOUDFRONT_DOMAIN) {
    return `https://${CLOUDFRONT_DOMAIN}/${storageKey}`;
  }
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${storageKey}`;
}

/**
 * Main function to process media based on type
 * @param {string} storageKey - S3 storage key
 * @param {string} kind - 'IMAGE' or 'VIDEO'
 * @returns {Promise<Object>}
 */
async function processMedia(storageKey, kind) {
  if (kind === 'IMAGE') {
    return await processImage(storageKey);
  } else if (kind === 'VIDEO') {
    return await processVideo(storageKey);
  } else {
    throw new Error('Invalid media kind. Must be IMAGE or VIDEO');
  }
}

module.exports = {
  processImage,
  processVideo,
  processMedia,
  generateImageThumbnails,
  generateVideoThumbnails,
};
