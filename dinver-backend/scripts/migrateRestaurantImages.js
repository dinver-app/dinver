/**
 * Special migration script for restaurant_images folder structure
 *
 * This handles the nested structure:
 * restaurant_images/
 *   restaurant-slug-1/
 *     image1.jpg
 *     image2.jpg
 *   restaurant-slug-2/
 *     image1.jpg
 *
 * Usage:
 *   node scripts/migrateRestaurantImages.js --dry-run
 *   node scripts/migrateRestaurantImages.js --limit=10
 *   node scripts/migrateRestaurantImages.js
 */

require('dotenv').config();
const {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');
const { processImage } = require('../utils/imageProcessor');
const { uploadVariantsToS3 } = require('../utils/s3Upload');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  acc[key.replace('--', '')] = value || true;
  return acc;
}, {});

// S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucketName =
  process.env.AWS_S3_BUCKET_NAME || 'dinver-restaurant-thumbnails';

/**
 * List all subfolders in restaurant_images
 */
async function listRestaurantFolders() {
  const folders = new Set();
  let continuationToken = null;

  do {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'restaurant_images/',
      Delimiter: '/',
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);

    if (response.CommonPrefixes) {
      response.CommonPrefixes.forEach((prefix) => {
        // Extract folder name from prefix like "restaurant_images/bocca-di-lupo---bar-restaurant/"
        const folderPath = prefix.Prefix;
        if (folderPath !== 'restaurant_images/') {
          folders.add(folderPath);
        }
      });
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return Array.from(folders);
}

/**
 * List all images in a specific restaurant folder
 */
async function listImagesInRestaurantFolder(folderPath) {
  const images = [];
  let continuationToken = null;

  do {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: folderPath,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);

    if (response.Contents) {
      // Filter only image files and exclude already processed variants
      const folderImages = response.Contents.filter((obj) => {
        const key = obj.Key;

        // Skip the folder itself
        if (key === folderPath) return false;

        // Exclude variants (files ending with -thumb, -medium, -full)
        if (key.match(/-(thumb|medium|full)\.(jpg|jpeg|png|webp)$/i)) {
          return false;
        }

        // Include only image files
        return key.match(/\.(jpg|jpeg|png|webp|gif|heic|heif)$/i);
      }).map((obj) => ({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
      }));

      images.push(...folderImages);
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return images;
}

/**
 * Download image from S3
 */
async function downloadImage(key) {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const response = await s3Client.send(command);
    const chunks = [];

    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  } catch (error) {
    console.error(`Failed to download ${key}:`, error.message);
    return null;
  }
}

/**
 * Process and upload image variants
 */
async function processImageFile(imageKey, dryRun = false) {
  try {
    console.log(`\n[Processing] ${imageKey}`);

    // Download original
    const imageBuffer = await downloadImage(imageKey);
    if (!imageBuffer) {
      return { success: false, error: 'Download failed' };
    }

    console.log(`  Downloaded: ${Math.round(imageBuffer.length / 1024)}KB`);

    // Process into variants
    const { variants, metadata } = await processImage(imageBuffer, {
      originalName: imageKey,
    });

    console.log(`  Original: ${metadata.originalWidth}x${metadata.originalHeight}`);
    console.log(
      `  Variants: ${Object.keys(variants).length} (${Object.keys(variants).join(', ')})`,
    );

    if (dryRun) {
      console.log('  [DRY RUN] Skipping upload');
      return {
        success: true,
        dryRun: true,
        variants: Object.keys(variants),
      };
    }

    // Upload variants - keep the same folder structure
    const folder = path.dirname(imageKey); // e.g., "restaurant_images/bocca-di-lupo---bar-restaurant"
    const originalBaseName = path.basename(
      imageKey,
      path.extname(imageKey),
    );
    const baseFileName = originalBaseName;

    const uploadResult = await uploadVariantsToS3(
      variants,
      folder,
      baseFileName,
    );

    console.log(`  Uploaded variants:`);
    for (const [variant, key] of Object.entries(uploadResult.variants)) {
      console.log(`    ${variant}: ${key}`);
    }

    return {
      success: true,
      originalKey: imageKey,
      variants: uploadResult.variants,
      metadata,
    };
  } catch (error) {
    console.error(`  [ERROR] ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Migrate all images in restaurant_images with subfolder structure
 */
async function migrateRestaurantImages(options = {}) {
  const { dryRun = false, limit = null } = options;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`MIGRATING RESTAURANT IMAGES (with subfolders)`);
  console.log(`${'='.repeat(60)}`);

  // List all restaurant folders
  console.log('Listing restaurant folders...');
  const restaurantFolders = await listRestaurantFolders();
  console.log(`Found ${restaurantFolders.length} restaurant folders`);

  const results = {
    totalFolders: restaurantFolders.length,
    totalImages: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    errors: [],
    folderResults: [],
  };

  // Process each restaurant folder
  for (const folderPath of restaurantFolders) {
    const restaurantSlug = folderPath.replace('restaurant_images/', '').replace('/', '');
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Processing: ${restaurantSlug}`);
    console.log(`${'─'.repeat(60)}`);

    // List images in this folder
    const images = await listImagesInRestaurantFolder(folderPath);
    console.log(`  Found ${images.length} images in this folder`);

    results.totalImages += images.length;

    if (images.length === 0) {
      console.log(`  Skipping empty folder`);
      continue;
    }

    const folderResult = {
      folder: restaurantSlug,
      totalImages: images.length,
      processed: 0,
      successful: 0,
      failed: 0,
    };

    // Limit for testing
    const imagesToProcess = limit && results.processed < limit
      ? images.slice(0, Math.min(limit - results.processed, images.length))
      : images;

    // Process each image in this folder
    for (const image of imagesToProcess) {
      const result = await processImageFile(image.key, dryRun);

      results.processed++;
      folderResult.processed++;

      if (result.success) {
        results.successful++;
        folderResult.successful++;
      } else {
        results.failed++;
        folderResult.failed++;
        results.errors.push({
          key: image.key,
          error: result.error,
        });
      }

      // Progress
      const progress = ((results.processed / results.totalImages) * 100).toFixed(1);
      console.log(
        `  Progress: ${results.processed}/${results.totalImages} (${progress}%) | Success: ${results.successful} | Failed: ${results.failed}`,
      );

      // Stop if we hit the limit
      if (limit && results.processed >= limit) {
        console.log(`\n  [LIMIT REACHED] Stopping at ${limit} images`);
        break;
      }
    }

    results.folderResults.push(folderResult);

    // Stop if we hit the limit
    if (limit && results.processed >= limit) {
      break;
    }
  }

  return results;
}

/**
 * Main function
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('RESTAURANT IMAGES MIGRATION SCRIPT');
  console.log('='.repeat(60));
  console.log(`Bucket: ${bucketName}`);
  console.log(`Dry Run: ${args['dry-run'] ? 'YES' : 'NO'}`);
  console.log('='.repeat(60));

  const dryRun = !!args['dry-run'];
  const limit = args.limit ? parseInt(args.limit) : null;

  const results = await migrateRestaurantImages({ dryRun, limit });

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total restaurant folders: ${results.totalFolders}`);
  console.log(`Total images found: ${results.totalImages}`);
  console.log(`Images processed: ${results.processed}`);
  console.log(`Successful: ${results.successful}`);
  console.log(`Failed: ${results.failed}`);

  if (results.folderResults.length > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log('PER FOLDER RESULTS:');
    console.log('-'.repeat(60));
    for (const folderResult of results.folderResults) {
      console.log(`\n${folderResult.folder}:`);
      console.log(`  Images: ${folderResult.totalImages}`);
      console.log(`  Processed: ${folderResult.processed}`);
      console.log(`  Successful: ${folderResult.successful}`);
      console.log(`  Failed: ${folderResult.failed}`);
    }
  }

  if (results.errors.length > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log('ERRORS:');
    console.log('-'.repeat(60));
    results.errors.slice(0, 10).forEach((err) => {
      console.log(`  ${err.key}: ${err.error}`);
    });
    if (results.errors.length > 10) {
      console.log(`  ... and ${results.errors.length - 10} more errors`);
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');

  if (dryRun) {
    console.log('This was a DRY RUN. No images were uploaded.');
    console.log('Run without --dry-run to perform actual migration.\n');
  }
}

// Run migration
if (require.main === module) {
  main()
    .then(() => {
      console.log('Migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateRestaurantImages, processImageFile };
