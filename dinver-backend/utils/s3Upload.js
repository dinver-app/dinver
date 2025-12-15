const {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} = require('@aws-sdk/client-s3');
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

async function verifyFileExists(bucket, key) {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('File does not exist in S3:', { bucket, key, error });
    return false;
  }
}

async function uploadToS3(file, folder) {
  try {
    const bucketName =
      process.env.AWS_S3_BUCKET_NAME || 'dinver-restaurant-thumbnails';

    if (!file.buffer) {
      throw new Error('File buffer is missing');
    }

    const fileExtension = path.extname(file.originalname);
    const fileName = folder
      ? `${folder}/${uuidv4()}${fileExtension}`
      : `${uuidv4()}${fileExtension}`;

    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    const command = new PutObjectCommand(params);
    const result = await s3Client.send(command);

    // Verify the file was actually uploaded
    const exists = await verifyFileExists(bucketName, fileName);
    if (!exists) {
      throw new Error(
        'File upload appeared successful but file not found in S3',
      );
    }

    return fileName;
  } catch (error) {
    console.error('Error in uploadToS3:', error);
    console.error('AWS credentials status:', {
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      hasRegion: !!process.env.AWS_REGION,
      hasBucket: !!process.env.AWS_S3_BUCKET_NAME,
      defaultBucket: 'dinver-restaurant-thumbnails',
    });
    throw error;
  }
}

/**
 * Upload multiple image variants to S3
 * This function uploads thumbnail, medium, and fullscreen versions of an image
 *
 * @param {Object} variants - Image variants from imageProcessor
 * @param {string} folder - S3 folder path
 * @param {string} baseFileName - Base filename (without extension)
 * @returns {Promise<Object>} Upload results with S3 keys for each variant
 */
async function uploadVariantsToS3(variants, folder, baseFileName) {
  try {
    const bucketName =
      process.env.AWS_S3_BUCKET_NAME || 'dinver-restaurant-thumbnails';

    const uploadPromises = [];
    const variantKeys = {};

    // Upload each variant
    for (const [variantName, variantData] of Object.entries(variants)) {
      const fileName = folder
        ? `${folder}/${baseFileName}${variantData.suffix}.jpg`
        : `${baseFileName}${variantData.suffix}.jpg`;

      const params = {
        Bucket: bucketName,
        Key: fileName,
        Body: variantData.buffer,
        ContentType: `image/${variantData.format}`,
        Metadata: {
          width: String(variantData.width),
          height: String(variantData.height),
          variant: variantName,
        },
      };

      uploadPromises.push(
        s3Client.send(new PutObjectCommand(params)).then(() => {
          variantKeys[variantName] = fileName;
          console.log(`Uploaded ${variantName}: ${fileName}`);
        }),
      );
    }

    // Wait for all uploads to complete
    await Promise.all(uploadPromises);

    // Verify at least one variant was uploaded
    if (Object.keys(variantKeys).length === 0) {
      throw new Error('No variants were uploaded');
    }

    return {
      variants: variantKeys,
      baseFileName,
      folder,
    };
  } catch (error) {
    console.error('Error in uploadVariantsToS3:', error);
    throw error;
  }
}

/**
 * Upload single buffer to S3 with custom key
 *
 * @param {Buffer} buffer - File buffer
 * @param {string} key - S3 key (full path)
 * @param {string} contentType - Content type
 * @returns {Promise<string>} S3 key
 */
async function uploadBufferToS3(buffer, key, contentType = 'image/jpeg') {
  try {
    const bucketName =
      process.env.AWS_S3_BUCKET_NAME || 'dinver-restaurant-thumbnails';

    const params = {
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    };

    await s3Client.send(new PutObjectCommand(params));

    // S3 PutObject is atomic - no need for verification
    return key;
  } catch (error) {
    console.error('Error in uploadBufferToS3:', error);
    throw error;
  }
}

/**
 * Get base file name from a variant key
 * Removes variant suffix (-thumb, -medium, -full) and extension
 *
 * @param {string} variantKey - S3 key with variant suffix
 * @returns {string} Base file name
 */
function getBaseFileName(variantKey) {
  const fileName = path.basename(variantKey, path.extname(variantKey));
  return fileName.replace(/-(thumb|medium|full)$/, '');
}

/**
 * Get folder from S3 key
 *
 * @param {string} key - S3 key
 * @returns {string} Folder path
 */
function getFolderFromKey(key) {
  const parts = key.split('/');
  parts.pop(); // Remove filename
  return parts.join('/');
}

/**
 * Delete image variants from S3
 * Deletes thumbnail, medium, fullscreen, and original variants
 *
 * @param {string} thumbnailUrl - S3 key for thumbnail variant
 * @param {string} mediumUrl - S3 key for medium variant
 * @param {string} fullscreenUrl - S3 key for fullscreen variant
 * @param {string} originalUrl - S3 key for original variant
 * @returns {Promise<Object>} Deletion result
 */
async function deleteImageVariants(thumbnailUrl, mediumUrl, fullscreenUrl, originalUrl) {
  try {
    const bucketName =
      process.env.AWS_S3_BUCKET_NAME || 'dinver-restaurant-thumbnails';

    const keysToDelete = [];

    if (thumbnailUrl) keysToDelete.push({ Key: thumbnailUrl });
    if (mediumUrl) keysToDelete.push({ Key: mediumUrl });
    if (fullscreenUrl) keysToDelete.push({ Key: fullscreenUrl });
    if (originalUrl) keysToDelete.push({ Key: originalUrl });

    if (keysToDelete.length === 0) {
      console.log('No image variants to delete');
      return { success: true, deletedCount: 0 };
    }

    // Delete all variants in a single batch operation
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: {
        Objects: keysToDelete,
        Quiet: false,
      },
    });

    const result = await s3Client.send(deleteCommand);

    console.log(`Deleted ${keysToDelete.length} image variant(s) from S3:`, keysToDelete.map(k => k.Key));

    return {
      success: true,
      deletedCount: keysToDelete.length,
      deleted: result.Deleted || [],
      errors: result.Errors || [],
    };
  } catch (error) {
    console.error('Error deleting image variants from S3:', error);
    throw error;
  }
}

/**
 * Delete single file from S3
 *
 * @param {string} key - S3 key to delete
 * @returns {Promise<boolean>} Success status
 */
async function deleteFromS3(key) {
  try {
    if (!key) {
      console.log('No key provided for deletion');
      return false;
    }

    const bucketName =
      process.env.AWS_S3_BUCKET_NAME || 'dinver-restaurant-thumbnails';

    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await s3Client.send(deleteCommand);
    console.log(`Deleted file from S3: ${key}`);

    return true;
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw error;
  }
}

module.exports = {
  uploadToS3,
  uploadVariantsToS3,
  uploadBufferToS3,
  getBaseFileName,
  getFolderFromKey,
  deleteImageVariants,
  deleteFromS3,
};
