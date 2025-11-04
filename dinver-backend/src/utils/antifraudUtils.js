const imageHash = require('image-hash');

/**
 * Calculate perceptual hash of an image
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<string>} Perceptual hash
 */
const calculatePerceptualHash = async (imageBuffer) => {
  try {
    // Convert buffer to base64 data URL for image-hash library
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    // Use 16-bit hash for better accuracy
    // Wrap in promise since image-hash uses callback
    return new Promise((resolve, reject) => {
      imageHash(dataUrl, 16, true, (error, hash) => {
        if (error) {
          reject(error);
        } else {
          resolve(hash);
        }
      });
    });
  } catch (error) {
    console.error('Error calculating perceptual hash:', error);
    return null;
  }
};

/**
 * Calculate Hamming distance between two hashes
 * @param {string} hash1 - First hash
 * @param {string} hash2 - Second hash
 * @returns {number} Hamming distance (0 = identical, higher = more different)
 */
const calculateHammingDistance = (hash1, hash2) => {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) {
    return Infinity;
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }
  return distance;
};

/**
 * Check if two images are similar based on perceptual hash
 * @param {string} hash1 - First hash
 * @param {string} hash2 - Second hash
 * @param {number} threshold - Threshold for similarity (default: 5)
 * @returns {boolean} True if images are similar
 */
const areSimilarImages = (hash1, hash2, threshold = 5) => {
  const distance = calculateHammingDistance(hash1, hash2);
  return distance <= threshold;
};

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
const calculateGpsDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Check if user location is within geofence of restaurant
 * @param {number} userLat - User latitude
 * @param {number} userLng - User longitude
 * @param {number} restaurantLat - Restaurant latitude
 * @param {number} restaurantLng - Restaurant longitude
 * @param {number} maxDistance - Maximum allowed distance in meters (default: 150m)
 * @returns {Object} { withinGeofence: boolean, distance: number }
 */
const checkGeofence = (
  userLat,
  userLng,
  restaurantLat,
  restaurantLng,
  maxDistance = 150,
) => {
  if (!userLat || !userLng || !restaurantLat || !restaurantLng) {
    return { withinGeofence: null, distance: null };
  }

  const distance = calculateGpsDistance(
    userLat,
    userLng,
    restaurantLat,
    restaurantLng,
  );
  return {
    withinGeofence: distance <= maxDistance,
    distance: Math.round(distance * 10) / 10, // Round to 1 decimal
  };
};

/**
 * Validate Croatian OIB using mod 11,10 checksum
 * @param {string} oib - OIB string (11 digits)
 * @returns {boolean} True if valid
 */
const validateOIBChecksum = (oib) => {
  if (!oib || typeof oib !== 'string' || oib.length !== 11) {
    return false;
  }

  // Check if all characters are digits
  if (!/^\d{11}$/.test(oib)) {
    return false;
  }

  // Mod 11,10 algorithm
  let a = 10;
  for (let i = 0; i < 10; i++) {
    a = (a + parseInt(oib[i], 10)) % 10;
    if (a === 0) a = 10;
    a = (a * 2) % 11;
  }

  const kontrolna = (11 - a) % 10;
  return kontrolna === parseInt(oib[10], 10);
};

/**
 * Check for suspicious patterns in receipt data
 * @param {Object} receiptData - Receipt data to check
 * @returns {Array<string>} Array of fraud flags
 */
const detectFraudPatterns = (receiptData) => {
  const flags = [];

  // Check if total amount is suspiciously round
  if (receiptData.totalAmount && receiptData.totalAmount % 10 === 0) {
    if (receiptData.totalAmount >= 100) {
      flags.push('round_total');
    }
  }

  // Check if date is too old
  if (receiptData.issueDate) {
    const issueDate = new Date(receiptData.issueDate);
    const now = new Date();
    const daysDiff = Math.floor((now - issueDate) / (1000 * 60 * 60 * 24));

    if (daysDiff > 7) {
      flags.push('old_receipt');
    }
    if (daysDiff < 0) {
      flags.push('future_date');
    }
  }

  // Check if time is during unusual hours
  if (receiptData.issueTime) {
    const [hours] = receiptData.issueTime.split(':').map(Number);
    if (hours < 6 || hours > 23) {
      flags.push('unusual_hours');
    }
  }

  // Check if OIB is invalid
  if (receiptData.oib && !validateOIBChecksum(receiptData.oib)) {
    flags.push('invalid_oib');
  }

  // Check if location is too far from restaurant
  if (
    receiptData.geofenceCheck &&
    receiptData.geofenceCheck.withinGeofence === false &&
    receiptData.geofenceCheck.distance > 500
  ) {
    flags.push('location_mismatch');
  }

  return flags;
};

/**
 * Calculate consistency score between declared and extracted amounts
 * @param {number} declaredTotal - User-declared total
 * @param {number} extractedTotal - OCR-extracted total
 * @returns {number} Consistency score (0-1)
 */
const calculateAmountConsistency = (declaredTotal, extractedTotal) => {
  if (!declaredTotal || !extractedTotal) {
    return null;
  }

  const diff = Math.abs(declaredTotal - extractedTotal);
  const percentDiff = (diff / extractedTotal) * 100;

  // Perfect match
  if (percentDiff === 0) return 1.0;

  // Within 2% difference
  if (percentDiff <= 2) return 0.95;

  // Within 5% difference
  if (percentDiff <= 5) return 0.85;

  // Within 10% difference
  if (percentDiff <= 10) return 0.7;

  // More than 10% difference
  return 0.0;
};

module.exports = {
  calculatePerceptualHash,
  calculateHammingDistance,
  areSimilarImages,
  calculateGpsDistance,
  checkGeofence,
  validateOIBChecksum,
  detectFraudPatterns,
  calculateAmountConsistency,
};
