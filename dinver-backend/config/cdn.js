const AWS = require('aws-sdk');

// Inicijaliziraj CloudFront signer samo ako su dostupni potrebni env varijable
let cloudfront = null;

function initCloudFront() {
  if (
    !cloudfront &&
    process.env.CLOUDFRONT_KEY_PAIR_ID &&
    process.env.CLOUDFRONT_PRIVATE_KEY
  ) {
    try {
      cloudfront = new AWS.CloudFront.Signer(
        process.env.CLOUDFRONT_KEY_PAIR_ID,
        process.env.CLOUDFRONT_PRIVATE_KEY,
      );
    } catch (error) {
      console.error('Failed to initialize CloudFront signer:', error);
    }
  }
}

function getSignedUrl(videoKey) {
  try {
    initCloudFront();

    if (!cloudfront) {
      // Ako CloudFront nije dostupan, vrati direktni S3 URL
      return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${videoKey}`;
    }

    return cloudfront.getSignedUrl({
      url: `${process.env.CLOUDFRONT_URL}/${videoKey}`,
      expires: Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000), // 24h
    });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    // Fallback na direktni S3 URL u slučaju greške
    return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${videoKey}`;
  }
}

module.exports = { getSignedUrl };
