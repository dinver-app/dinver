const { getSignedUrl } = require('@aws-sdk/cloudfront-signer');

// Cache za spremanje URL-ova
const urlCache = new Map();

// Statistika za praćenje učinkovitosti cachea
const cacheStats = {
  hits: 0,
  misses: 0,
  reset: () => {
    cacheStats.hits = 0;
    cacheStats.misses = 0;
  },
};

// Čišćenje cachea svakih sat vremena
setInterval(
  () => {
    const now = Date.now();
    for (const [key, value] of urlCache.entries()) {
      if (value.expiresAt <= now) {
        urlCache.delete(key);
      }
    }

    cacheStats.reset();
  },
  60 * 60 * 1000,
); // Svaki sat

function getSignedUrlForCloudFront(mediaKey) {
  try {
    // Provjeri cache
    const cached = urlCache.get(mediaKey);
    if (cached && cached.expiresAt > Date.now()) {
      cacheStats.hits++;
      return cached.url;
    }
    cacheStats.misses++;

    const url = `${process.env.CLOUDFRONT_URL}/${mediaKey}`;
    const expiresIn = 23 * 60 * 60 * 1000; // 23h (malo manje od stvarnog isteka)

    // Normalize private key newlines if provided via env
    const rawPrivateKey = process.env.CLOUDFRONT_PRIVATE_KEY || '';
    const normalizedPrivateKey = rawPrivateKey.includes('\\n')
      ? rawPrivateKey.replace(/\\n/g, '\n')
      : rawPrivateKey;

    const signedUrl = getSignedUrl({
      url,
      keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID,
      privateKey: normalizedPrivateKey,
      dateLessThan: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h za stvarni URL
    });

    // Spremi u cache
    urlCache.set(mediaKey, {
      url: signedUrl,
      expiresAt: Date.now() + expiresIn,
    });

    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return getS3Url(mediaKey);
  }
}

function getS3Url(mediaKey) {
  return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${mediaKey}`;
}

// Helper za generiranje URL-a ovisno o tipu medija
function getMediaUrl(mediaKey, mediaType = 'image') {
  if (!mediaKey) return null;

  // Remove any full URLs if they were accidentally stored
  if (mediaKey.startsWith('http')) {
    mediaKey = mediaKey.split('.com/').pop();
  }

  // Za video i slike koristimo CloudFront s cachiranjem
  if (process.env.CLOUDFRONT_URL) {
    return getSignedUrlForCloudFront(mediaKey);
  }

  // Fallback na direktni S3 URL
  return getS3Url(mediaKey);
}

module.exports = {
  getSignedUrl: getSignedUrlForCloudFront,
  getMediaUrl,
};
