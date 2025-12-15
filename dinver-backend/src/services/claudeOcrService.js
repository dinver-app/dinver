const Anthropic = require('@anthropic-ai/sdk');

let anthropic = null;
// Using Haiku 4.5 for best price/performance ratio for OCR tasks
// 3x cheaper than Sonnet 4.5 ($1 vs $3 input, $5 vs $15 output)
// Upgrade to Sonnet 4.5 if accuracy issues: 'claude-sonnet-4-5-20250929'
const MODEL_VERSION = 'claude-haiku-4-5-20251001';

/**
 * Get or initialize Anthropic client
 * @returns {Anthropic|null}
 */
const getAnthropicClient = () => {
  if (anthropic) return anthropic;

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('Anthropic API key not configured');
    return null;
  }

  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropic;
};

/**
 * Extract receipt data using Claude 3.5 Sonnet with vision
 * This is a single-step OCR that extracts all fields directly from the image
 *
 * @param {Buffer} imageBuffer - Receipt image buffer
 * @param {string} mimeType - Image MIME type (e.g., 'image/jpeg')
 * @returns {Promise<Object>} Extracted receipt data with confidence scores
 */
const extractReceiptWithClaude = async (
  imageBuffer,
  mimeType = 'image/jpeg',
) => {
  const client = getAnthropicClient();

  if (!client) {
    console.log('Anthropic client not available, cannot extract receipt');
    return null;
  }

  try {
    console.log('[Claude OCR] Starting receipt extraction...');
    const startTime = Date.now();

    // Check image size and normalize format
    // Claude API requires media_type to match actual image format
    // To avoid mismatches (e.g., PNG sent with wrong mime type), always convert to JPEG
    const imageSizeMB = imageBuffer.length / (1024 * 1024);
    let processedBuffer = imageBuffer;
    const sharp = require('sharp');

    // Always convert to JPEG to ensure format consistency
    // This handles: PNG, WebP, GIF, and any other formats
    // Also resize if needed (Claude has 5MB limit)
    const needsResize = imageSizeMB > 4.5;
    const needsConversion = mimeType !== 'image/jpeg';

    if (needsResize || needsConversion) {
      console.log(
        `[Claude OCR] Processing image: size=${imageSizeMB.toFixed(2)}MB, format=${mimeType}, needsResize=${needsResize}, needsConversion=${needsConversion}`,
      );

      let sharpInstance = sharp(imageBuffer);

      if (needsResize) {
        sharpInstance = sharpInstance.resize(2400, 2400, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      processedBuffer = await sharpInstance.jpeg({ quality: 90 }).toBuffer();

      // IMPORTANT: Update mimeType since we converted to JPEG
      mimeType = 'image/jpeg';

      const newSizeMB = processedBuffer.length / (1024 * 1024);
      console.log(`[Claude OCR] Converted to JPEG: ${newSizeMB.toFixed(2)}MB`);
    }

    // Convert buffer to base64
    const base64Image = processedBuffer.toString('base64');

    const prompt = `You are an expert Croatian fiscal receipt parser. Extract ALL information from this receipt image.

CRITICAL RULES:
1. Return ONLY valid JSON, no markdown, no code blocks, no explanations
2. If a field is unclear or missing, set it to null (not empty string)
3. OIB must be exactly 11 digits (validate checksum if possible)
4. JIR is a 32-character hexadecimal code (UUID format or continuous)
5. ZKI is a 32-character hexadecimal/alphanumeric code
6. Date format: YYYY-MM-DD (convert from DD.MM.YYYY if needed)
7. Time format: HH:MM (24-hour format)
8. Total amount in EUR as decimal number (use decimal point, not comma)
9. CRITICAL - Address extraction (most important rule):
   Croatian receipts typically have TWO addresses:
   a) TOP ADDRESS: Legal/company registration address (firma, sjedište društva) - IGNORE THIS!
   b) BOTTOM ADDRESS: Actual restaurant location where meal was served - EXTRACT THIS!

   RULES FOR merchantAddress:
   - Look for keywords: "Restoran", "Objekt", "Poslovnica", "Lokacija:" before the address
   - The restaurant address usually appears AFTER the restaurant/merchant name
   - NEVER extract an address that contains: "d.o.o.", "j.d.o.o.", "d.d.", "obrt" (these are legal entities)
   - If you see two addresses, ALWAYS choose the second one (restaurant location)
   - Example wrong: "Trgovačko društvo XYZ d.o.o., Kralja Zvonimira 123, 31000 Osijek" ❌
   - Example correct: "Restoran Ime, Vukovarska 45, 31327 Bilje" ✅
   - When in doubt, extract the address closest to the items list (that's the serving location)
10. Extract ALL line items from the receipt (food, drinks, etc)
11. Do NOT invent data - only extract what you clearly see

Return this EXACT JSON structure:
{
  "oib": "11 digits or null",
  "jir": "32 hex characters or null",
  "zki": "32 characters or null",
  "totalAmount": number or null,
  "issueDate": "YYYY-MM-DD or null",
  "issueTime": "HH:MM or null",
  "merchantName": "string or null",
  "merchantAddress": "string or null",
  "items": [
    {
      "name": "Item name as shown on receipt",
      "quantity": number or 1,
      "unitPrice": number or null,
      "totalPrice": number
    }
  ],
  "confidence": {
    "oib": 0.0 to 1.0,
    "jir": 0.0 to 1.0,
    "zki": 0.0 to 1.0,
    "totalAmount": 0.0 to 1.0,
    "issueDate": 0.0 to 1.0,
    "issueTime": 0.0 to 1.0,
    "merchantName": 0.0 to 1.0,
    "merchantAddress": 0.0 to 1.0,
    "items": 0.0 to 1.0,
    "overall": 0.0 to 1.0
  },
  "notes": "Any warnings or observations (optional)"
}

IMPORTANT: Be very precise with Croatian fiscal receipt format. Look for:
- OIB near merchant info (11 digits)
- JIR code (labeled as "JIR" followed by hex code)
- ZKI code (labeled as "ZKI" followed by alphanumeric)
- Total/Ukupno for total amount
- Date in DD.MM.YYYY format
- Time in HH:MM format
- Line items listed between header and total (usually with quantity and price)
- Items may have format like: "Pizza Margherita 1x 85,00 EUR" or "Coca Cola 0.5l 2x 15,00 30,00"
- If quantity not visible, assume 1
- If only total price visible (not unit price), set unitPrice to null`;

    const response = await client.messages.create({
      model: MODEL_VERSION,
      max_tokens: 4096, // Increased for line items extraction
      temperature: 0, // Deterministic for data extraction
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    const duration = Date.now() - startTime;
    console.log(`[Claude OCR] Extraction completed in ${duration}ms`);

    if (!response.content || response.content.length === 0) {
      console.error('[Claude OCR] No response content');
      return null;
    }

    // Extract text from response
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent) {
      console.error('[Claude OCR] No text content in response');
      return null;
    }

    let content = textContent.text.trim();

    // Clean markdown formatting if present
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Parse JSON
    const extracted = JSON.parse(content);

    // Validate structure
    if (!extracted || typeof extracted !== 'object') {
      console.error('[Claude OCR] Invalid JSON structure');
      return null;
    }

    // Add metadata
    const result = {
      ...extracted,
      modelVersion: MODEL_VERSION,
      extractionTime: duration,
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
    };

    console.log('[Claude OCR] Extraction successful:', {
      fieldsExtracted: Object.keys(extracted).filter(
        (k) => k !== 'confidence' && k !== 'notes' && extracted[k] !== null,
      ).length,
      overallConfidence: extracted.confidence?.overall || 0,
      duration: `${duration}ms`,
    });

    return result;
  } catch (error) {
    console.error('[Claude OCR] Extraction failed:', error.message);

    // Check for specific errors
    if (error.message?.includes('rate_limit')) {
      throw new Error('Claude API rate limit reached. Please try again later.');
    }
    if (error.message?.includes('authentication')) {
      throw new Error('Claude API authentication failed. Check API key.');
    }

    throw new Error(`Claude OCR extraction failed: ${error.message}`);
  }
};

/**
 * Find matching restaurant by OIB and merchant info
 * Uses Claude to intelligently match restaurant from extracted data
 *
 * @param {Object} extractedData - Data from extractReceiptWithClaude
 * @param {Array} restaurants - Array of restaurants from database
 * @returns {Promise<Object>} { restaurantId, confidence, matchedBy }
 */
const findRestaurantWithClaude = async (extractedData, restaurants) => {
  const client = getAnthropicClient();

  if (!client || !restaurants || restaurants.length === 0) {
    return { restaurantId: null, confidence: 0, matchedBy: null };
  }

  try {
    console.log('[Claude Matching] Finding restaurant match...');

    const prompt = `You are a restaurant matching expert. Given receipt data and a list of possible restaurants, find the best match.

RECEIPT DATA:
- OIB: ${extractedData.oib || 'not found'}
- Merchant Name: ${extractedData.merchantName || 'not found'}
- Merchant Address: ${extractedData.merchantAddress || 'not found'}

POSSIBLE RESTAURANTS:
${restaurants.map((r, i) => `${i + 1}. ${r.name} (OIB: ${r.oib || 'none'}, Address: ${r.address}, City: ${r.place})`).join('\n')}

Return ONLY this JSON structure:
{
  "matchIndex": number or null (1-based index from list above, or null if no match),
  "confidence": 0.0 to 1.0,
  "matchedBy": "oib" | "name" | "address" | "combined" | null,
  "reasoning": "brief explanation"
}

MATCHING RULES:
- If OIB matches exactly → confidence 0.95+, matchedBy: "oib"
- If restaurant name is very similar (>90% match) → confidence 0.85+, matchedBy: "name"
- If name matches AND city/place is same or nearby → confidence 0.90+, matchedBy: "combined"

IMPORTANT NOTES:
- Merchant address from receipt is often the COMPANY/LEGAL address, NOT the actual restaurant location
- Focus primarily on: RESTAURANT NAME match + CITY/PLACE match (not exact street address)
- If restaurant name is unique and matches well, give high confidence even if street address differs
- Example: "Čingi Lingi" name match + city "Bilje" is enough for 0.90+ confidence
- Street address mismatch is acceptable if name + city match strongly
- Only return null/low confidence if the restaurant name clearly doesn't match`;

    const response = await client.messages.create({
      model: MODEL_VERSION,
      max_tokens: 500,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent)
      return { restaurantId: null, confidence: 0, matchedBy: null };

    let content = textContent.text.trim();
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    }

    const match = JSON.parse(content);

    if (
      !match.matchIndex ||
      match.matchIndex < 1 ||
      match.matchIndex > restaurants.length
    ) {
      console.log('[Claude Matching] No confident match found');
      return {
        restaurantId: null,
        confidence: match.confidence || 0,
        matchedBy: match.matchedBy,
      };
    }

    const matchedRestaurant = restaurants[match.matchIndex - 1];

    console.log('[Claude Matching] Match found:', {
      restaurant: matchedRestaurant.name,
      confidence: match.confidence,
      matchedBy: match.matchedBy,
      reasoning: match.reasoning,
    });

    // Return placeId for Google results (no id field), or id for DB results
    const restaurantIdentifier =
      matchedRestaurant.id || matchedRestaurant.placeId;

    console.log('[Claude Matching] Returning identifier:', {
      type: matchedRestaurant.id ? 'database_id' : 'placeId',
      value: restaurantIdentifier,
    });

    return {
      restaurantId: restaurantIdentifier,
      confidence: match.confidence,
      matchedBy: match.matchedBy,
      reasoning: match.reasoning,
    };
  } catch (error) {
    console.error('[Claude Matching] Failed:', error.message);
    return { restaurantId: null, confidence: 0, matchedBy: null };
  }
};

/**
 * Validate if image contains a receipt using Claude
 * Quick validation before full OCR processing
 *
 * @param {Buffer} imageBuffer - Receipt image buffer
 * @param {string} mimeType - Image MIME type (e.g., 'image/jpeg')
 * @returns {Promise<Object>} { isReceipt: boolean, confidence: number, reason: string }
 */
const validateReceiptWithClaude = async (
  imageBuffer,
  mimeType = 'image/jpeg',
) => {
  const client = getAnthropicClient();

  if (!client) {
    console.log(
      '[Claude Validation] Anthropic client not available, skipping validation',
    );
    return { isReceipt: true, confidence: 1, reason: 'Claude not configured' };
  }

  try {
    console.log('[Claude Validation] Validating image is a receipt...');
    const startTime = Date.now();

    // Check image size and normalize format
    // Claude API requires media_type to match actual image format
    const imageSizeMB = imageBuffer.length / (1024 * 1024);
    let processedBuffer = imageBuffer;
    const sharp = require('sharp');

    const needsResize = imageSizeMB > 4.5;
    const needsConversion = mimeType !== 'image/jpeg';

    if (needsResize || needsConversion) {
      console.log(
        `[Claude Validation] Processing image: size=${imageSizeMB.toFixed(2)}MB, format=${mimeType}`,
      );

      let sharpInstance = sharp(imageBuffer);

      if (needsResize) {
        sharpInstance = sharpInstance.resize(1600, 1600, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      processedBuffer = await sharpInstance.jpeg({ quality: 85 }).toBuffer();
      mimeType = 'image/jpeg';

      const newSizeMB = processedBuffer.length / (1024 * 1024);
      console.log(
        `[Claude Validation] Converted to JPEG: ${newSizeMB.toFixed(2)}MB`,
      );
    }

    // Convert buffer to base64
    const base64Image = processedBuffer.toString('base64');

    const prompt = `You are an image classifier. Analyze this image and determine if it's a fiscal receipt (račun).

A valid receipt typically contains:
- Merchant/business name
- Date and time
- List of items or total amount
- Fiscal codes (OIB, JIR, ZKI for Croatian receipts)
- Receipt number or transaction ID

Return ONLY valid JSON with this structure:
{
  "isReceipt": true or false,
  "confidence": 0.0 to 1.0,
  "reason": "brief explanation why it is or isn't a receipt"
}

Be strict: Return false if image is:
- A menu
- A photo of food
- A business card
- A screenshot that's not a receipt
- Unrelated content
- Too blurry to read`;

    const response = await client.messages.create({
      model: MODEL_VERSION,
      max_tokens: 300,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    const duration = Date.now() - startTime;
    console.log(`[Claude Validation] Completed in ${duration}ms`);

    if (!response.content || response.content.length === 0) {
      console.error('[Claude Validation] No response content');
      return { isReceipt: false, confidence: 0, reason: 'Validation failed' };
    }

    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent) {
      console.error('[Claude Validation] No text content in response');
      return { isReceipt: false, confidence: 0, reason: 'Validation failed' };
    }

    let content = textContent.text.trim();

    // Clean markdown formatting if present
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const result = JSON.parse(content);

    console.log('[Claude Validation] Result:', {
      isReceipt: result.isReceipt,
      confidence: result.confidence,
      reason: result.reason,
    });

    return {
      isReceipt: result.isReceipt || false,
      confidence: result.confidence || 0,
      reason: result.reason || 'Unknown',
    };
  } catch (error) {
    console.error('[Claude Validation] Failed:', error.message);
    console.error('[Claude Validation] Full error:', error);

    // If it's a model not found error, return validation failure
    if (
      error.message?.includes('not_found_error') ||
      error.message?.includes('404')
    ) {
      console.error('[Claude Validation] Model not found - validation failed');
      return {
        isReceipt: false,
        confidence: 0,
        reason: 'Validation service unavailable',
      };
    }

    // For other errors (network, timeout), fail open but log warning
    console.warn(
      '[Claude Validation] Allowing processing despite validation error (fail open)',
    );
    return {
      isReceipt: true,
      confidence: 0.5,
      reason: 'Validation error, allowing processing',
    };
  }
};

module.exports = {
  extractReceiptWithClaude,
  findRestaurantWithClaude,
  validateReceiptWithClaude,
  MODEL_VERSION,
};
