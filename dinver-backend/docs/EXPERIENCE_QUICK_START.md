# Dinver Experience - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Run Migration

```bash
cd /Users/ivankikic/Documents/Projects/Dinver/dinver-app/dinver-backend
npx sequelize-cli db:migrate
```

This creates all 8 Experience tables.

---

### Step 2: Register Routes

**Edit `src/app.js`** and add these routes:

```javascript
// Add with other app routes (around line where other routes are registered)
const experienceRoutes = require('./routes/appRoutes/experienceRoutes');
const userExperienceRoutes = require('./routes/appRoutes/userExperienceRoutes');

app.use('/api/app/experiences', experienceRoutes);
app.use('/api/app/users', userExperienceRoutes);
```

**Also add admin routes:**

```javascript
// Add with other admin routes
const experienceModerationRoutes = require('./routes/adminRoutes/experienceModerationRoutes');

app.use('/api/admin/experiences/moderation', experienceModerationRoutes);
```

---

### Step 3: Register Cron Jobs

**Edit `src/app.js`** or **`src/server.js`** and add:

```javascript
const cron = require('node-cron');
const experienceCron = require('./src/cron/experienceEngagementCron');

// Update engagement scores every 5 minutes (for trending feed)
cron.schedule('*/5 * * * *', experienceCron.updateEngagementScores);

// Update 24h metrics and check SLA every hour
cron.schedule('0 * * * *', async () => {
  await experienceCron.update24HourMetrics();
  await experienceCron.checkModerationSLA();
});

// Update quality metrics every 30 minutes
cron.schedule('*/30 * * * *', experienceCron.updateQualityMetrics);

// Cleanup old views daily at 3 AM
cron.schedule('0 3 * * *', experienceCron.cleanupOldViews);
```

---

### Step 4: Environment Variables

Add to `.env`:

```env
# Optional: CloudFront CDN domain
AWS_CLOUDFRONT_DOMAIN=your-cloudfront-domain.cloudfront.net
```

Verify these exist:
```env
AWS_REGION=your-region
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET_NAME=your-bucket
```

---

### Step 5: Install Missing Dependencies

```bash
npm install @aws-sdk/s3-request-presigner
```

(Other packages should already be installed: `fluent-ffmpeg`, `sharp`)

---

### Step 6: Restart Server

```bash
npm run dev
```

---

## ✅ Test It Works

### 1. Create an Experience (as User)

```bash
# Request upload URL
curl -X POST http://localhost:3000/api/app/experiences/media/presign \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "IMAGE",
    "mimeType": "image/jpeg",
    "bytes": 1024000
  }'

# Save the uploadUrl, storageKey from response

# Upload your image to the uploadUrl
curl -X PUT "UPLOAD_URL_FROM_ABOVE" \
  --upload-file /path/to/your/image.jpg \
  -H "Content-Type: image/jpeg"

# Confirm upload
curl -X POST http://localhost:3000/api/app/experiences/media/confirm \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "storageKey": "STORAGE_KEY_FROM_ABOVE",
    "kind": "IMAGE"
  }'

# Create experience
curl -X POST http://localhost:3000/api/app/experiences \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "SOME_RESTAURANT_UUID",
    "title": "Amazing Experience!",
    "description": "This restaurant was incredible!",
    "ratings": {
      "ambience": 5,
      "service": 4,
      "price": 3
    },
    "media": [
      {
        "storageKey": "STORAGE_KEY_FROM_ABOVE",
        "kind": "IMAGE",
        "orderIndex": 0
      }
    ]
  }'

# Save the experience ID from response
```

### 2. Approve the Experience (as Admin)

```bash
curl -X POST http://localhost:3000/api/admin/experiences/moderation/EXPERIENCE_ID/approve \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Looks good!"
  }'
```

### 3. Check Explore Feed

```bash
# Get trending experiences
curl http://localhost:3000/api/app/experiences/explore?sort=TRENDING

# Get new experiences in Zagreb
curl http://localhost:3000/api/app/experiences/explore?city=Zagreb&sort=NEW
```

### 4. Like an Experience

```bash
curl -X POST http://localhost:3000/api/app/experiences/EXPERIENCE_ID/like \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

### 5. Get My Map

```bash
curl http://localhost:3000/api/app/experiences/my-map \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

---

## 📊 Verify Everything Works

### Check Database

```sql
-- Check tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%xperience%';

-- Should show 8 tables:
-- Experiences
-- ExperienceMedia
-- ExperienceLikes
-- ExperienceSaves
-- ExperienceViews
-- ExperienceEngagements
-- ExperienceModerationQueues
-- ExperienceReports

-- Check experience was created
SELECT * FROM "Experiences" ORDER BY "createdAt" DESC LIMIT 1;

-- Check moderation queue
SELECT * FROM "ExperienceModerationQueues";
```

### Check Cron Jobs

Wait a few minutes and check:

```sql
-- Check engagement scores updated
SELECT "experienceId", "engagementScore", "lastScoreUpdate"
FROM "ExperienceEngagements"
ORDER BY "lastScoreUpdate" DESC LIMIT 5;
```

---

## 📚 Next Steps

1. **Read Full Documentation**: See [EXPERIENCE_API.md](./EXPERIENCE_API.md)
2. **Implementation Details**: See [EXPERIENCE_IMPLEMENTATION_SUMMARY.md](./EXPERIENCE_IMPLEMENTATION_SUMMARY.md)
3. **Build Mobile UI**: Use the API endpoints documented above
4. **Add Notifications**: Implement push notifications for approved/rejected experiences
5. **Monitor Performance**: Set up alerts for moderation SLA, queue backlog

---

## 🐛 Troubleshooting

### Migration Fails

**Error**: "relation LeaderboardCycles does not exist"
- **Fix**: Ensure LeaderboardCycles table exists first. Run previous migrations.

### Upload Fails

**Error**: "Access Denied" or "Credentials not found"
- **Fix**: Check AWS credentials in `.env` file
- **Fix**: Verify S3 bucket exists and is accessible
- **Fix**: Check IAM permissions for S3 PutObject

### Cron Jobs Not Running

**Error**: Engagement scores not updating
- **Fix**: Ensure cron jobs are registered in `src/app.js` or `src/server.js`
- **Fix**: Check server logs for cron execution messages
- **Fix**: Verify `node-cron` is installed: `npm install node-cron`

### Points Not Awarded

**Error**: User not receiving points for likes/saves
- **Fix**: Ensure LeaderboardCycle exists with `isActive = true`
- **Fix**: Check experience status is `APPROVED`
- **Fix**: Verify user is not liking/saving own content

---

## 🔗 Important Endpoints

### User Endpoints

- `POST /api/app/experiences` - Create experience
- `GET /api/app/experiences/explore` - Get feed (NEW/TRENDING)
- `GET /api/app/experiences/:id` - Get single experience
- `POST /api/app/experiences/:id/like` - Like experience
- `POST /api/app/experiences/:id/save` - Save to My Map
- `GET /api/app/experiences/my-map` - Get saved restaurants
- `GET /api/app/users/:userId/experiences` - User's experience grid

### Admin Endpoints

- `GET /api/admin/experiences/moderation/queue` - Moderation queue
- `POST /api/admin/experiences/moderation/:id/approve` - Approve
- `POST /api/admin/experiences/moderation/:id/reject` - Reject
- `GET /api/admin/experiences/moderation/stats` - Statistics

---

## 📞 Support

For issues or questions:
1. Check [EXPERIENCE_API.md](./EXPERIENCE_API.md) for detailed docs
2. Check [EXPERIENCE_IMPLEMENTATION_SUMMARY.md](./EXPERIENCE_IMPLEMENTATION_SUMMARY.md) for implementation details
3. Review server logs for error messages
4. Contact the Dinver backend team

---

**Ready to Go!** 🎉

Your Dinver Experience feature is now fully set up and ready to use.
