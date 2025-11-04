const OpenAI = require('openai');

let openai = null;

/**
 * Get or initialize OpenAI client
 * @returns {OpenAI|null}
 */
const getOpenAIClient = () => {
  if (openai) return openai;

  if (!process.env.OPENAI_API_KEY) {
    console.warn('OpenAI API key not configured');
    return null;
  }

  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
};

/**
 * Normalize receipt data using GPT-4o when parser is uncertain
 * @param {string} rawText - Raw OCR text
 * @param {Object} parserResult - Result from parser (fields with low confidence)
 * @returns {Promise<Object>} Normalized fields
 */
const normalizeWithGPT = async (rawText, parserResult = {}) => {
  const client = getOpenAIClient();

  if (!client) {
    console.log('OpenAI client not available, skipping GPT normalization');
    return null;
  }

  try {
    console.log('Using GPT-4o to normalize uncertain fields...');

    const prompt = `You are a Croatian fiscal receipt parser. Extract the following fields from the OCR text.

IMPORTANT RULES:
1. Return ONLY valid JSON, no markdown, no code blocks, no explanations
2. If a field is missing or unclear, set it to null
3. OIB must be exactly 11 digits
4. JIR and ZKI are 32-character hex codes
5. Date format: YYYY-MM-DD
6. Time format: HH:MM
7. Total amount in EUR (decimal number)
8. Do NOT invent data - only extract what you see

Return this exact JSON structure:
{
  "oib": "11 digits or null",
  "jir": "32 characters or null",
  "zki": "32 characters or null",
  "totalAmount": number or null,
  "issueDate": "YYYY-MM-DD or null",
  "issueTime": "HH:MM or null",
  "merchantName": "string or null",
  "merchantAddress": "string or null"
}

OCR TEXT:
"""
${rawText}
"""`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a precise data extraction system. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      console.log('No response from GPT');
      return null;
    }

    // Clean markdown formatting
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent
        .replace(/^```json\s*/, '')
        .replace(/\s*```$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleanedContent);

    // Validate and clean the fields
    const normalized = {
      oib: validateOIB(parsed.oib),
      jir: validateHex(parsed.jir, 32),
      zki: validateHex(parsed.zki, 32),
      totalAmount: validateAmount(parsed.totalAmount),
      issueDate: validateDate(parsed.issueDate),
      issueTime: validateTime(parsed.issueTime),
      merchantName: validateString(parsed.merchantName),
      merchantAddress: validateString(parsed.merchantAddress),
    };

    return normalized;
  } catch (error) {
    console.error('Error in GPT normalization:', error);
    return null;
  }
};

/**
 * Use GPT-4o Vision to extract receipt data from image directly
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<Object>} Extracted fields
 */
const extractWithGPTVision = async (imageBuffer) => {
  const client = getOpenAIClient();

  if (!client) {
    console.log('OpenAI client not available');
    return null;
  }

  try {
    const base64Image = imageBuffer.toString('base64');

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract receipt data from this Croatian fiscal receipt image.

IMPORTANT: Return ONLY valid JSON, no markdown, no explanations.

Return this exact structure:
{
  "oib": "11 digits or null",
  "jir": "32 characters or null",
  "zki": "32 characters or null",
  "totalAmount": number or null,
  "issueDate": "YYYY-MM-DD or null",
  "issueTime": "HH:MM or null",
  "merchantName": "string or null",
  "merchantAddress": "string or null"
}

Rules:
- OIB: exactly 11 digits
- JIR/ZKI: 32-character hex codes
- Date: YYYY-MM-DD format
- Time: HH:MM format
- Total: in EUR (decimal)
- Do NOT invent data`,
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
      return null;
    }

    // Clean and parse
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent
        .replace(/^```json\s*/, '')
        .replace(/\s*```$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleanedContent);

    return {
      oib: validateOIB(parsed.oib),
      jir: validateHex(parsed.jir, 32),
      zki: validateHex(parsed.zki, 32),
      totalAmount: validateAmount(parsed.totalAmount),
      issueDate: validateDate(parsed.issueDate),
      issueTime: validateTime(parsed.issueTime),
      merchantName: validateString(parsed.merchantName),
      merchantAddress: validateString(parsed.merchantAddress),
    };
  } catch (error) {
    console.error('Error in GPT Vision extraction:', error);
    return null;
  }
};

// Validation helpers
const validateOIB = (oib) => {
  if (!oib || typeof oib !== 'string') return null;
  const cleaned = oib.replace(/\D/g, '');
  return cleaned.length === 11 ? cleaned : null;
};

const validateHex = (hex, length) => {
  if (!hex || typeof hex !== 'string') return null;
  const cleaned = hex.replace(/[^A-Fa-f0-9]/g, '');
  return cleaned.length === length ? cleaned.toUpperCase() : null;
};

const validateAmount = (amount) => {
  if (typeof amount !== 'number' || amount <= 0) return null;
  return Math.round(amount * 100) / 100;
};

const validateDate = (date) => {
  if (!date || typeof date !== 'string') return null;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return null;
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return null;
  return date;
};

const validateTime = (time) => {
  if (!time || typeof time !== 'string') return null;
  const timeRegex = /^\d{2}:\d{2}$/;
  if (!timeRegex.test(time)) return null;
  const [hours, minutes] = time.split(':').map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return time;
};

const validateString = (str) => {
  if (!str || typeof str !== 'string' || str.trim().length === 0) return null;
  return str.trim();
};

module.exports = {
  normalizeWithGPT,
  extractWithGPTVision,
  getOpenAIClient,
};
