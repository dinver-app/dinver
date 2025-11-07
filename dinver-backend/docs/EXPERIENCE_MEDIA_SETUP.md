# Experience Media Processing - Professional Setup Guide

## 🎯 Overview

Professional TikTok/Instagram-style media processing with:

**Images:**
- 3 optimized variants (405x720, 1080x1920, 1440x2560)
- 9:16 aspect ratio (vertical social media)
- mozjpeg compression
- Fast feed loading

**Videos:**
- AWS MediaConvert transcoding
- HLS adaptive streaming (240p → 1080p)
- MP4 progressive download (480p, 720p)
- Multiple thumbnails
- Professional quality

---

## 💰 Cost Breakdown

### AWS MediaConvert Pricing

**Base Pricing (eu-central-1 region):**
- SD (480p): ~$0.012 per minute
- HD (720p, 1080p): ~$0.024 per minute

**Example Costs:**

| Scenario | Video Length | Cost per Video | 1000 Videos/Month |
|----------|-------------|----------------|-------------------|
| 15-second clips | 15s = 0.25 min | $0.006 | **$6/month** |
| 30-second clips | 30s = 0.5 min | $0.012 | **$12/month** |
| 60-second clips | 60s = 1 min | $0.024 | **$24/month** |

**Realistic Estimate:**
- Average 30-second videos
- 100-500 uploads per month
- **Cost: $1.20 - $6/month**

### S3 Storage Costs

**Video Storage:**
- Original video: ~10-50MB (average 30MB)
- Processed outputs: ~30-100MB total (all formats)
- Per video: ~60MB total

| Videos | Storage | Monthly Cost |
|--------|---------|--------------|
| 1,000 | 60GB | **$1.38** |
| 5,000 | 300GB | **$6.90** |
| 10,000 | 600GB | **$13.80** |

**Image Storage:**
- Original: ~5-10MB
- 3 variants: ~2-3MB total
- Per image: ~12MB total

| Images | Storage | Monthly Cost |
|--------|---------|--------------|
| 10,000 | 120GB | **$2.76** |
| 50,000 | 600GB | **$13.80** |

### CloudFront CDN (Data Transfer)

**Pricing:**
- First 10TB: $0.085 per GB
- 10-50TB: $0.080 per GB

**Realistic Estimate:**
- Average user watches 50 videos/day (30s each)
- Average video served: ~5MB (adaptive streaming)
- 10,000 active users: ~2.5TB/month = **$212/month**

**BUT:** Most traffic will be images (thumbnails in feed):
- Thumbnail: ~50KB per load
- 10,000 users × 100 loads/day = 50GB/day = 1.5TB/month
- Cost: **~$127/month**

### Total Monthly Cost Estimates

| Scale | Videos/Month | Active Users | Total Cost |
|-------|--------------|--------------|------------|
| **Small** | 100 | 1,000 | **$20-30** |
| **Medium** | 500 | 5,000 | **$80-120** |
| **Large** | 2,000 | 10,000 | **$250-350** |

**Note:** These are worst-case estimates. Actual costs often 30-50% lower due to caching and compression.

---

## 🔧 AWS Setup - Step by Step

### 1. Create IAM Role for MediaConvert

MediaConvert needs permissions to read/write from your S3 bucket.

**Create role via AWS Console:**

1. Go to **IAM → Roles → Create Role**
2. Select **AWS Service** → **MediaConvert**
3. Name: `DinverMediaConvertRole`
4. Attach policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::dinver-restaurant-thumbnails",
        "arn:aws:s3:::dinver-restaurant-thumbnails/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "mediaconvert:*"
      ],
      "Resource": "*"
    }
  ]
}
```

5. Copy the **Role ARN** (looks like: `arn:aws:iam::123456789:role/DinverMediaConvertRole`)

**OR via AWS CLI:**

```bash
# Create role
aws iam create-role \
  --role-name DinverMediaConvertRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "mediaconvert.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach S3 policy
aws iam put-role-policy \
  --role-name DinverMediaConvertRole \
  --policy-name MediaConvertS3Access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["s3:*"],
      "Resource": [
        "arn:aws:s3:::dinver-restaurant-thumbnails",
        "arn:aws:s3:::dinver-restaurant-thumbnails/*"
      ]
    }]
  }'
```

### 2. Update `.env` File

Add the MediaConvert role ARN to your backend `.env`:

```bash
# AWS Configuration (existing)
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET_NAME=dinver-restaurant-thumbnails
AWS_CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net

# NEW: MediaConvert Role
AWS_MEDIACONVERT_ROLE=arn:aws:iam::YOUR_ACCOUNT_ID:role/DinverMediaConvertRole
```

**How to get your Role ARN:**

```bash
aws iam get-role --role-name DinverMediaConvertRole --query 'Role.Arn' --output text
```

### 3. Verify MediaConvert Access

Test that your AWS credentials can access MediaConvert:

```bash
# List MediaConvert endpoints
aws mediaconvert describe-endpoints --region eu-central-1
```

Should return something like:
```json
{
  "Endpoints": [{
    "Url": "https://abc12345.mediaconvert.eu-central-1.amazonaws.com"
  }]
}
```

### 4. Update S3 Bucket CORS (if needed)

If you're uploading directly from browser:

```bash
aws s3api put-bucket-cors \
  --bucket dinver-restaurant-thumbnails \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["PUT", "POST", "GET"],
      "AllowedOrigins": ["https://yourdomain.com", "http://localhost:3000"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }]
  }'
```

### 5. Install New Dependencies

```bash
cd dinver-backend
npm install @aws-sdk/client-mediaconvert
```

(Sharp is already installed from previous image processing work)

---

## 🚀 Testing the Setup

### Test 1: Check MediaConvert Connection

```bash
cd dinver-backend
node -e "
const { initializeMediaConvert } = require('./services/awsMediaConvertService');
initializeMediaConvert()
  .then(client => console.log('✅ MediaConvert connected!', client.config.endpoint))
  .catch(err => console.error('❌ Error:', err));
"
```

### Test 2: Upload and Process Test Image

```bash
# Upload a test image via your API
curl -X POST http://localhost:3000/api/app/experiences/media/presign \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "IMAGE",
    "mimeType": "image/jpeg",
    "bytes": 2048000
  }'

# Then upload the file to the returned presigned URL
# Then confirm:
curl -X POST http://localhost:3000/api/app/experiences/media/confirm \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "storageKey": "experiences/2024-11/user-id/image/abc123.jpg",
    "kind": "IMAGE"
  }'
```

### Test 3: Check Processed Outputs

After a few seconds, check S3:

```bash
aws s3 ls s3://dinver-restaurant-thumbnails/experiences/processed/ --recursive
```

You should see:
- `{experienceId}/{filename}-thumb.jpg` (405x720)
- `{experienceId}/{filename}-medium.jpg` (1080x1920)
- `{experienceId}/{filename}-large.jpg` (1440x2560)

### Test 4: Process Test Video

```bash
# Same as above but with VIDEO kind
# Video processing takes 3-10 minutes depending on length
```

Check MediaConvert jobs:

```bash
aws mediaconvert list-jobs --region eu-central-1 --max-results 5
```

---

## 📊 Monitoring & Analytics

### CloudWatch Metrics

MediaConvert automatically publishes metrics to CloudWatch:

1. Go to **CloudWatch → Metrics → MediaConvert**
2. Monitor:
   - Jobs submitted
   - Jobs completed
   - Jobs errored
   - Average job duration

### Cost Monitoring

**Set up billing alerts:**

1. Go to **Billing → Budgets**
2. Create budget: "$50/month" with 80% alert
3. Get email when approaching limit

**Check current costs:**

```bash
# MediaConvert costs
aws ce get-cost-and-usage \
  --time-period Start=2024-11-01,End=2024-11-30 \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --filter '{
    "Dimensions": {
      "Key": "SERVICE",
      "Values": ["AWS Elemental MediaConvert"]
    }
  }'
```

---

## 🔄 Migration Plan for Existing Videos

If you have existing Experience videos that were uploaded with the old system:

### Option A: Reprocess on Demand

Process videos when users view them:

```javascript
// In getExperience controller
if (experience.mediaKind === 'VIDEO' && !experience.videoFormats.hls) {
  // Trigger reprocessing
  await processVideo(experience.storageKey, experience.id);
}
```

### Option B: Batch Migration Script

Create and run migration script:

```bash
node scripts/migrateExperienceVideos.js --dry-run
node scripts/migrateExperienceVideos.js --limit=10
node scripts/migrateExperienceVideos.js
```

---

## 🐛 Troubleshooting

### Error: "MediaConvert endpoint not found"

**Solution:** Initialize MediaConvert client first:

```javascript
const client = await initializeMediaConvert();
```

### Error: "Access Denied" when creating job

**Solution:** Check IAM role has correct permissions:

```bash
aws iam get-role-policy \
  --role-name DinverMediaConvertRole \
  --policy-name MediaConvertS3Access
```

### Video Processing Stuck at "SUBMITTED"

**Reasons:**
1. Input file doesn't exist in S3
2. Invalid video format
3. File corrupted

**Check job details:**

```bash
aws mediaconvert get-job --id YOUR_JOB_ID --region eu-central-1
```

### High Costs

**Optimizations:**
1. Reduce output qualities (disable 1080p if not needed)
2. Implement smart transcoding (only transcode if video > 720p)
3. Cache CloudFront aggressively
4. Compress images more (reduce quality from 85 to 75)

---

## 📱 Frontend Integration

The frontend will receive:

```typescript
{
  "id": "exp123",
  "mediaKind": "VIDEO",
  "coverMedia": {
    "cdnUrl": "https://cdn.../video-thumb.jpg",
    "thumbnails": [
      {"w": 405, "h": 720, "cdnUrl": "..."}
    ],
    "videoFormats": {
      "hls": "https://cdn.../master.m3u8",
      "mp4_480p": "https://cdn.../video_480p.mp4",
      "mp4_720p": "https://cdn.../video_720p.mp4"
    },
    "transcodingStatus": "DONE"
  }
}
```

**Use HLS for best experience:**

```javascript
// React Native
import Video from 'react-native-video';

<Video
  source={{ uri: experience.coverMedia.videoFormats.hls }}
  style={styles.video}
  resizeMode="cover"
  repeat={true}
/>

// Web (using hls.js)
import Hls from 'hls.js';

if (Hls.isSupported()) {
  const hls = new Hls();
  hls.loadSource(experience.coverMedia.videoFormats.hls);
  hls.attachMedia(video);
}
```

---

## ✅ Checklist

Before going to production:

- [ ] IAM Role created with correct permissions
- [ ] `AWS_MEDIACONVERT_ROLE` added to `.env`
- [ ] Dependencies installed (`@aws-sdk/client-mediaconvert`)
- [ ] Test image processing works
- [ ] Test video processing works
- [ ] CloudWatch alerts set up
- [ ] Billing budget configured
- [ ] Frontend updated to use HLS
- [ ] Existing videos migration plan decided

---

## 🎉 Summary

You now have a professional-grade media processing system:

✅ **Fast Image Loading** - 405x720 thumbnails in feed
✅ **High Quality Display** - 1080x1920 full screen viewing
✅ **Professional Video** - HLS adaptive streaming
✅ **Cost Effective** - ~$20-50/month for small-medium apps
✅ **Scalable** - AWS handles all the heavy lifting

**Next Steps:**
1. Add environment variables
2. Test with sample uploads
3. Monitor costs for first month
4. Optimize based on usage patterns

Questions? Check the code comments or AWS MediaConvert documentation.

Good luck! 🚀
