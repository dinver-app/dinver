# Enhanced Receipt OCR System

## Overview

The Dinver receipt OCR system uses a multi-layered approach to extract data from Croatian fiscal receipts with high accuracy and automated validation.

## Architecture

```
Mobile App → API → Receipt Controller
                       ↓
         Image Processing & Duplicate Detection
                       ↓
         ┌─────────────┴─────────────┐
         │                           │
    Google Vision              GPT-4o Vision
    (Primary OCR)             (Fallback OCR)
         │                           │
         └─────────────┬─────────────┘
                       ↓
              Parser (Regex + Rules)
                       ↓
          GPT-4o Normalizer (if needed)
                       ↓
         ┌─────────────┴─────────────┐
         │                           │
    Fraud Detection          Decision Engine
         │                           │
         └─────────────┬─────────────┘
                       ↓
              Receipt Record Created
                       ↓
         ┌─────────────┴─────────────┐
         │                           │
    Auto-Approve            Pending Review
   (score ≥ 0.8)            (Admin UI)
```

## Components

### 1. Image Processing (`uploadReceipt`)

**Location:** [src/controllers/receiptController.js](../src/controllers/receiptController.js)

- **Compression:** Resizes images >1600px, JPEG quality 80%
- **MD5 Hash:** Exact duplicate detection
- **Perceptual Hash:** Near-duplicate detection (using image-hash library)
- **Upload:** Stores to S3 in `receipts/{userId}/` folder

### 2. Google Vision OCR (`visionOcrService.js`)

**Location:** [src/services/visionOcrService.js](../src/services/visionOcrService.js)

Uses Google Cloud Vision's `documentTextDetection` API to extract text from receipt images.

**Features:**
- Full text extraction with confidence scores
- Bounding box data for structured analysis
- Automatic language detection
- High accuracy for Croatian receipts

**Setup:**
```bash
# Install dependencies
npm install @google-cloud/vision

# Set credentials
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/credentials.json"
# OR
export GOOGLE_CLOUD_PROJECT="your-project-id"
```

**Output:**
```javascript
{
  text: "Full OCR text...",
  confidence: 0.92,
  blocks: [{ text: "...", confidence: 0.95 }]
}
```

### 3. Receipt Parser (`receiptParser.js`)

**Location:** [src/utils/receiptParser.js](../src/utils/receiptParser.js)

Extracts structured fields from raw OCR text using regex patterns and heuristics.

**Extracted Fields:**
- **OIB:** 11-digit business ID (validated with mod 11,10 checksum)
- **JIR:** 32-character hex code (Jedinstveni Identifikator Računa)
- **ZKI:** 32-character hex code (Završni Kontrolni Identifikator)
- **Date:** Croatian format (DD.MM.YYYY → YYYY-MM-DD)
- **Time:** HH:MM format
- **Total Amount:** Extracts from "UKUPNO" / "ZA PLATITI" keywords
- **Merchant Name:** First few lines or business entity indicators (d.o.o., obrt, etc.)
- **Merchant Address:** Address patterns with street numbers

**Confidence Scoring:**
Each field receives a confidence score (0-1) based on:
- Pattern match quality
- Validation rules (OIB checksum, date validity, etc.)
- Context (e.g., total amount near "UKUPNO" keyword)

### 4. GPT-4o Normalizer (`gptNormalizerService.js`)

**Location:** [src/services/gptNormalizerService.js](../src/services/gptNormalizerService.js)

Used as a fallback when:
- Google Vision fails
- Parser confidence < 0.6
- Critical fields are missing or ambiguous

**Methods:**
1. **normalizeWithGPT(rawText):** Normalizes OCR text to structured JSON
2. **extractWithGPTVision(imageBuffer):** Direct image-to-JSON extraction

**Prompt Engineering:**
- Strict JSON-only output (no markdown)
- Field-level validation rules
- Croatian receipt-specific instructions
- Temperature: 0.1 (deterministic output)

### 5. Decision Engine (`decisionEngine.js`)

**Location:** [src/services/decisionEngine.js](../src/services/decisionEngine.js)

Calculates an auto-approve score (0-1) based on multiple factors.

**Scoring Breakdown:**

| Factor | Max Points | Criteria |
|--------|------------|----------|
| OIB Validation | 0.30 | Valid checksum + exists in database |
| Date Validation | 0.20 | ≤2 days old, not in future |
| Amount Consistency | 0.20 | Declared vs. extracted match |
| Merchant Match | 0.10 | Fuzzy name match with restaurant |
| Location Proximity | 0.10 | Within 150m geofence |
| OCR Confidence | 0.10 | Average of Vision + Parser |
| **Penalty** | -0.30 | Fraud flags (max -0.3) |

**Thresholds:**
- **≥ 0.8:** Auto-approve
- **0.5 - 0.8:** Pending review (human validation)
- **< 0.5:** Reject

### 6. Antifraud Utilities (`antifraudUtils.js`)

**Location:** [src/utils/antifraudUtils.js](../src/utils/antifraudUtils.js)

**Features:**
- **Perceptual Hashing:** Detects similar images (Hamming distance ≤5)
- **Geofencing:** Haversine formula for GPS distance
- **OIB Checksum:** Croatian mod 11,10 validation
- **Fraud Pattern Detection:**
  - Round totals (≥100€ and %10 == 0)
  - Old receipts (>7 days)
  - Future dates
  - Unusual hours (before 6AM or after 11PM)
  - Invalid OIB
  - Location mismatch (>500m)

## Database Schema

### New Fields in `Receipts` Table

```sql
-- OCR Data
merchantName VARCHAR(255),
merchantAddress VARCHAR(255),
declaredTotal DECIMAL(10,2),
rawOcrText TEXT,
visionConfidence DECIMAL(3,2),
parserConfidence DECIMAL(3,2),
consistencyScore DECIMAL(3,2),
autoApproveScore DECIMAL(3,2),
ocrMethod ENUM('vision', 'gpt', 'vision+gpt', 'manual'),
fieldConfidences JSONB,

-- Fraud Detection
fraudFlags JSONB DEFAULT '[]',
perceptualHash VARCHAR(64),

-- Location
gpsAccuracy DECIMAL(10,2),

-- Device
deviceInfo JSONB
```

**Migration:**
```bash
npx sequelize-cli db:migrate
```

## API Endpoints

### Upload Receipt

**POST** `/v1/receipts`

**Request:**
```javascript
{
  // File (multipart) - REQUIRED
  image: File,  // Supported: JPG, PNG, WEBP, HEIC (max 10MB)

  // Optional
  locationLat: 45.8150,
  locationLng: 15.9819,
  gpsAccuracy: 10.5,
  declaredTotal: 42.50,
  restaurantId: "uuid",
  deviceInfo: {
    platform: "ios",
    model: "iPhone 14 Pro",
    osVersion: "17.0"
  }
}
```

**Supported Image Formats:**
- ✅ JPEG/JPG
- ✅ PNG
- ✅ WEBP
- ✅ HEIC/HEIF
- ❌ GIF, BMP, TIFF, SVG, PDF (rejected)

**Validation:**
- Max file size: 10MB
- Image must be processable by Sharp library
- Format validation at multer level + Sharp level

**Response (Success):**
```javascript
{
  message: "Račun poslan na provjeru. Bodovi će biti dodijeljeni u roku 24 sata.",
  receiptId: "uuid",
  autoApproveScore: 0.85,
  extractedData: {
    oib: "12345678901",
    totalAmount: 42.50,
    issueDate: "2025-11-03",
    merchantName: "Restoran Mimoza d.o.o."
  }
}
```

**Response (Error - Invalid Format):**
```javascript
{
  error: "Nepodržan format slike. Molimo koristite: JPG, PNG, WEBP ili HEIC. Vaš format: image/gif"
}
```

**Response (Error - File Too Large):**
```javascript
{
  error: "Slika je prevelika. Maksimalna veličina je 10MB."
}
```

**Response (Error - Corrupted Image):**
```javascript
{
  error: "Slika se ne može obraditi. Format: image/jpeg. Molimo koristite JPG, PNG, WEBP ili HEIC."
}
```

**Response (Error - Duplicate):**
```javascript
{
  error: "Ovaj račun je već poslan na provjeru (exact duplicate)"
}
```

### Get Receipt Details

**GET** `/v1/receipts/:id`

**Response:**
```javascript
{
  id: "uuid",
  userId: "uuid",
  status: "pending",

  // Image
  imageUrl: "https://cdn.dinver.com/...",
  imageMeta: {
    width: 1200,
    height: 1600,
    bytes: 245678,
    contentType: "image/jpeg"
  },

  // OCR Results
  ocr: {
    method: "vision",
    rawText: "Full extracted text...",
    visionConfidence: 0.92,
    parserConfidence: 0.85,
    consistencyScore: 0.88,
    fieldConfidences: {
      oib: 0.95,
      jir: 0.90,
      totalAmount: 0.92,
      ...
    }
  },

  // Auto-Approve
  autoApprove: {
    score: 0.85,
    fraudFlags: []
  },

  // Extracted Fields
  extracted: {
    oib: "12345678901",
    jir: "ABC123...",
    zki: "DEF456...",
    totalAmount: 42.50,
    issueDate: "2025-11-03",
    issueTime: "18:05",
    merchantName: "Restoran Mimoza d.o.o.",
    merchantAddress: "Ilica 123, Zagreb"
  },

  // User Data
  declared: {
    total: 42.50
  },

  // Location
  location: {
    lat: 45.8150,
    lng: 15.9819,
    accuracy: 10.5
  },

  // Restaurant Match
  restaurant: {
    id: "uuid",
    name: "Restoran Mimoza",
    oib: "12345678901"
  },

  // Reservation Bonus
  matchedReservations: [...],
  hasReservationBonus: false
}
```

## Configuration

### Environment Variables

```bash
# Google Cloud Vision (Required for Vision OCR)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
GOOGLE_CLOUD_PROJECT=your-project-id

# OpenAI (Required for GPT fallback)
OPENAI_API_KEY=sk-...

# AWS S3 (Required for image storage)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=eu-central-1
AWS_S3_BUCKET=dinver-receipts
```

### Google Cloud Vision Setup

1. Create a Google Cloud project
2. Enable the Vision API
3. Create a service account
4. Download credentials JSON
5. Set environment variable

### Cost Estimation

- **Google Vision:** ~$1.50 per 1,000 images (DOCUMENT_TEXT_DETECTION)
- **GPT-4o:** ~$0.10 per 1,000 tokens (only used when needed)
- **Total:** ~$2-3 per 1,000 receipts (depending on Vision success rate)

## Performance & Monitoring

### Metrics to Track

1. **OCR Success Rate**
   - Vision success: target >95%
   - Parser confidence: target >0.8
   - Auto-approve rate: target >60%

2. **Latency**
   - Vision API: ~300-800ms
   - Full processing: <2s end-to-end

3. **Quality**
   - False positive rate: <2%
   - False negative rate: <5%
   - Manual review rate: <30%

### Logging

```javascript
console.log('Attempting OCR with Google Vision...');
console.log('Vision OCR successful. Parser confidence: 0.85');
console.log('Auto-approve score: 0.87, Decision: auto_approved');
console.log('Decision reasons:', decision.reasons);
```

## Admin UI Considerations

### Receipt Review Queue

**Sort by:**
- Auto-approve score (lowest first)
- Fraud flags (flagged first)
- Submission date (oldest first)

**Display:**
- Thumbnail + full-size image
- Extracted fields with confidence bars
- Fraud flags and warnings
- Auto-approve score breakdown
- Quick actions (Approve / Reject / Edit)

**Keyboard Shortcuts:**
- `A`: Approve
- `R`: Reject
- `E`: Edit fields
- `→`: Next receipt

### Fraud Dashboard

- Daily/weekly fraud flag statistics
- Top rejection reasons
- User fraud score trends
- Duplicate submission patterns

## Testing

### Unit Tests

```bash
# Test parser
node -e "const { parseReceiptText } = require('./src/utils/receiptParser'); console.log(parseReceiptText('OIB: 12345678901\\nUKUPNO: 42,50 EUR'));"

# Test OIB validation
node -e "const { validateOIBChecksum } = require('./src/utils/antifraudUtils'); console.log(validateOIBChecksum('12345678901'));"
```

### Integration Tests

```bash
# Upload test receipt
curl -X POST http://localhost:3000/v1/receipts \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@test-receipt.jpg" \
  -F "locationLat=45.8150" \
  -F "locationLng=15.9819" \
  -F "declaredTotal=42.50"
```

## Troubleshooting

### Vision API Errors

**Error:** "Google Cloud Vision not configured"
**Solution:** Set `GOOGLE_APPLICATION_CREDENTIALS` env variable

**Error:** "PERMISSION_DENIED"
**Solution:** Enable Vision API in Google Cloud Console

### Low Parser Confidence

**Cause:** Poor image quality, non-Croatian text, damaged receipt
**Solution:**
- Client-side image quality check
- User instructions for better photos
- GPT normalization will activate automatically

### False Positives

**Cause:** High auto-approve score for invalid receipt
**Solution:**
- Review fraud flags configuration
- Adjust decision engine thresholds
- Add more validation rules

### False Negatives

**Cause:** Valid receipt rejected or pending
**Solution:**
- Check geofence tolerance (default 150m)
- Review merchant name fuzzy matching
- Adjust auto-approve threshold (default 0.8)

## Future Improvements

1. **Queue-based Processing:** Move OCR to background job (Pub/Sub, SQS)
2. **Batch Processing:** Process multiple receipts in parallel
3. **ML Model:** Train custom model on Croatian receipts
4. **Receipt Validation API:** Cross-check with Croatian tax authority
5. **User Feedback Loop:** Use approve/reject data to improve parser
6. **A/B Testing:** Test different OCR methods and thresholds
7. **Analytics Dashboard:** Real-time OCR performance metrics

## Support

For issues or questions:
- Technical: Check logs in [src/controllers/receiptController.js](../src/controllers/receiptController.js)
- Business: Review decision engine rules in [src/services/decisionEngine.js](../src/services/decisionEngine.js)
- Fraud: Check patterns in [src/utils/antifraudUtils.js](../src/utils/antifraudUtils.js)
