# Dinver Experience API Documentation

## Overview

The Dinver Experience feature allows users to create TikTok/Instagram-style posts about their restaurant experiences. This includes video or carousel posts, likes, saves, views tracking, and a comprehensive moderation system.

## Table of Contents

1. [Authentication](#authentication)
2. [Media Upload Flow](#media-upload-flow)
3. [Experience Endpoints](#experience-endpoints)
4. [Interaction Endpoints](#interaction-endpoints)
5. [Feed Endpoints](#feed-endpoints)
6. [User Content](#user-content)
7. [Moderation Endpoints](#moderation-endpoints)
8. [Data Models](#data-models)
9. [Points System](#points-system)
10. [Rate Limiting](#rate-limiting)

---

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Some endpoints (marked as "Optional Auth") work without authentication but provide additional features when authenticated.

---

## Media Upload Flow

The media upload process uses pre-signed URLs for secure, direct uploads to S3.

### 1. Request Pre-Signed URL

**POST** `/api/app/experiences/media/presign`

Request a pre-signed URL for uploading media.

**Headers:**

- `Authorization: Bearer <token>`

**Body:**

```json
{
  "kind": "IMAGE", // or "VIDEO"
  "mimeType": "image/jpeg",
  "bytes": 2048576,
  "checksum": "optional-md5-checksum"
}
```

**Response:**

```json
{
  "message": "Pre-signed URL generated successfully",
  "data": {
    "uploadUrl": "https://s3.amazonaws.com/...",
    "storageKey": "experiences/user123/images/uuid.jpg",
    "cdnUrl": "https://cdn.dinver.com/experiences/user123/images/uuid.jpg"
  }
}
```

**Constraints:**

- **Images**: Max 50MB, allowed types: `image/jpeg`, `image/png`, `image/webp`, `image/heic`
- **Videos**: Max 50MB, max 30 seconds, allowed types: `video/mp4`, `video/quicktime`

### 2. Upload File to S3

Use the `uploadUrl` from step 1 to upload your file directly:

```bash
curl -X PUT "<uploadUrl>" \
  --upload-file /path/to/file.jpg \
  -H "Content-Type: image/jpeg"
```

### 3. Confirm Upload

**POST** `/api/app/experiences/media/confirm`

Confirm the upload and start processing.

**Headers:**

- `Authorization: Bearer <token>`

**Body:**

```json
{
  "storageKey": "experiences/user123/images/uuid.jpg",
  "kind": "IMAGE"
}
```

**Response:**

```json
{
  "message": "Media upload confirmed. Processing started.",
  "data": {
    "storageKey": "experiences/user123/images/uuid.jpg",
    "kind": "IMAGE"
  }
}
```

---

## Experience Endpoints

### Create Experience

**POST** `/api/app/experiences`

Create a new experience post.

**Headers:**

- `Authorization: Bearer <token>`

**Body:**

```json
{
  "restaurantId": "uuid",
  "title": "Amazing dinner at Noel!",
  "description": "Best pasta I've ever had. The atmosphere was incredible.",
  "ratings": {
    "ambience": 5,
    "service": 4,
    "price": 3
  },
  "media": [
    {
      "storageKey": "experiences/user123/images/uuid1.jpg",
      "kind": "IMAGE",
      "orderIndex": 0
    },
    {
      "storageKey": "experiences/user123/images/uuid2.jpg",
      "kind": "IMAGE",
      "orderIndex": 1
    }
  ],
  "musicTrackId": null
}
```

**Response:**

```json
{
  "message": "Experience created successfully and submitted for moderation",
  "data": {
    "id": "exp_uuid",
    "userId": "user_uuid",
    "restaurantId": "rest_uuid",
    "status": "PENDING",
    "title": "Amazing dinner at Noel!",
    "description": "...",
    "mediaKind": "CAROUSEL",
    "createdAt": "2025-11-04T18:00:00Z",
    "author": { ... },
    "restaurant": { ... },
    "media": [ ... ]
  }
}
```

**Status Codes:**

- `201 Created` - Experience created successfully
- `400 Bad Request` - Invalid data (missing fields, too many images, etc.)
- `404 Not Found` - Restaurant not found

**Constraints:**

- **Video experiences**: Only 1 video allowed
- **Carousel experiences**: Max 10 images
- **Required fields**: `restaurantId`, `title`, `media`
- **Status**: Always starts as `PENDING` for moderation

---

### Get Experience

**GET** `/api/app/experiences/:id`

Get a single experience by ID.

**Headers:**

- `Authorization: Bearer <token>` (Optional)

**Response:**

```json
{
  "message": "Experience retrieved successfully",
  "data": {
    "id": "exp_uuid",
    "userId": "user_uuid",
    "restaurantId": "rest_uuid",
    "status": "APPROVED",
    "title": "Amazing dinner!",
    "description": "...",
    "ratingAmbience": 5,
    "ratingService": 4,
    "ratingPrice": 3,
    "mediaKind": "CAROUSEL",
    "likesCount": 42,
    "savesCount": 15,
    "viewsCount": 320,
    "engagementScore": 125.5,
    "createdAt": "2025-11-04T18:00:00Z",
    "author": {
      "id": "user_uuid",
      "name": "John Doe",
      "profileImage": "https://..."
    },
    "restaurant": {
      "id": "rest_uuid",
      "name": "Noel",
      "address": "...",
      "latitude": 45.815,
      "longitude": 15.982
    },
    "media": [
      {
        "id": "media_uuid",
        "kind": "IMAGE",
        "cdnUrl": "https://cdn.dinver.com/...",
        "width": 1080,
        "height": 1920,
        "orderIndex": 0,
        "thumbnails": [ ... ]
      }
    ],
    "engagement": {
      "likesCount": 42,
      "savesCount": 15,
      "viewsCount": 320,
      "avgCompletionRate": 0.85
    },
    "currentUserHasLiked": true,
    "currentUserHasSaved": false
  }
}
```

**Status Codes:**

- `200 OK` - Experience found
- `404 Not Found` - Experience not found or not accessible (not approved)

---

## Interaction Endpoints

### Like Experience

**POST** `/api/app/experiences/:id/like`

Like an experience. Idempotent - calling multiple times has same effect.

**Headers:**

- `Authorization: Bearer <token>`
- `X-Device-ID: <device_id>` (Optional, for fraud detection)

**Body:** Empty or `{}`

**Response:**

```json
{
  "message": "Experience liked successfully",
  "data": {
    "liked": true
  }
}
```

**Points Awarded:**

- Experience author receives **+0.05 points** (once per cycle)
- Self-likes do not award points

---

### Unlike Experience

**DELETE** `/api/app/experiences/:id/like`

Remove a like from an experience.

**Headers:**

- `Authorization: Bearer <token>`

**Response:**

```json
{
  "message": "Experience unliked successfully",
  "data": {
    "liked": false
  }
}
```

---

### Save Experience

**POST** `/api/app/experiences/:id/save`

Save the restaurant from this experience to "My Map". Idempotent.

**Headers:**

- `Authorization: Bearer <token>`
- `X-Device-ID: <device_id>` (Optional)

**Response:**

```json
{
  "message": "Experience saved successfully",
  "data": {
    "saved": true
  }
}
```

**Points Awarded:**

- Experience author receives **+0.05 points** (once per cycle)

**Note:** Saving is per restaurant, not per experience. If you save multiple experiences from the same restaurant, only one save is recorded.

---

### Unsave Experience

**DELETE** `/api/app/experiences/:id/save`

Remove the restaurant from "My Map".

**Headers:**

- `Authorization: Bearer <token>`

**Response:**

```json
{
  "message": "Experience unsaved successfully",
  "data": {
    "saved": false
  }
}
```

---

### Track View

**POST** `/api/app/experiences/:id/view`

Track that a user viewed an experience. Used for analytics and recommendations.

**Headers:**

- `Authorization: Bearer <token>` (Optional)
- `X-Device-ID: <device_id>` (Optional)

**Body:**

```json
{
  "durationMs": 5200,
  "completionRate": 0.85,
  "source": "EXPLORE_FEED",
  "sessionId": "session_uuid"
}
```

**Source Options:**

- `EXPLORE_FEED`
- `TRENDING_FEED`
- `USER_PROFILE`
- `RESTAURANT_PAGE`
- `DIRECT_LINK`
- `PUSH_NOTIFICATION`
- `MY_MAP`

**Response:**

```json
{
  "message": "View tracked successfully"
}
```

---

## Feed Endpoints

### Explore Feed

**GET** `/api/app/experiences/explore`

Get the explore feed with NEW or TRENDING experiences.

**Headers:**

- `Authorization: Bearer <token>` (Optional)

**Query Parameters:**

- `city` (optional): Filter by city (e.g., "Zagreb")
- `sort` (optional): "NEW" (default) or "TRENDING"
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Examples:**

```
GET /api/app/experiences/explore?city=Zagreb&sort=TRENDING&page=1&limit=20
GET /api/app/experiences/explore?sort=NEW
```

**Response:**

```json
{
  "message": "Explore feed retrieved successfully",
  "data": {
    "experiences": [
      {
        "id": "exp_uuid",
        "title": "...",
        "author": { ... },
        "restaurant": { ... },
        "media": [ ... ],
        "engagement": { ... },
        "likesCount": 42,
        "viewsCount": 320,
        "engagementScore": 125.5,
        "createdAt": "2025-11-04T18:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

**Sorting Logic:**

- **NEW**: Sorted by `createdAt DESC`
- **TRENDING**: Sorted by `engagementScore DESC` (weighted score with time decay)

---

## User Content

### Get User's Experiences

**GET** `/api/app/users/:userId/experiences`

Get all approved experiences by a specific user (profile grid).

**Headers:**

- `Authorization: Bearer <token>` (Optional)

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**

```json
{
  "message": "User experiences retrieved successfully",
  "data": {
    "experiences": [ ... ],
    "pagination": { ... }
  }
}
```

---

### Get My Likes

**GET** `/api/app/experiences/my-likes`

Get all experiences the current user has liked.

**Headers:**

- `Authorization: Bearer <token>`

**Query Parameters:**

- `page`, `limit` (optional)

**Response:**

```json
{
  "message": "Liked experiences retrieved successfully",
  "data": {
    "experiences": [ ... ],
    "pagination": { ... }
  }
}
```

---

### Get My Map

**GET** `/api/app/experiences/my-map`

Get all restaurants the user has saved (from experiences).

**Headers:**

- `Authorization: Bearer <token>`

**Query Parameters:**

- `page`, `limit` (optional)

**Response:**

```json
{
  "message": "My Map retrieved successfully",
  "data": {
    "savedRestaurants": [
      {
        "restaurant": {
          "id": "rest_uuid",
          "name": "Noel",
          "address": "...",
          "latitude": 45.815,
          "longitude": 15.982,
          "photos": [ ... ]
        },
        "lastSavedAt": "2025-11-04T18:00:00Z",
        "savedFrom": {
          "experienceId": "exp_uuid",
          "experienceTitle": "Amazing dinner!",
          "coverImage": "https://..."
        }
      }
    ],
    "pagination": { ... }
  }
}
```

---

### Report Experience

**POST** `/api/app/experiences/:id/report`

Report an experience for moderation review.

**Headers:**

- `Authorization: Bearer <token>`

**Body:**

```json
{
  "reasonCode": "INAPPROPRIATE_CONTENT",
  "description": "This video contains offensive content."
}
```

**Reason Codes:**

- `SPAM`
- `INAPPROPRIATE_CONTENT`
- `MISLEADING`
- `VIOLENCE`
- `HARASSMENT`
- `COPYRIGHT`
- `FAKE_LOCATION`
- `OTHER`

**Response:**

```json
{
  "message": "Report submitted successfully",
  "data": {
    "id": "report_uuid",
    "state": "OPEN",
    "createdAt": "2025-11-04T18:00:00Z"
  }
}
```

**Auto-Escalation:**

- If an experience receives 3+ reports, it is automatically escalated to URGENT priority in the moderation queue.

---

## Moderation Endpoints

All moderation endpoints require admin authentication.

### Get Moderation Queue

**GET** `/api/admin/experiences/moderation/queue`

Get the moderation queue.

**Headers:**

- `Authorization: Bearer <admin-token>`

**Query Parameters:**

- `state` (optional): "PENDING", "IN_REVIEW", "DECIDED", "ESCALATED" (default: "PENDING")
- `priority` (optional): "LOW", "NORMAL", "HIGH", "URGENT"
- `page`, `limit` (optional)

**Response:**

```json
{
  "message": "Moderation queue retrieved successfully",
  "data": {
    "queue": [
      {
        "id": "queue_uuid",
        "experienceId": "exp_uuid",
        "state": "PENDING",
        "priority": "NORMAL",
        "slaDeadline": "2025-11-05T18:00:00Z",
        "slaViolated": false,
        "experience": { ... },
        "autoFlags": {
          "nsfw": false,
          "violentContent": false
        },
        "createdAt": "2025-11-04T18:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

### Assign Moderator

**POST** `/api/admin/experiences/moderation/:id/assign`

Assign a moderator to an experience.

**Headers:**

- `Authorization: Bearer <admin-token>`

**Body:**

```json
{
  "moderatorId": "mod_uuid"
}
```

_If `moderatorId` is not provided, assigns to the current user._

**Response:**

```json
{
  "message": "Moderator assigned successfully",
  "data": { ... }
}
```

---

### Approve Experience

**POST** `/api/admin/experiences/moderation/:id/approve`

Approve an experience for public viewing.

**Headers:**

- `Authorization: Bearer <admin-token>`

**Body:**

```json
{
  "notes": "Content looks good. Approved."
}
```

**Response:**

```json
{
  "message": "Experience approved successfully",
  "data": {
    "id": "exp_uuid",
    "status": "APPROVED",
    "approvedAt": "2025-11-04T18:00:00Z"
  }
}
```

**Side Effects:**

- Experience status changes to `APPROVED`
- Experience becomes visible in feeds
- User receives notification (if implemented)

---

### Reject Experience

**POST** `/api/admin/experiences/moderation/:id/reject`

Reject an experience.

**Headers:**

- `Authorization: Bearer <admin-token>`

**Body:**

```json
{
  "reason": "This content violates our community guidelines regarding inappropriate content.",
  "notes": "Contains NSFW imagery."
}
```

**Response:**

```json
{
  "message": "Experience rejected successfully",
  "data": {
    "id": "exp_uuid",
    "status": "REJECTED",
    "rejectedReason": "..."
  }
}
```

**Side Effects:**

- Experience status changes to `REJECTED`
- Experience is not visible in feeds
- User receives notification with rejection reason

---

### Get Reports

**GET** `/api/admin/experiences/moderation/reports`

Get all experience reports.

**Headers:**

- `Authorization: Bearer <admin-token>`

**Query Parameters:**

- `state` (optional): "OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"
- `page`, `limit` (optional)

**Response:**

```json
{
  "message": "Reports retrieved successfully",
  "data": {
    "reports": [
      {
        "id": "report_uuid",
        "experienceId": "exp_uuid",
        "reporterId": "user_uuid",
        "reasonCode": "SPAM",
        "description": "...",
        "state": "OPEN",
        "experience": { ... },
        "reporter": { ... },
        "createdAt": "2025-11-04T18:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

### Review Report

**POST** `/api/admin/experiences/moderation/reports/:id/review`

Review and resolve a report.

**Headers:**

- `Authorization: Bearer <admin-token>`

**Body:**

```json
{
  "state": "RESOLVED",
  "resolution": "Content removed and user warned.",
  "actionTaken": "CONTENT_REMOVED"
}
```

**Action Taken Options:**

- `NONE`
- `CONTENT_REMOVED`
- `USER_WARNED`
- `USER_SUSPENDED`
- `FALSE_REPORT`

**Response:**

```json
{
  "message": "Report reviewed successfully",
  "data": { ... }
}
```

---

### Get Moderation Stats

**GET** `/api/admin/experiences/moderation/stats`

Get moderation statistics dashboard.

**Headers:**

- `Authorization: Bearer <admin-token>`

**Response:**

```json
{
  "message": "Moderation statistics retrieved successfully",
  "data": {
    "queue": {
      "pending": 12,
      "inReview": 3,
      "slaViolated": 1
    },
    "experiences": {
      "totalApproved": 1523,
      "totalRejected": 87
    },
    "reports": {
      "open": 5
    }
  }
}
```

---

## Data Models

### Experience

```typescript
interface Experience {
  id: string;
  userId: string;
  restaurantId: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  title: string;
  description: string | null;
  ratingAmbience: number | null; // 1-5
  ratingService: number | null; // 1-5
  ratingPrice: number | null; // 1-5
  mediaKind: 'VIDEO' | 'CAROUSEL';
  durationSec: number | null;
  coverMediaId: string | null;
  cityCached: string | null;
  approvedAt: Date | null;
  rejectedReason: string | null;
  version: number;
  visibility: 'PUBLIC' | 'PRIVATE';
  nsfwScore: number | null;
  brandSafetyScore: number | null;
  likesCount: number;
  savesCount: number;
  viewsCount: number;
  sharesCount: number;
  engagementScore: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### ExperienceMedia

```typescript
interface ExperienceMedia {
  id: string;
  experienceId: string;
  kind: 'IMAGE' | 'VIDEO';
  storageKey: string;
  cdnUrl: string | null;
  width: number | null;
  height: number | null;
  orderIndex: number;
  bytes: number | null;
  transcodingStatus: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
  transcodingError: string | null;
  thumbnails: Array<{ w: number; h: number; cdnUrl: string }> | null;
  videoFormats: object | null;
  durationSec: number | null;
  mimeType: string | null;
  contentLabels: object | null;
  nsfwScore: number | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### ExperienceEngagement

```typescript
interface ExperienceEngagement {
  id: string;
  experienceId: string;
  likesCount: number;
  savesCount: number;
  viewsCount: number;
  uniqueViewsCount: number;
  sharesCount: number;
  likes24h: number;
  saves24h: number;
  views24h: number;
  avgWatchTimeMs: number | null;
  avgCompletionRate: number | null;
  engagementScore: number;
  clickThroughRate: number | null;
  lastScoreUpdate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Points System

The Experience feature integrates with Dinver's existing points and leaderboard system.

### Point Awards

| Action                  | Points | Frequency               |
| ----------------------- | ------ | ----------------------- |
| Like on your experience | +0.05  | Once per user per cycle |
| Save on your experience | +0.05  | Once per user per cycle |

### Rules

1. **Cycle-based**: Points are awarded per leaderboard cycle (typically 14 days)
2. **No self-awarding**: Users cannot earn points from their own likes/saves
3. **Approved only**: Points are only awarded for APPROVED experiences
4. **Anti-fraud**: Device ID and IP tracking to detect suspicious activity

### Viewing Points

Points are added to the user's `UserPointsHistory` with:

- `actionType`: "EXPERIENCE_LIKE" or "EXPERIENCE_SAVE"
- `pointsEarned`: 0.05
- `experienceId`: Reference to the experience
- `description`: Friendly description

---

## Rate Limiting

To prevent abuse, the following rate limits are enforced:

### Per User

- **Create Experience**: 5 per day
- **Like/Unlike**: 60 per minute
- **Save/Unsave**: 60 per minute
- **View tracking**: No limit (analytics)
- **Report**: 10 per day

### Per IP

- **All endpoints**: 1000 requests per 15 minutes

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1730750400
```

---

## Engagement Scoring Algorithm

The trending feed uses an engagement score calculated as:

```
engagementScore =
  (likes × 1.0 + saves × 2.0 + views × 0.1 + completionRate × 0.5)
  × decayFactor

decayFactor = 0.5 ^ (hoursSinceCreation / 48)
```

**Weights:**

- Likes: 1.0
- Saves: 2.0 (more valuable - indicates intent to visit)
- Views: 0.1 (abundant, less valuable)
- Completion rate: 0.5 (quality signal)

**Time Decay:**

- Half-life of 48 hours
- Older content gradually loses ranking

**Update Frequency:**

- Scores recalculated every 5 minutes by cron job
- 24h metrics updated every hour

---

## Background Jobs

The Experience feature uses several cron jobs:

| Job                      | Schedule     | Purpose                                |
| ------------------------ | ------------ | -------------------------------------- |
| Update Engagement Scores | Every 5 min  | Recalculate trending scores            |
| Update 24h Metrics       | Every 1 hour | Track recent activity                  |
| Update Quality Metrics   | Every 30 min | Calculate avg watch time, completion   |
| Check Moderation SLA     | Every 1 hour | Flag overdue reviews                   |
| Cleanup Old Views        | Daily 3 AM   | Remove view records older than 90 days |

---

## Error Codes

| Status | Error                     | Description                                  |
| ------ | ------------------------- | -------------------------------------------- |
| 400    | `INVALID_MEDIA_KIND`      | Invalid kind (must be IMAGE or VIDEO)        |
| 400    | `INVALID_MIME_TYPE`       | Unsupported file type                        |
| 400    | `FILE_TOO_LARGE`          | File exceeds size limit                      |
| 400    | `TOO_MANY_IMAGES`         | Carousel has >10 images                      |
| 400    | `VIDEO_TOO_LONG`          | Video exceeds 30 seconds                     |
| 400    | `MISSING_REQUIRED_FIELDS` | Required fields not provided                 |
| 400    | `ALREADY_LIKED`           | User already liked this experience           |
| 400    | `NOT_APPROVED`            | Cannot interact with non-approved experience |
| 404    | `EXPERIENCE_NOT_FOUND`    | Experience does not exist                    |
| 404    | `RESTAURANT_NOT_FOUND`    | Restaurant does not exist                    |
| 404    | `FILE_NOT_FOUND`          | Uploaded file not found in storage           |
| 429    | `RATE_LIMIT_EXCEEDED`     | Too many requests                            |

---

## Webhooks (Future)

_Not implemented in MVP, but planned for future:_

- `experience.approved` - Fired when an experience is approved
- `experience.rejected` - Fired when an experience is rejected
- `experience.reported` - Fired when an experience is reported 3+ times
- `experience.trending` - Fired when an experience enters top 10 trending

---

## Testing

### Example Test Flow

1. **Upload media**:

   ```bash
   curl -X POST http://localhost:3000/api/app/experiences/media/presign \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"kind":"IMAGE","mimeType":"image/jpeg","bytes":1024000}'
   ```

2. **Upload to S3**:

   ```bash
   curl -X PUT "$UPLOAD_URL" --upload-file image.jpg \
     -H "Content-Type: image/jpeg"
   ```

3. **Confirm upload**:

   ```bash
   curl -X POST http://localhost:3000/api/app/experiences/media/confirm \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"storageKey":"...","kind":"IMAGE"}'
   ```

4. **Create experience**:

   ```bash
   curl -X POST http://localhost:3000/api/app/experiences \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "restaurantId":"...",
       "title":"Test Experience",
       "description":"This is a test",
       "ratings":{"ambience":5,"service":4,"price":3},
       "media":[{"storageKey":"...","kind":"IMAGE","orderIndex":0}]
     }'
   ```

5. **Approve (as admin)**:

   ```bash
   curl -X POST http://localhost:3000/api/admin/experiences/moderation/$EXP_ID/approve \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"notes":"Looks good"}'
   ```

6. **Like the experience**:
   ```bash
   curl -X POST http://localhost:3000/api/app/experiences/$EXP_ID/like \
     -H "Authorization: Bearer $TOKEN"
   ```

---

## Migration Guide

To add the Experience feature to an existing Dinver installation:

1. **Run migrations**:

   ```bash
   npx sequelize-cli db:migrate
   ```

2. **Register routes** in `src/app.js`:

   ```javascript
   const experienceRoutes = require('./routes/appRoutes/experienceRoutes');
   const userExperienceRoutes = require('./routes/appRoutes/userExperienceRoutes');
   const experienceModerationRoutes = require('./routes/adminRoutes/experienceModerationRoutes');

   app.use('/api/app/experiences', experienceRoutes);
   app.use('/api/app/users', userExperienceRoutes);
   app.use('/api/admin/experiences/moderation', experienceModerationRoutes);
   ```

3. **Register cron jobs** in `src/app.js`:

   ```javascript
   const experienceCron = require('./cron/experienceEngagementCron');
   const cron = require('node-cron');

   // Every 5 minutes - update engagement scores
   cron.schedule('*/5 * * * *', experienceCron.updateEngagementScores);

   // Every hour - update 24h metrics and check SLA
   cron.schedule('0 * * * *', async () => {
     await experienceCron.update24HourMetrics();
     await experienceCron.checkModerationSLA();
   });

   // Every 30 minutes - update quality metrics
   cron.schedule('*/30 * * * *', experienceCron.updateQualityMetrics);

   // Daily at 3 AM - cleanup old views
   cron.schedule('0 3 * * *', experienceCron.cleanupOldViews);
   ```

4. **Environment variables** (add to `.env`):

   ```
   AWS_CLOUDFRONT_DOMAIN=your-cloudfront-domain.cloudfront.net
   ```

5. **Install dependencies** (if not already installed):
   ```bash
   npm install @aws-sdk/s3-request-presigner fluent-ffmpeg sharp
   ```

---

## Support

For questions or issues, contact the Dinver backend team or create an issue in the repository.

---

**Version**: 1.0.0
**Last Updated**: 2025-11-04
**Author**: Dinver Backend Team
