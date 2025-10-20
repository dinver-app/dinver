const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extract receipt data from image using OpenAI Vision API
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Object|null} Extracted data or null if failed
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
      model: 'gpt-4o', // Using gpt-4o for better vision capabilities
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract the following information from this Croatian fiscal receipt image:
1. OIB (Osobni identifikacijski broj) - 11 digits
2. JIR (Jedinstveni identifikator računa) - usually a long string
3. ZKI (Završni kontrolni identifikator) - usually a long string
4. Total amount in EUR (look for "UKUPNO" or similar)
5. Issue date in YYYY-MM-DD format
6. Issue time in HH:MM format

Return the data as a JSON object with these exact keys:
{
  "oib": "string or null",
  "jir": "string or null", 
  "zki": "string or null",
  "totalAmount": number or null,
  "issueDate": "YYYY-MM-DD or null",
  "issueTime": "HH:MM or null"
}

If any field cannot be found, set it to null. Only return valid JSON.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.1, // Low temperature for more consistent results
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.log('No content returned from OpenAI Vision API');
      return null;
    }

    // Parse JSON response
    const extractedData = JSON.parse(content);

    // Validate and clean the data
    const cleanedData = {
      oib: validateOIB(extractedData.oib),
      jir: validateString(extractedData.jir),
      zki: validateString(extractedData.zki),
      totalAmount: validateAmount(extractedData.totalAmount),
      issueDate: validateDate(extractedData.issueDate),
      issueTime: validateTime(extractedData.issueTime),
    };

    console.log('OCR extracted data:', cleanedData);
    return cleanedData;
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
