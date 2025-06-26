const { getSignedUrl } = require('@aws-sdk/cloudfront-signer');

function getSignedUrlForCloudFront(mediaKey) {
  try {
    const url = `${process.env.CLOUDFRONT_URL}/${mediaKey}`;

    const signedUrl = getSignedUrl({
      url,
      keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID,
      privateKey: process.env.CLOUDFRONT_PRIVATE_KEY,
      dateLessThan: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    });

    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${mediaKey}`;
  }
}

// Helper za generiranje URL-a ovisno o tipu medija
function getMediaUrl(mediaKey, mediaType = 'image') {
  // Za video uvijek koristimo CloudFront zbog streaminga
  if (mediaType === 'video') {
    return getSignedUrlForCloudFront(mediaKey);
  }

  // Za slike, koristimo CloudFront ako je konfiguriran, inače fallback na S3
  if (process.env.USE_CLOUDFRONT_FOR_IMAGES === 'true') {
    return getSignedUrlForCloudFront(mediaKey);
  }

  // Fallback na direktni S3 URL
  return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${mediaKey}`;
}

module.exports = {
  getSignedUrl: getSignedUrlForCloudFront,
  getMediaUrl,
};
