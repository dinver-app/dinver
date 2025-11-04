const { validateOIBChecksum } = require('./antifraudUtils');

/**
 * Croatian receipt parser with regex and heuristics
 * Extracts structured data from OCR text
 */

/**
 * Extract OIB (11 digits) with checksum validation
 * @param {string} text - OCR text
 * @returns {Object} { value: string|null, confidence: number }
 */
const extractOIB = (text) => {
  if (!text) return { value: null, confidence: 0 };

  // Find all 11-digit sequences
  const oibPattern = /\b(\d{11})\b/g;
  const matches = [...text.matchAll(oibPattern)];

  if (matches.length === 0) {
    return { value: null, confidence: 0 };
  }

  // Validate each match with checksum
  for (const match of matches) {
    const oib = match[1];
    if (validateOIBChecksum(oib)) {
      return { value: oib, confidence: 0.95 };
    }
  }

  // If no valid checksum, return first match with low confidence
  return { value: matches[0][1], confidence: 0.3 };
};

/**
 * Extract JIR (32 hex characters)
 * @param {string} text - OCR text
 * @returns {Object} { value: string|null, confidence: number }
 */
const extractJIR = (text) => {
  if (!text) return { value: null, confidence: 0 };

  // Look for JIR label followed by 32 characters
  const jirPatterns = [
    /JIR[:\s]*([A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12})/i,
    /JIR[:\s]*([A-Fa-f0-9]{32})/i,
    /\b([A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12})\b/,
  ];

  for (const pattern of jirPatterns) {
    const match = text.match(pattern);
    if (match) {
      const jir = match[1].replace(/-/g, ''); // Remove hyphens
      return { value: jir.toUpperCase(), confidence: 0.9 };
    }
  }

  return { value: null, confidence: 0 };
};

/**
 * Extract ZKI (32 hex characters)
 * @param {string} text - OCR text
 * @returns {Object} { value: string|null, confidence: number }
 */
const extractZKI = (text) => {
  if (!text) return { value: null, confidence: 0 };

  // Look for ZKI label followed by 32 characters
  const zkiPatterns = [
    /ZKI[:\s]*([A-Fa-f0-9]{32})/i,
    /ZKI[:\s]*([A-Fa-f0-9]{8}\s*[A-Fa-f0-9]{8}\s*[A-Fa-f0-9]{8}\s*[A-Fa-f0-9]{8})/i,
  ];

  for (const pattern of zkiPatterns) {
    const match = text.match(pattern);
    if (match) {
      const zki = match[1].replace(/\s/g, ''); // Remove spaces
      if (zki.length === 32) {
        return { value: zki.toUpperCase(), confidence: 0.9 };
      }
    }
  }

  return { value: null, confidence: 0 };
};

/**
 * Extract date (DD.MM.YYYY format common in Croatia)
 * @param {string} text - OCR text
 * @returns {Object} { value: string|null (YYYY-MM-DD), confidence: number }
 */
const extractDate = (text) => {
  if (!text) return { value: null, confidence: 0 };

  // Croatian date format: DD.MM.YYYY
  const datePattern = /\b(0[1-9]|[12]\d|3[01])\.(0[1-9]|1[0-2])\.(20\d{2})\b/g;
  const matches = [...text.matchAll(datePattern)];

  if (matches.length === 0) {
    return { value: null, confidence: 0 };
  }

  // Convert to YYYY-MM-DD format
  const dates = matches.map((match) => {
    const day = match[1];
    const month = match[2];
    const year = match[3];
    return {
      date: `${year}-${month}-${day}`,
      raw: match[0],
    };
  });

  // Filter out invalid dates
  const validDates = dates.filter((d) => {
    const date = new Date(d.date);
    return !isNaN(date.getTime());
  });

  if (validDates.length === 0) {
    return { value: null, confidence: 0 };
  }

  // Return the most recent date that's not in the future
  const now = new Date();
  const pastDates = validDates.filter((d) => new Date(d.date) <= now);

  if (pastDates.length > 0) {
    // Return the latest date
    const sorted = pastDates.sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    );
    return { value: sorted[0].date, confidence: 0.85 };
  }

  // If all dates are in future, return the earliest one with low confidence
  const sorted = validDates.sort((a, b) => new Date(a.date) - new Date(b.date));
  return { value: sorted[0].date, confidence: 0.3 };
};

/**
 * Extract time (HH:MM format)
 * @param {string} text - OCR text
 * @returns {Object} { value: string|null, confidence: number }
 */
const extractTime = (text) => {
  if (!text) return { value: null, confidence: 0 };

  // Time pattern: HH:MM or HH:MM:SS
  const timePattern = /\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/g;
  const matches = [...text.matchAll(timePattern)];

  if (matches.length === 0) {
    return { value: null, confidence: 0 };
  }

  // Return the first valid time (usually near the top of receipt)
  const time = `${matches[0][1].padStart(2, '0')}:${matches[0][2]}`;
  return { value: time, confidence: 0.8 };
};

/**
 * Extract total amount
 * @param {string} text - OCR text
 * @returns {Object} { value: number|null, confidence: number }
 */
const extractTotalAmount = (text) => {
  if (!text) return { value: null, confidence: 0 };

  // Look for keywords indicating total
  const totalKeywords =
    /(ukupno|za\s*plat[ií]ti|total|iznos|suma|sveukupno|€|EUR)/gi;

  // Split text into lines
  const lines = text.split('\n');

  let bestAmount = null;
  let bestConfidence = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line contains a total keyword
    if (totalKeywords.test(line)) {
      // Look for amounts in this line and next 2 lines
      const searchLines = lines.slice(i, i + 3).join(' ');

      // Pattern for amounts: 12,34 or 12.34 or 1234,56
      const amountPattern = /\b(\d{1,4})[.,](\d{2})\b/g;
      const amounts = [...searchLines.matchAll(amountPattern)];

      if (amounts.length > 0) {
        // Get the largest amount (usually the total)
        const parsedAmounts = amounts.map((match) => {
          const value =
            parseFloat(`${match[1]}.${match[2]}`) || parseFloat(match[0]);
          return { value, raw: match[0] };
        });

        const largest = parsedAmounts.reduce((max, curr) =>
          curr.value > max.value ? curr : max,
        );

        if (largest.value > bestAmount) {
          bestAmount = largest.value;
          bestConfidence = 0.9;
        }
      }
    }
  }

  if (bestAmount) {
    return { value: bestAmount, confidence: bestConfidence };
  }

  // Fallback: find all amounts and return the largest
  const amountPattern = /\b(\d{1,4})[.,](\d{2})\b/g;
  const allAmounts = [...text.matchAll(amountPattern)];

  if (allAmounts.length > 0) {
    const parsedAmounts = allAmounts.map((match) => {
      return parseFloat(`${match[1]}.${match[2]}`);
    });

    const largest = Math.max(...parsedAmounts);
    return { value: largest, confidence: 0.5 };
  }

  return { value: null, confidence: 0 };
};

/**
 * Extract merchant name (usually at the top)
 * @param {string} text - OCR text
 * @returns {Object} { value: string|null, confidence: number }
 */
const extractMerchantName = (text) => {
  if (!text) return { value: null, confidence: 0 };

  const lines = text.split('\n').filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { value: null, confidence: 0 };
  }

  // Look for lines with business indicators
  const businessPatterns = [
    /d\.o\.o\./i,
    /j\.d\.o\.o\./i,
    /obrt/i,
    /j\.t\.d\./i,
    /d\.d\./i,
    /restoran/i,
    /kavana/i,
    /caffe/i,
  ];

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();

    // Check if line contains business indicator
    for (const pattern of businessPatterns) {
      if (pattern.test(line)) {
        return { value: line, confidence: 0.85 };
      }
    }
  }

  // Fallback: return first non-empty line
  return { value: lines[0].trim(), confidence: 0.6 };
};

/**
 * Extract merchant address
 * @param {string} text - OCR text
 * @returns {Object} { value: string|null, confidence: number }
 */
const extractMerchantAddress = (text) => {
  if (!text) return { value: null, confidence: 0 };

  const lines = text.split('\n').filter((line) => line.trim().length > 0);

  // Look for lines with address patterns (numbers, street names)
  const addressPattern = /\b([A-Za-zčćžšđČĆŽŠĐ\s]+\s+\d+[a-z]?)/i;

  for (let i = 0; i < Math.min(8, lines.length); i++) {
    const line = lines[i].trim();
    const match = line.match(addressPattern);

    if (match) {
      return { value: line, confidence: 0.7 };
    }
  }

  return { value: null, confidence: 0 };
};

/**
 * Parse OCR text and extract all receipt fields
 * @param {string} text - Raw OCR text
 * @returns {Object} Extracted fields with confidence scores
 */
const parseReceiptText = (text) => {
  if (!text) {
    return {
      fields: {},
      confidences: {},
      overallConfidence: 0,
    };
  }

  // Extract all fields
  const oib = extractOIB(text);
  const jir = extractJIR(text);
  const zki = extractZKI(text);
  const date = extractDate(text);
  const time = extractTime(text);
  const total = extractTotalAmount(text);
  const merchant = extractMerchantName(text);
  const address = extractMerchantAddress(text);

  const fields = {
    oib: oib.value,
    jir: jir.value,
    zki: zki.value,
    issueDate: date.value,
    issueTime: time.value,
    totalAmount: total.value,
    merchantName: merchant.value,
    merchantAddress: address.value,
  };

  const confidences = {
    oib: oib.confidence,
    jir: jir.confidence,
    zki: zki.confidence,
    issueDate: date.confidence,
    issueTime: time.confidence,
    totalAmount: total.confidence,
    merchantName: merchant.confidence,
    merchantAddress: address.confidence,
  };

  // Calculate overall confidence (average of non-null fields)
  const nonNullConfidences = Object.values(confidences).filter(
    (c) => c > 0,
  );
  const overallConfidence =
    nonNullConfidences.length > 0
      ? nonNullConfidences.reduce((sum, c) => sum + c, 0) /
        nonNullConfidences.length
      : 0;

  return {
    fields,
    confidences,
    overallConfidence: Math.round(overallConfidence * 100) / 100,
  };
};

module.exports = {
  parseReceiptText,
  extractOIB,
  extractJIR,
  extractZKI,
  extractDate,
  extractTime,
  extractTotalAmount,
  extractMerchantName,
  extractMerchantAddress,
};
