const {
  validateOIBChecksum,
  calculateAmountConsistency,
  detectFraudPatterns,
} = require('../utils/antifraudUtils');
const { Restaurant } = require('../../models');

/**
 * Decision Engine for auto-approve scoring
 * Calculates a score from 0-1 based on multiple factors
 */

/**
 * Calculate auto-approve score for receipt
 * @param {Object} params - Receipt data and context
 * @returns {Promise<Object>} { score, decision, reason, breakdown }
 */
const calculateAutoApproveScore = async ({
  extractedData,
  declaredTotal,
  userLocation,
  restaurantId,
  fraudFlags,
  visionConfidence,
  parserConfidence,
}) => {
  let score = 0;
  const breakdown = {};
  const reasons = [];

  // Factor 1: OIB validation (0.3 points)
  if (extractedData.oib) {
    if (validateOIBChecksum(extractedData.oib)) {
      // Check if OIB exists in restaurant database
      const restaurant = await Restaurant.findOne({
        where: { oib: extractedData.oib },
      });

      if (restaurant) {
        score += 0.3;
        breakdown.oibValidation = 0.3;
        reasons.push('Valid OIB found in database');

        // If restaurantId matches, extra confidence
        if (restaurantId && restaurant.id === restaurantId) {
          score += 0.05;
          breakdown.oibMatch = 0.05;
          reasons.push('OIB matches selected restaurant');
        }
      } else {
        score += 0.15;
        breakdown.oibValidation = 0.15;
        reasons.push('Valid OIB checksum but not in database');
      }
    } else {
      breakdown.oibValidation = 0;
      reasons.push('Invalid OIB checksum');
    }
  } else {
    breakdown.oibValidation = 0;
    reasons.push('No OIB extracted');
  }

  // Factor 2: Date validation (0.2 points)
  if (extractedData.issueDate && extractedData.issueTime) {
    const issueDateTime = new Date(
      `${extractedData.issueDate}T${extractedData.issueTime}`,
    );
    const now = new Date();
    const daysDiff = Math.floor((now - issueDateTime) / (1000 * 60 * 60 * 24));

    if (daysDiff >= 0 && daysDiff <= 2) {
      score += 0.2;
      breakdown.dateValidation = 0.2;
      reasons.push(`Receipt from ${daysDiff} day(s) ago`);
    } else if (daysDiff > 2 && daysDiff <= 7) {
      score += 0.1;
      breakdown.dateValidation = 0.1;
      reasons.push('Receipt older than 2 days');
    } else {
      breakdown.dateValidation = 0;
      if (daysDiff < 0) {
        reasons.push('Receipt date is in the future');
      } else {
        reasons.push('Receipt too old');
      }
    }
  } else {
    breakdown.dateValidation = 0;
    reasons.push('Missing date/time information');
  }

  // Factor 3: Amount consistency (0.2 points)
  if (declaredTotal && extractedData.totalAmount) {
    const consistency = calculateAmountConsistency(
      declaredTotal,
      extractedData.totalAmount,
    );

    if (consistency !== null) {
      const consistencyScore = consistency * 0.2;
      score += consistencyScore;
      breakdown.amountConsistency = consistencyScore;

      if (consistency >= 0.9) {
        reasons.push('Declared amount matches extracted amount');
      } else if (consistency >= 0.7) {
        reasons.push('Declared amount similar to extracted amount');
      } else {
        reasons.push('Declared amount differs from extracted amount');
      }
    }
  } else if (extractedData.totalAmount) {
    // No declared total, but extracted total exists
    score += 0.1;
    breakdown.amountConsistency = 0.1;
    reasons.push('Total amount extracted');
  } else {
    breakdown.amountConsistency = 0;
    reasons.push('No total amount available');
  }

  // Factor 4: Merchant name fuzzy match (0.1 points)
  if (extractedData.merchantName && restaurantId) {
    try {
      const restaurant = await Restaurant.findByPk(restaurantId);
      if (restaurant) {
        const similarity = calculateStringSimilarity(
          extractedData.merchantName.toLowerCase(),
          restaurant.name.toLowerCase(),
        );

        if (similarity > 0.8) {
          score += 0.1;
          breakdown.merchantMatch = 0.1;
          reasons.push('Merchant name matches restaurant');
        } else if (similarity > 0.5) {
          score += 0.05;
          breakdown.merchantMatch = 0.05;
          reasons.push('Merchant name partially matches');
        } else {
          breakdown.merchantMatch = 0;
          reasons.push('Merchant name mismatch');
        }
      }
    } catch (error) {
      console.error('Error checking merchant match:', error);
      breakdown.merchantMatch = 0;
    }
  } else {
    breakdown.merchantMatch = 0;
  }

  // Factor 5: Location proximity (0.1 points)
  if (userLocation && userLocation.withinGeofence !== null) {
    if (userLocation.withinGeofence) {
      score += 0.1;
      breakdown.location = 0.1;
      reasons.push(
        `User within ${Math.round(userLocation.distance)}m of restaurant`,
      );
    } else if (userLocation.distance < 500) {
      score += 0.05;
      breakdown.location = 0.05;
      reasons.push(
        `User ${Math.round(userLocation.distance)}m from restaurant`,
      );
    } else {
      breakdown.location = 0;
      reasons.push('User far from restaurant location');
    }
  } else {
    breakdown.location = 0;
    reasons.push('No location data');
  }

  // Factor 6: OCR confidence (0.1 points)
  if (visionConfidence && parserConfidence) {
    const avgConfidence = (visionConfidence + parserConfidence) / 2;
    const confidenceScore = avgConfidence * 0.1;
    score += confidenceScore;
    breakdown.ocrConfidence = confidenceScore;
    reasons.push(`OCR confidence: ${Math.round(avgConfidence * 100)}%`);
  } else {
    breakdown.ocrConfidence = 0;
    reasons.push('Low OCR confidence');
  }

  // Penalty: Fraud flags
  if (fraudFlags && fraudFlags.length > 0) {
    const penalty = Math.min(fraudFlags.length * 0.1, 0.3);
    score -= penalty;
    breakdown.fraudPenalty = -penalty;
    reasons.push(`Fraud flags: ${fraudFlags.join(', ')}`);
  }

  // Normalize score to 0-1 range
  score = Math.max(0, Math.min(1, score));
  score = Math.round(score * 100) / 100;

  // Decision thresholds
  let decision = 'pending_review';
  if (score >= 0.8) {
    decision = 'auto_approved';
  } else if (score < 0.5) {
    decision = 'rejected';
  }

  return {
    score,
    decision,
    reasons: reasons.filter((r) => r),
    breakdown,
  };
};

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Distance
 */
const levenshteinDistance = (str1, str2) => {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
};

/**
 * Calculate similarity between two strings (0-1)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score
 */
const calculateStringSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;

  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);

  if (maxLength === 0) return 1;

  return 1 - distance / maxLength;
};

/**
 * Determine consistency score between all extracted fields
 * @param {Object} extractedData - Extracted receipt data
 * @returns {number} Consistency score (0-1)
 */
const calculateConsistencyScore = (extractedData) => {
  let score = 0;
  let factors = 0;

  // Check if OIB and merchant name are consistent
  if (extractedData.oib && extractedData.merchantName) {
    score += 0.25;
    factors++;
  }

  // Check if date and time are consistent
  if (extractedData.issueDate && extractedData.issueTime) {
    score += 0.25;
    factors++;
  }

  // Check if JIR or ZKI exists
  if (extractedData.jir || extractedData.zki) {
    score += 0.25;
    factors++;
  }

  // Check if total amount is reasonable
  if (extractedData.totalAmount && extractedData.totalAmount > 0) {
    score += 0.25;
    factors++;
  }

  return factors > 0 ? score : 0;
};

module.exports = {
  calculateAutoApproveScore,
  calculateConsistencyScore,
  calculateStringSimilarity,
  levenshteinDistance,
};
