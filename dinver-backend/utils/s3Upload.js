const {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
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

module.exports = { uploadToS3 };
