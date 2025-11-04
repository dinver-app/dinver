# OCR System - Quick Reference Card

## 🚀 Quick Start

```bash
# 1. Install
npm install

# 2. Migrate
npx sequelize-cli db:migrate

# 3. Set credentials
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/credentials.json"
export OPENAI_API_KEY="sk-..."

# 4. Test
npm run dev
```

## 📁 File Locations

| Component | File |
|-----------|------|
| **Upload Handler** | `src/controllers/receiptController.js` (line 41) |
| **Vision OCR** | `src/services/visionOcrService.js` |
| **Parser** | `src/utils/receiptParser.js` |
| **GPT Normalizer** | `src/services/gptNormalizerService.js` |
| **Decision Engine** | `src/services/decisionEngine.js` |
| **Antifraud** | `src/utils/antifraudUtils.js` |
| **Migration** | `migrations/20251103195514-enhance-receipts-ocr-system.js` |
| **Model** | `models/receipt.js` |

## 🔄 OCR Flow

```
Image → Vision API → Parser → (GPT if conf < 0.6)
            ↓
      Geofence + Fraud Check
            ↓
      Decision Engine
            ↓
   Auto-approve / Pending / Reject
```

## 🎯 Auto-Approve Scoring

| Factor | Points | Criteria |
|--------|--------|----------|
| OIB | 0.30 | Valid + in DB |
| Date | 0.20 | ≤2 days old |
| Amount | 0.20 | Declared = extracted |
| Merchant | 0.10 | Name match |
| Location | 0.10 | Within 150m |
| OCR | 0.10 | Avg confidence |
| **Fraud** | **-0.30** | Penalty |

**Thresholds:**
- ≥0.8 → Auto-approve ✅
- 0.5-0.8 → Pending 🔄
- <0.5 → Reject ❌

## 🔧 Configuration

### `.env` Required
```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/creds.json
OPENAI_API_KEY=sk-...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=dinver-receipts
```

### Adjust Thresholds
**File:** `src/services/decisionEngine.js`
```javascript
// Line ~120
if (score >= 0.8) {
  decision = 'auto_approved';  // Change this threshold
}
```

## 🛡️ Fraud Flags

1. `round_total` - Round amounts ≥100€
2. `old_receipt` - >7 days old
3. `future_date` - Date in future
4. `unusual_hours` - Before 6AM or after 11PM
5. `invalid_oib` - Bad checksum
6. `location_mismatch` - >500m from restaurant

**Toggle in:** `src/utils/antifraudUtils.js` (line 145)

## 📊 Fields Extracted

| Field | Type | Validation |
|-------|------|------------|
| OIB | 11 digits | Mod 11,10 checksum |
| JIR | 32 hex | Pattern match |
| ZKI | 32 hex | Pattern match |
| Date | YYYY-MM-DD | Valid date |
| Time | HH:MM | 00:00-23:59 |
| Total | Decimal | >0 |
| Merchant | String | Top lines |
| Address | String | Pattern match |

## 📷 Supported Image Formats

**Accepted:** JPG, JPEG, PNG, WEBP, HEIC, HEIF
**Max Size:** 10MB
**Rejected:** GIF, BMP, TIFF, SVG, and other formats

**Error Messages:**
- `"Nepodržan format slike..."` - Wrong format
- `"Slika je prevelika..."` - File > 10MB
- `"Slika se ne može obraditi..."` - Corrupted file

## 🧪 Testing Commands

```bash
# Test Vision API
node -e "const {getVisionClient} = require('./src/services/visionOcrService'); console.log(getVisionClient() ? '✓ OK' : '✗ FAIL');"

# Test OIB validation
node -e "const {validateOIBChecksum} = require('./src/utils/antifraudUtils'); console.log(validateOIBChecksum('12345678901'));"

# Upload test receipt (JPG)
curl -X POST http://localhost:3000/app/receipts \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-api-key: $API_KEY" \
  -F "image=@receipt.jpg" \
  -F "declaredTotal=42.50"

# Test invalid format (should fail)
curl -X POST http://localhost:3000/app/receipts \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-api-key: $API_KEY" \
  -F "image=@document.pdf"
```

## 🐛 Common Issues

| Error | Cause | Fix |
|-------|-------|-----|
| "Vision not configured" | Missing credentials | Set `GOOGLE_APPLICATION_CREDENTIALS` |
| "PERMISSION_DENIED" | IAM role missing | Add "Cloud Vision API User" role |
| "All OCR methods failed" | Network/quota issue | Check API quotas & connectivity |
| Low auto-approve rate | Thresholds too high | Adjust in `decisionEngine.js` |

## 💰 Costs

| Service | Unit | Cost |
|---------|------|------|
| Vision | 1,000 images | $1.50 |
| GPT-4o | 1M tokens | $5 (input), $15 (output) |
| **Total** | 1,000 receipts | **~$2-3** |

**Free tier:** Vision API - 1,000 requests/month

## 📈 Monitoring

```bash
# Watch logs
tail -f logs/app.log | grep "Auto-approve score"

# Check success rate
grep "Vision OCR successful" logs/app.log | wc -l
grep "Vision OCR failed" logs/app.log | wc -l

# View fraud flags
grep "Fraud flags:" logs/app.log
```

## 🔍 Debug Receipt

```javascript
// Get receipt details
GET /sysadmin/receipts/:id

// Response includes:
{
  ocr: {
    method: "vision",
    visionConfidence: 0.92,
    parserConfidence: 0.85,
    rawText: "..."
  },
  autoApprove: {
    score: 0.87,
    fraudFlags: []
  },
  extracted: {...}
}
```

## 🎨 Admin UI TODO

- [ ] Show auto-approve score with color coding
- [ ] Display fraud flags with icons
- [ ] Add confidence bars for each field
- [ ] Sort queue by score (lowest first)
- [ ] Quick edit for low-confidence fields
- [ ] Bulk approve/reject actions

## 🚨 Alerts Setup

Monitor these metrics:
- Vision API error rate >5%
- Auto-approve rate <50%
- Fraud flag rate >10%
- Average score <0.7
- GPT fallback rate >20%

## 📞 Support

| Issue Type | Reference |
|------------|-----------|
| Setup | `docs/OCR_SETUP.md` |
| Architecture | `docs/OCR_SYSTEM.md` |
| Code | `IMPLEMENTATION_SUMMARY.md` |
| Logs | `src/controllers/receiptController.js` |

## 🔄 Update Checklist

When tuning the system:
- [ ] Test with 10-20 real receipts
- [ ] Check auto-approve rate
- [ ] Review false positives/negatives
- [ ] Adjust thresholds if needed
- [ ] Update fraud patterns
- [ ] Monitor for 24h
- [ ] Document changes

## 🎯 Performance Targets

| Metric | Target |
|--------|--------|
| Vision success | >95% |
| Parser confidence | >0.80 |
| Auto-approve | >60% |
| False positive | <2% |
| False negative | <5% |
| Latency | <2s |

---

**Version:** 1.0
**Last Updated:** 2025-11-03
**Authors:** Dinver Engineering Team
