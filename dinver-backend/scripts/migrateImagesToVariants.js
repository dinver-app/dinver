/**
 * Migration script to process existing S3 images into variants
 *
 * This script:
 * 1. Lists all images in specified S3 folders
 * 2. Downloads each original image
 * 3. Processes into 3 variants (thumbnail, medium, fullscreen)
 * 4. Uploads all variants to S3
 * 5. Optionally updates database records
 *
 * Usage:
 *   node scripts/migrateImagesToVariants.js --folder=menu_items --dry-run
 *   node scripts/migrateImagesToVariants.js --folder=drink_items --update-db
 *   node scripts/migrateImagesToVariants.js --all
 */

require('dotenv').config();
const {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');
const { processImage } = require('../utils/imageProcessor');
const { uploadVariantsToS3 } = require('../utils/s3Upload');
const { v4: uuidv4 } = require('uuid');
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

// Folders to migrate
const FOLDERS = [
  'drink_items',
  'menu_items',
  'restaurant_thumbnails',
  'blog_images',
  'profile_images',
  'review_images',
  'leaderboard-cycles',
  'receipts',
];

/**
 * List all images in a folder
 */
async function listImagesInFolder(folder) {
  const images = [];
  let continuationToken = null;

  do {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: folder + '/',
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);

    if (response.Contents) {
      // Filter only image files and exclude already processed variants
      const folderImages = response.Contents.filter((obj) => {
        const key = obj.Key;
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

    // Upload variants
    const folder = path.dirname(imageKey);
    const originalBaseName = path.basename(
      imageKey,
      path.extname(imageKey),
    );
    // Keep original filename or generate new one
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
 * Migrate all images in a folder
 */
async function migrateFolder(folder, options = {}) {
  const { dryRun = false, limit = null } = options;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`MIGRATING FOLDER: ${folder}`);
  console.log(`${'='.repeat(60)}`);

  // List images
  console.log('Listing images...');
  const images = await listImagesInFolder(folder);
  console.log(`Found ${images.length} images`);

  if (images.length === 0) {
    return { folder, total: 0, processed: 0, successful: 0, failed: 0 };
  }

  // Limit for testing
  const imagesToProcess = limit ? images.slice(0, limit) : images;

  const results = {
    folder,
    total: images.length,
    processed: 0,
    successful: 0,
    failed: 0,
    errors: [],
  };

  // Process each image
  for (const image of imagesToProcess) {
    const result = await processImageFile(image.key, dryRun);
    results.processed++;

    if (result.success) {
      results.successful++;
    } else {
      results.failed++;
      results.errors.push({
        key: image.key,
        error: result.error,
      });
    }

    // Progress
    const progress = ((results.processed / imagesToProcess.length) * 100).toFixed(1);
    console.log(
      `\nProgress: ${results.processed}/${imagesToProcess.length} (${progress}%)`,
    );
    console.log(`Success: ${results.successful}, Failed: ${results.failed}`);
  }

  return results;
}

/**
 * Main migration function
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('IMAGE VARIANT MIGRATION SCRIPT');
  console.log('='.repeat(60));
  console.log(`Bucket: ${bucketName}`);
  console.log(`Dry Run: ${args['dry-run'] ? 'YES' : 'NO'}`);
  console.log(`Update DB: ${args['update-db'] ? 'YES' : 'NO'}`);
  console.log('='.repeat(60));

  const dryRun = !!args['dry-run'];
  const limit = args.limit ? parseInt(args.limit) : null;

  let foldersToMigrate = [];

  if (args.all) {
    foldersToMigrate = FOLDERS;
  } else if (args.folder) {
    foldersToMigrate = [args.folder];
  } else {
    console.error(
      '\nError: Please specify --folder=<name> or --all',
    );
    console.log('\nAvailable folders:');
    FOLDERS.forEach((f) => console.log(`  - ${f}`));
    console.log('\nExamples:');
    console.log('  node scripts/migrateImagesToVariants.js --folder=menu_items --dry-run');
    console.log('  node scripts/migrateImagesToVariants.js --all --limit=10');
    process.exit(1);
  }

  const allResults = [];

  for (const folder of foldersToMigrate) {
    try {
      const result = await migrateFolder(folder, { dryRun, limit });
      allResults.push(result);
    } catch (error) {
      console.error(`\nFailed to migrate folder ${folder}:`, error);
      allResults.push({
        folder,
        error: error.message,
      });
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(60));

  let totalProcessed = 0;
  let totalSuccessful = 0;
  let totalFailed = 0;

  for (const result of allResults) {
    if (result.error) {
      console.log(`\n${result.folder}: ERROR - ${result.error}`);
      continue;
    }

    totalProcessed += result.processed || 0;
    totalSuccessful += result.successful || 0;
    totalFailed += result.failed || 0;

    console.log(`\n${result.folder}:`);
    console.log(`  Total images: ${result.total}`);
    console.log(`  Processed: ${result.processed}`);
    console.log(`  Successful: ${result.successful}`);
    console.log(`  Failed: ${result.failed}`);

    if (result.errors && result.errors.length > 0) {
      console.log(`  Errors:`);
      result.errors.slice(0, 5).forEach((err) => {
        console.log(`    - ${err.key}: ${err.error}`);
      });
      if (result.errors.length > 5) {
        console.log(`    ... and ${result.errors.length - 5} more`);
      }
    }
  }

  console.log('\n' + '-'.repeat(60));
  console.log(`TOTAL PROCESSED: ${totalProcessed}`);
  console.log(`TOTAL SUCCESSFUL: ${totalSuccessful}`);
  console.log(`TOTAL FAILED: ${totalFailed}`);
  console.log('='.repeat(60) + '\n');

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

module.exports = { migrateFolder, processImageFile };
