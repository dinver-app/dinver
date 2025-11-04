const vision = require('@google-cloud/vision');
const { parseReceiptText } = require('../utils/receiptParser');

// Initialize Vision client
let visionClient = null;

/**
 * Get or initialize Vision client
 * @returns {vision.ImageAnnotatorClient|null}
 */
const getVisionClient = () => {
  if (visionClient) return visionClient;

  try {
    // Check if credentials are configured
    if (
      !process.env.GOOGLE_APPLICATION_CREDENTIALS &&
      !process.env.GOOGLE_CLOUD_PROJECT
    ) {
      console.warn(
        'Google Cloud Vision not configured. Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_PROJECT.',
      );
      return null;
    }

    visionClient = new vision.ImageAnnotatorClient();
    return visionClient;
  } catch (error) {
    console.error('Error initializing Vision client:', error);
    return null;
  }
};

/**
 * Extract text from image using Google Cloud Vision
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<Object>} { text, confidence, blocks }
 */
const extractTextWithVision = async (imageBuffer) => {
  const client = getVisionClient();

  if (!client) {
    console.log('Vision client not available, skipping Vision OCR');
    return null;
  }

  try {
    // Perform document text detection
    const [result] = await client.documentTextDetection({
      image: { content: imageBuffer },
    });

    const fullTextAnnotation = result.fullTextAnnotation;

    if (!fullTextAnnotation || !fullTextAnnotation.text) {
      console.log('No text detected by Vision API');
      return null;
    }

    // Extract text and confidence
    const text = fullTextAnnotation.text;

    // Calculate average confidence from pages
    let totalConfidence = 0;
    let confidenceCount = 0;

    if (fullTextAnnotation.pages && fullTextAnnotation.pages.length > 0) {
      fullTextAnnotation.pages.forEach((page) => {
        if (page.blocks && page.blocks.length > 0) {
          page.blocks.forEach((block) => {
            if (block.confidence !== undefined) {
              totalConfidence += block.confidence;
              confidenceCount++;
            }
          });
        }
      });
    }

    const averageConfidence =
      confidenceCount > 0 ? totalConfidence / confidenceCount : 0.5;

    // Extract bounding boxes for important info (optional)
    const blocks = [];
    if (fullTextAnnotation.pages && fullTextAnnotation.pages.length > 0) {
      fullTextAnnotation.pages.forEach((page) => {
        if (page.blocks) {
          page.blocks.forEach((block) => {
            const blockText = block.paragraphs
              ?.map((p) =>
                p.words
                  ?.map((w) => w.symbols?.map((s) => s.text).join(''))
                  .join(' '),
              )
              .join('\n');

            if (blockText) {
              blocks.push({
                text: blockText,
                confidence: block.confidence || 0,
              });
            }
          });
        }
      });
    }

    return {
      text,
      confidence: Math.round(averageConfidence * 100) / 100,
      blocks: blocks.length > 0 ? blocks : null,
    };
  } catch (error) {
    console.error('Error in Vision OCR:', error);
    return null;
  }
};

/**
 * Main OCR function: Vision + Parser
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<Object>} Structured receipt data
 */
const extractReceiptWithVision = async (imageBuffer) => {
  try {
    // Step 1: Extract text with Google Vision
    const visionResult = await extractTextWithVision(imageBuffer);

    if (!visionResult || !visionResult.text) {
      console.log('Vision OCR returned no text');
      return {
        method: 'vision',
        success: false,
        rawText: null,
        visionConfidence: 0,
        fields: {},
        confidences: {},
        parserConfidence: 0,
      };
    }

    console.log(
      `Vision OCR extracted ${visionResult.text.length} characters with confidence ${visionResult.confidence}`,
    );

    // Step 2: Parse the text with our parser
    const parsed = parseReceiptText(visionResult.text);

    return {
      method: 'vision',
      success: true,
      rawText: visionResult.text,
      visionConfidence: visionResult.confidence,
      blocks: visionResult.blocks,
      fields: parsed.fields,
      confidences: parsed.confidences,
      parserConfidence: parsed.overallConfidence,
    };
  } catch (error) {
    console.error('Error in extractReceiptWithVision:', error);
    return {
      method: 'vision',
      success: false,
      error: error.message,
      rawText: null,
      visionConfidence: 0,
      fields: {},
      confidences: {},
      parserConfidence: 0,
    };
  }
};

/**
 * Validate if image contains a receipt (quick check)
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<Object>} { isReceipt: boolean, confidence: number, reason: string }
 */
const validateReceiptImage = async (imageBuffer) => {
  const client = getVisionClient();

  if (!client) {
    return { isReceipt: true, confidence: 1, reason: 'Vision not configured' };
  }

  try {
    // Use Vision to detect text and check for receipt indicators
    const [result] = await client.documentTextDetection({
      image: { content: imageBuffer },
    });

    const text = result.fullTextAnnotation?.text || '';

    if (text.length < 50) {
      return {
        isReceipt: false,
        confidence: 0.9,
        reason: 'Insufficient text detected',
      };
    }

    // Check for receipt indicators
    const receiptKeywords = [
      /račun/i,
      /\b\d{11}\b/, // OIB
      /JIR/i,
      /ZKI/i,
      /ukupno/i,
      /total/i,
      /iznos/i,
    ];

    let keywordMatches = 0;
    for (const keyword of receiptKeywords) {
      if (keyword.test(text)) {
        keywordMatches++;
      }
    }

    if (keywordMatches >= 2) {
      return {
        isReceipt: true,
        confidence: 0.85,
        reason: `Found ${keywordMatches} receipt indicators`,
      };
    }

    return {
      isReceipt: false,
      confidence: 0.7,
      reason: 'Missing receipt indicators',
    };
  } catch (error) {
    console.error('Error validating receipt image:', error);
    return {
      isReceipt: false,
      confidence: 0,
      reason: 'Validation error',
    };
  }
};

module.exports = {
  extractTextWithVision,
  extractReceiptWithVision,
  validateReceiptImage,
  getVisionClient,
};
