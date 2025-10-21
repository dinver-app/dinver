const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extract receipt data from image using OpenAI Vision API
 * Returns structured fields and confidences for each
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Object|null} { fields, confidence } or null
 */
const extractReceiptData = async (imageBuffer) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.log('OpenAI API key not configured, skipping OCR');
      return null;
    }

    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are reading a Croatian fiscal receipt image. Extract fields and confidences.

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanations.

Return this exact JSON structure:
{
  "fields": {
    "oib": "11 digit string or null",
    "jir": "string or null",
    "zki": "string or null",
    "totalAmount": number or null,
    "issueDate": "YYYY-MM-DD or null",
    "issueTime": "HH:MM or null",
    "name": "string or null",
    "address": "string or null"
  },
  "confidence": {
    "oib": 0-1,
    "jir": 0-1,
    "zki": 0-1,
    "totalAmount": 0-1,
    "issueDate": 0-1,
    "issueTime": 0-1,
    "name": 0-1,
    "address": 0-1
  }
}

Rules: If missing/unclear, set null. Total is in EUR (look for "UKUPNO").`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64Image}` },
            },
          ],
        },
      ],
      max_tokens: 700,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.log('No content returned from OpenAI Vision API');
      return null;
    }

    // Clean the content - remove markdown code blocks if present
    let cleanedContent = content.trim();

    // Remove markdown code blocks (```json ... ```)
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent
        .replace(/^```json\s*/, '')
        .replace(/\s*```$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '');
    }

    // Remove any remaining markdown formatting
    cleanedContent = cleanedContent.trim();

    // Parse JSON response
    const parsed = JSON.parse(cleanedContent);
    const f = parsed?.fields || {};
    const c = parsed?.confidence || {};

    const cleanedFields = {
      oib: validateOIB(f.oib),
      jir: validateString(f.jir),
      zki: validateString(f.zki),
      totalAmount: validateAmount(f.totalAmount),
      issueDate: validateDate(f.issueDate),
      issueTime: validateTime(f.issueTime),
      name: validateString(f.name),
      address: validateString(f.address),
    };

    const cleanedConfidence = {
      oib: Number.isFinite(c.oib) ? Number(c.oib) : null,
      jir: Number.isFinite(c.jir) ? Number(c.jir) : null,
      zki: Number.isFinite(c.zki) ? Number(c.zki) : null,
      totalAmount: Number.isFinite(c.totalAmount)
        ? Number(c.totalAmount)
        : null,
      issueDate: Number.isFinite(c.issueDate) ? Number(c.issueDate) : null,
      issueTime: Number.isFinite(c.issueTime) ? Number(c.issueTime) : null,
      name: Number.isFinite(c.name) ? Number(c.name) : null,
      address: Number.isFinite(c.address) ? Number(c.address) : null,
    };

    return { fields: cleanedFields, confidence: cleanedConfidence };
  } catch (error) {
    console.error('Error in OCR service:', error);
    return null;
  }
};

/**
 * Validate OIB (must be exactly 11 digits)
 * @param {string} oib - OIB string
 * @returns {string|null} Valid OIB or null
 */
const validateOIB = (oib) => {
  if (!oib || typeof oib !== 'string') return null;
  const cleaned = oib.replace(/\D/g, ''); // Remove non-digits
  return cleaned.length === 11 ? cleaned : null;
};

/**
 * Validate string (not empty, not null)
 * @param {string} str - String to validate
 * @returns {string|null} Valid string or null
 */
const validateString = (str) => {
  if (!str || typeof str !== 'string' || str.trim().length === 0) return null;
  return str.trim();
};

/**
 * Validate amount (positive number)
 * @param {number} amount - Amount to validate
 * @returns {number|null} Valid amount or null
 */
const validateAmount = (amount) => {
  if (typeof amount !== 'number' || amount <= 0) return null;
  return Math.round(amount * 100) / 100; // Round to 2 decimal places
};

/**
 * Validate date (YYYY-MM-DD format)
 * @param {string} date - Date string
 * @returns {string|null} Valid date or null
 */
const validateDate = (date) => {
  if (!date || typeof date !== 'string') return null;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return null;

  // Check if it's a valid date
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) return null;

  return date;
};

/**
 * Validate time (HH:MM format)
 * @param {string} time - Time string
 * @returns {string|null} Valid time or null
 */
const validateTime = (time) => {
  if (!time || typeof time !== 'string') return null;
  const timeRegex = /^\d{2}:\d{2}$/;
  if (!timeRegex.test(time)) return null;

  const [hours, minutes] = time.split(':').map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return time;
};

module.exports = {
  extractReceiptData,
};
