const Anthropic = require('@anthropic-ai/sdk');
const { convertHeicIfNeeded } = require('../../utils/imageProcessor');

let anthropic = null;
// Using Haiku 4.5 for speed and cost efficiency
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
 * Quick extraction of ONLY merchant name and address from receipt
 * This is optimized for speed - extracts only the essentials for restaurant matching
 *
 * @param {Buffer} imageBuffer - Receipt image buffer
 * @param {string} mimeType - Image MIME type (e.g., 'image/jpeg')
 * @returns {Promise<Object>} { merchantName, merchantAddress }
 */
const extractMerchantInfoQuick = async (imageBuffer, mimeType = 'image/jpeg') => {
  const client = getAnthropicClient();

  if (!client) {
    console.log('[Quick OCR] Anthropic client not available');
    return null;
  }

  try {
    console.log('[Quick OCR] Starting quick merchant extraction...');
    const startTime = Date.now();

    // Convert HEIC to JPEG if needed (before any processing)
    const { buffer: convertedBuffer, converted } = await convertHeicIfNeeded(imageBuffer, mimeType);
    if (converted) {
      imageBuffer = convertedBuffer;
      mimeType = 'image/jpeg'; // Update mime type after conversion
      console.log('[Quick OCR] HEIC converted to JPEG');
    }

    // Compress image if needed (Claude has 5MB limit)
    const imageSizeMB = imageBuffer.length / (1024 * 1024);
    let processedBuffer = imageBuffer;

    if (imageSizeMB > 4.5) {
      console.log(`[Quick OCR] Image too large (${imageSizeMB.toFixed(2)}MB), compressing...`);
      const sharp = require('sharp');

      processedBuffer = await sharp(imageBuffer)
        .resize(1600, 1600, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      const newSizeMB = processedBuffer.length / (1024 * 1024);
      console.log(`[Quick OCR] Compressed to ${newSizeMB.toFixed(2)}MB`);
    }

    // Convert buffer to base64
    const base64Image = processedBuffer.toString('base64');

    // Minimal prompt - focus ONLY on merchant name and address
    const prompt = `Extract ONLY the merchant name and address from this Croatian receipt.

CRITICAL RULES:
1. merchantName: The restaurant/business name (NOT the legal company name)
2. merchantAddress: The ACTUAL restaurant location (NOT the legal/company address)

ADDRESS EXTRACTION RULES:
- Croatian receipts often have TWO addresses:
  a) TOP: Legal/company address (firma, sjedište) - IGNORE THIS
  b) BOTTOM: Restaurant location (where meal was served) - EXTRACT THIS
- Look for keywords: "Restoran", "Objekt", "Poslovnica", "Lokacija:"
- NEVER extract addresses with: "d.o.o.", "j.d.o.o.", "d.d.", "obrt"
- If unclear, choose the address closest to the items list

Return ONLY this JSON (no markdown, no explanations):
{
  "merchantName": "string or null",
  "merchantAddress": "string or null"
}`;

    const response = await client.messages.create({
      model: MODEL_VERSION,
      max_tokens: 200, // Minimal tokens = faster response!
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
    console.log(`[Quick OCR] Extraction completed in ${duration}ms`);

    if (!response.content || response.content.length === 0) {
      console.error('[Quick OCR] No response content');
      return null;
    }

    // Extract text from response
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent) {
      console.error('[Quick OCR] No text content in response');
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

    console.log('[Quick OCR] Extracted:', {
      merchantName: extracted.merchantName,
      merchantAddress: extracted.merchantAddress,
      duration: `${duration}ms`,
    });

    return {
      merchantName: extracted.merchantName || null,
      merchantAddress: extracted.merchantAddress || null,
      extractionTime: duration,
    };
  } catch (error) {
    console.error('[Quick OCR] Extraction failed:', error.message);

    // Check for specific errors
    if (error.message?.includes('rate_limit')) {
      throw new Error('Claude API rate limit reached. Please try again later.');
    }
    if (error.message?.includes('authentication')) {
      throw new Error('Claude API authentication failed. Check API key.');
    }

    throw new Error(`Quick OCR extraction failed: ${error.message}`);
  }
};

module.exports = {
  extractMerchantInfoQuick,
  MODEL_VERSION,
};
