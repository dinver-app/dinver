# ⚡ Experience Media - Quick Start Guide

## 🎉 Što je gotovo?

✅ **Profesionalni AWS MediaConvert** - video transcoding kao TikTok/Instagram
✅ **3 optimized image varijante** - 405x720, 1080x1920, 1440x2560 (9:16 aspect)
✅ **Increased file limits** - 100MB images, 200MB videos, 60s duration
✅ **HLS adaptive streaming** - 240p → 1080p auto-scale
✅ **MP4 progressive** - 480p, 720p download
✅ **Multiple thumbnails** - 5 thumbnails per video
✅ **Controller updated** - sync image, async video processing

---

## 🚀 Što trebaš napraviti (5 koraka)

### 1. Install Dependencies (30 sekundi)

```bash
cd dinver-backend
npm install @aws-sdk/client-mediaconvert
```

### 2. Create IAM Role (2 minute)

**Via AWS Console:**
1. Go to: https://console.aws.amazon.com/iam/
2. Roles → Create Role
3. Service: **MediaConvert**
4. Name: `DinverMediaConvertRole`
5. Attach policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:*"],
      "Resource": [
        "arn:aws:s3:::dinver-restaurant-thumbnails",
        "arn:aws:s3:::dinver-restaurant-thumbnails/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["mediaconvert:*"],
      "Resource": "*"
    }
  ]
}
```

6. Copy **Role ARN** (looks like: `arn:aws:iam::123456789:role/DinverMediaConvertRole`)

**OR via CLI (brže):**

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

# Attach policy
aws iam put-role-policy \
  --role-name DinverMediaConvertRole \
  --policy-name MediaConvertS3Access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["s3:*", "mediaconvert:*"],
      "Resource": "*"
    }]
  }'

# Get ARN
aws iam get-role --role-name DinverMediaConvertRole --query 'Role.Arn' --output text
```

### 3. Update `.env` (30 sekundi)

Add to your `.env` file:

```bash
# AWS MediaConvert Role (NEW!)
AWS_MEDIACONVERT_ROLE=arn:aws:iam::YOUR_ACCOUNT_ID:role/DinverMediaConvertRole
```

### 4. Test Connection (30 sekundi)

```bash
cd dinver-backend
node -e "
const { initializeMediaConvert } = require('./services/awsMediaConvertService');
initializeMediaConvert()
  .then(client => console.log('✅ MediaConvert OK!'))
  .catch(err => console.error('❌ Error:', err.message));
"
```

Should see: `✅ MediaConvert OK!`

### 5. Test Image Upload (optional, 1 minuta)

```bash
# Start server
npm start

# Test image upload (replace YOUR_TOKEN)
curl -X POST http://localhost:3000/api/app/experiences/media/presign \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "IMAGE",
    "mimeType": "image/jpeg",
    "bytes": 2048000
  }'

# Upload your image to the returned presignedURL

# Then confirm (this will process the image)
curl -X POST http://localhost:3000/api/app/experiences/media/confirm \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "storageKey": "experiences/2024-11/user-id/image/abc123.jpg",
    "kind": "IMAGE"
  }'
```

Response should include 3 variants (thumbnail, medium, large).

---

## 💰 Koliko košta?

### Realistic Estimates

| Users/Month | Videos Uploaded | Monthly Cost |
|-------------|-----------------|--------------|
| **100-500** | 50-200 | **$10-20** |
| **1,000-5,000** | 200-1,000 | **$30-80** |
| **10,000+** | 1,000-5,000 | **$150-300** |

**Breakdown:**
- MediaConvert: ~$0.012 per 30s video = $6-12/month za 500-1000 videos
- S3 Storage: ~$1-5/month za 1000-5000 videos
- CloudFront CDN: ~$20-80/month (depends on views)

**First month FREE** (AWS Free Tier includes MediaConvert testing)

### Cost Monitoring

Set up billing alert:
1. AWS Console → Billing → Budgets
2. Create: "$50/month" with 80% alert
3. Get email when approaching limit

---

## 📱 API Changes

### Image Upload

**Request:**
```javascript
POST /api/app/experiences/media/confirm
{
  "storageKey": "experiences/.../image.jpg",
  "kind": "IMAGE"
}
```

**Response:**
```javascript
{
  "message": "Image processed successfully",
  "data": {
    "storageKey": "...",
    "kind": "IMAGE",
    "variants": {
      "thumbnail": "https://cdn.../image-thumb.jpg",  // 405x720
      "medium": "https://cdn.../image-medium.jpg",    // 1080x1920
      "large": "https://cdn.../image-large.jpg"       // 1440x2560
    },
    "thumbnails": [
      {"w": 405, "h": 720, "cdnUrl": "..."},
      {"w": 1080, "h": 1920, "cdnUrl": "..."},
      {"w": 1440, "h": 2560, "cdnUrl": "..."}
    ],
    "width": 3024,
    "height": 4032,
    "processing": false
  }
}
```

### Video Upload

**Request:**
```javascript
POST /api/app/experiences/media/confirm
{
  "storageKey": "experiences/.../video.mp4",
  "kind": "VIDEO"
}
```

**Response (immediate):**
```javascript
{
  "message": "Video processing started. Check status with jobId.",
  "data": {
    "storageKey": "...",
    "kind": "VIDEO",
    "jobId": "1234567890-abcdef",
    "jobStatus": "SUBMITTED",
    "processing": true,
    "estimatedTime": "3-10 minutes"
  }
}
```

**Check Status:**
```javascript
GET /api/app/experiences/media/video-status/:jobId
```

**Response (when complete):**
```javascript
{
  "message": "Video processing status",
  "data": {
    "jobId": "...",
    "status": "COMPLETE",
    "percentComplete": 100,
    "outputs": {
      "hls": {
        "masterPlaylist": "https://cdn.../master.m3u8",
        "variants": {
          "240p": "https://cdn.../240p.m3u8",
          "480p": "https://cdn.../480p.m3u8",
          "720p": "https://cdn.../720p.m3u8",
          "1080p": "https://cdn.../1080p.m3u8"
        }
      },
      "mp4": {
        "480p": "https://cdn.../video_480p.mp4",
        "720p": "https://cdn.../video_720p.mp4"
      },
      "thumbnails": [
        "https://cdn.../thumb_1.jpg",
        "https://cdn.../thumb_2.jpg",
        ...
      ]
    },
    "videoFormats": {
      "hls": "https://cdn.../master.m3u8",
      "mp4_480p": "https://cdn.../video_480p.mp4",
      "mp4_720p": "https://cdn.../video_720p.mp4"
    },
    "thumbnails": [
      {"w": 405, "h": 720, "cdnUrl": "...", "timestamp": 0},
      {"w": 405, "h": 720, "cdnUrl": "...", "timestamp": 5},
      ...
    ]
  }
}
```

---

## 🐛 Troubleshooting

### Error: "MediaConvert endpoint not found"
**Fix:** Check AWS credentials in `.env`

### Error: "Access Denied"
**Fix:** IAM role doesn't have S3 permissions. Check role policy.

### Image processing slow
**Normal:** Images process in 1-3 seconds (3 variants)

### Video stuck at "SUBMITTED"
**Check:**
1. File exists in S3: `aws s3 ls s3://bucket/path/to/video.mp4`
2. Job details: `aws mediaconvert get-job --id JOB_ID`
3. Role ARN correct in `.env`

### High costs
**Optimize:**
1. Disable 1080p (edit awsMediaConvertService.js, remove 1080p output)
2. Use 75% quality instead of 85% (edit experienceImageProcessor.js)
3. Set CloudFront cache to 7 days

---

## 📚 Full Documentation

For detailed info, see:
- [EXPERIENCE_MEDIA_SETUP.md](./EXPERIENCE_MEDIA_SETUP.md) - Complete setup guide
- [IMAGE_PROCESSING_GUIDE.md](./IMAGE_PROCESSING_GUIDE.md) - Image system guide

---

## ✅ Checklist

Quick checklist before production:

- [ ] `@aws-sdk/client-mediaconvert` installed
- [ ] IAM Role created
- [ ] `AWS_MEDIACONVERT_ROLE` in `.env`
- [ ] Test connection works
- [ ] Billing alert set ($50/month)
- [ ] Test image upload
- [ ] Test video upload
- [ ] Frontend updated (use HLS player)

---

## 🎉 Done!

System je spreman. Upload se moze koristiti odmah!

**Image uploads:** Instant (1-3s)
**Video uploads:** 3-10 min processing (user gets notification when done)

Questions? Check full docs or ping me!

Good luck! 🚀
