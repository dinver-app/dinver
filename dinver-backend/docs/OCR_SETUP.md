# Quick Setup Guide - Enhanced OCR System

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Google Cloud account (for Vision API)
- OpenAI API key
- AWS account (for S3)

## Installation Steps

### 1. Install Dependencies

```bash
cd dinver-backend
npm install
```

**New packages added:**
- `@google-cloud/vision` - Google Cloud Vision API client
- `image-hash` - Perceptual hashing for duplicate detection

### 2. Database Migration

Run the migration to add new columns to the `Receipts` table:

```bash
npx sequelize-cli db:migrate
```

**Migration file:** `migrations/20251103195514-enhance-receipts-ocr-system.js`

This adds:
- OCR metadata fields (merchantName, rawOcrText, confidences, etc.)
- Fraud detection fields (fraudFlags, perceptualHash)
- Location fields (gpsAccuracy)
- Device info field

### 3. Google Cloud Vision Setup

#### Option A: Service Account (Recommended for Production)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the **Cloud Vision API**:
   - Navigation menu → APIs & Services → Library
   - Search for "Cloud Vision API"
   - Click "Enable"

4. Create a service account:
   - Navigation menu → IAM & Admin → Service Accounts
   - Click "Create Service Account"
   - Name: `dinver-ocr-service`
   - Grant role: `Cloud Vision API User`
   - Click "Create Key" → JSON
   - Download the JSON file

5. Set environment variable:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your-credentials.json"
   ```

   Or add to `.env` file:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-credentials.json
   ```

#### Option B: Application Default Credentials (Development)

```bash
gcloud auth application-default login
export GOOGLE_CLOUD_PROJECT="your-project-id"
```

### 4. OpenAI Setup

Already configured in your app. Ensure you have:

```bash
OPENAI_API_KEY=sk-...
```

The system uses GPT-4o for:
- Fallback OCR when Vision fails
- Normalizing uncertain fields

### 5. AWS S3 Setup

Already configured. Ensure these are set:

```bash
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=eu-central-1
AWS_S3_BUCKET=dinver-receipts
```

### 6. Test the System

#### Test Vision API

```bash
node -e "
const { getVisionClient } = require('./src/services/visionOcrService');
const client = getVisionClient();
if (client) {
  console.log('✓ Vision API configured successfully');
} else {
  console.log('✗ Vision API not configured');
}
"
```

#### Test Receipt Upload

```bash
# Start server
npm run dev

# Upload test receipt (replace TOKEN and path)
curl -X POST http://localhost:3000/app/receipts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-api-key: YOUR_API_KEY" \
  -F "image=@test-receipt.jpg" \
  -F "locationLat=45.8150" \
  -F "locationLng=15.9819" \
  -F "declaredTotal=42.50"
```

Expected response:
```json
{
  "message": "Račun poslan na provjeru...",
  "receiptId": "uuid",
  "autoApproveScore": 0.75,
  "extractedData": {
    "oib": "12345678901",
    "totalAmount": 42.50,
    "issueDate": "2025-11-03",
    "merchantName": "..."
  }
}
```

## Environment Variables Checklist

Create or update your `.env` file:

```bash
# Required - Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dinver

# Required - AWS S3
AWS_ACCESS_KEY_ID=AKIAXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxx
AWS_REGION=eu-central-1
AWS_S3_BUCKET=dinver-receipts

# Required - OpenAI (GPT fallback)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx

# Required - Google Vision
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
# OR
GOOGLE_CLOUD_PROJECT=your-project-id

# Optional - CloudFront CDN
CLOUDFRONT_DOMAIN=cdn.dinver.com
CLOUDFRONT_KEY_PAIR_ID=APKAXXXXXXXX
CLOUDFRONT_PRIVATE_KEY_PATH=/path/to/private-key.pem
```

## Verification

After setup, check the logs when uploading a receipt:

```
Attempting OCR with Google Vision...
Vision OCR extracted 437 characters with confidence 0.92
Vision OCR successful. Parser confidence: 0.85
Auto-approve score: 0.87, Decision: auto_approved
Decision reasons: [
  'Valid OIB found in database',
  'Receipt from 0 day(s) ago',
  'Declared amount matches extracted amount',
  ...
]
```

## Troubleshooting

### "Vision API not configured"

**Issue:** Google Cloud credentials not found

**Fix:**
```bash
# Verify credentials file exists
ls -la $GOOGLE_APPLICATION_CREDENTIALS

# Or set project ID
export GOOGLE_CLOUD_PROJECT="your-project-id"
```

### "PERMISSION_DENIED"

**Issue:** Service account lacks permissions

**Fix:**
1. Go to IAM & Admin → IAM
2. Find your service account
3. Add role: "Cloud Vision API User"

### "All OCR methods failed"

**Issue:** Both Vision and GPT failed

**Check:**
1. Image quality (min 100KB, readable text)
2. Network connectivity
3. API quotas (Vision: 1800 requests/min by default)
4. API keys validity

### Low Auto-Approve Scores

**Issue:** Valid receipts stuck in pending

**Adjust thresholds in:**
- `src/services/decisionEngine.js` - Line ~120 (threshold currently 0.8)
- `src/utils/antifraudUtils.js` - Fraud flag rules

## Cost Optimization

### Google Vision

- **Free tier:** 1,000 requests/month
- **After free tier:** $1.50 per 1,000 requests
- **Estimated cost:** $45-75/month for 50,000 receipts

**Optimization tips:**
1. Enable image compression (already implemented)
2. Use Vision only, avoid GPT fallback when possible
3. Monitor parser confidence - improve regex to reduce GPT calls

### OpenAI GPT-4o

- **Cost:** ~$5 per 1M input tokens, ~$15 per 1M output tokens
- **Average use:** ~500 tokens per receipt (only when Vision < 0.6 confidence)
- **Estimated cost:** $5-10/month for 10,000 low-confidence receipts

**Optimization tips:**
1. Increase parser confidence to reduce GPT calls
2. Use shorter prompts
3. Cache common merchant names

## Next Steps

1. **Monitor Metrics:**
   - Check logs for OCR success rates
   - Track auto-approve percentages
   - Review fraud flag frequencies

2. **Tune Decision Engine:**
   - Adjust thresholds based on false positive/negative rates
   - Add more fraud patterns as needed
   - Improve merchant name matching

3. **Admin UI Updates:**
   - Display auto-approve scores
   - Show fraud flags
   - Add OCR confidence indicators
   - Implement review queue sorting

4. **Mobile App Updates:**
   - Add optional `declaredTotal` field
   - Send `gpsAccuracy` from device
   - Include `deviceInfo` for fraud detection

## Support

Questions or issues?
- Technical docs: `docs/OCR_SYSTEM.md`
- Code reference: `src/controllers/receiptController.js`
- Parser logic: `src/utils/receiptParser.js`
- Decision rules: `src/services/decisionEngine.js`
