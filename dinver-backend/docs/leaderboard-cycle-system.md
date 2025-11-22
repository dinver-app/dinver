# Leaderboard Cycle System Documentation

## Overview

The Leaderboard Cycle System is a comprehensive gamification feature that allows sysadmins to create time-limited competitions where users earn points through various activities. The system includes automatic winner selection, push notifications, and detailed analytics.

## System Architecture

### Core Components

1. **LeaderboardCycle** - Main cycle entity with configuration
2. **LeaderboardCycleParticipant** - Tracks user points within a cycle
3. **LeaderboardCycleWinner** - Stores selected winners
4. **Cron Job Manager** - Handles automatic cycle transitions
5. **Winner Selection Algorithm** - Weighted random selection with optional guaranteed first place

## Database Schema

### LeaderboardCycles Table

```sql
CREATE TABLE "LeaderboardCycles" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "startDate" TIMESTAMP NOT NULL,
  "endDate" TIMESTAMP NOT NULL,
  "status" ENUM('scheduled', 'active', 'completed', 'cancelled') DEFAULT 'scheduled',
  "headerImageUrl" VARCHAR(500),
  "numberOfWinners" INTEGER DEFAULT 1,
  "guaranteeFirstPlace" BOOLEAN DEFAULT false,
  "createdBy" UUID REFERENCES "UserSysadmins"("id"),
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
```

### LeaderboardCycleParticipants Table

```sql
CREATE TABLE "LeaderboardCycleParticipants" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "cycleId" UUID REFERENCES "LeaderboardCycles"("id") ON DELETE CASCADE,
  "userId" UUID REFERENCES "Users"("id") ON DELETE CASCADE,
  "totalPoints" DECIMAL(10,2) DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("cycleId", "userId")
);
```

### LeaderboardCycleWinners Table

```sql
CREATE TABLE "LeaderboardCycleWinners" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "cycleId" UUID REFERENCES "LeaderboardCycles"("id") ON DELETE CASCADE,
  "userId" UUID REFERENCES "Users"("id") ON DELETE CASCADE,
  "rank" INTEGER NOT NULL,
  "pointsAtSelection" DECIMAL(10,2) NOT NULL,
  "isGuaranteedWinner" BOOLEAN DEFAULT false,
  "selectedAt" TIMESTAMP DEFAULT NOW()
);
```

## Backend API Endpoints

### Sysadmin Routes (Protected)

#### Cycle Management

**GET** `/api/sysadmin/leaderboard-cycles`

- **Description**: Get paginated list of all cycles
- **Query Parameters**:
  - `page` (number, default: 1)
  - `limit` (number, default: 10)
  - `status` (string, optional: 'scheduled', 'active', 'completed', 'cancelled')
- **Response**:

```json
{
  "cycles": [
    {
      "id": "uuid",
      "title": "Summer Challenge",
      "description": "<p>Compete for amazing prizes!</p>",
      "startDate": "2025-01-01T00:00:00Z",
      "endDate": "2025-01-31T23:59:59Z",
      "status": "active",
      "headerImageUrl": "https://cdn.example.com/image.jpg",
      "numberOfWinners": 3,
      "guaranteeFirstPlace": true,
      "participantCount": 25,
      "winnerCount": 0,
      "creatorName": "John Doe",
      "progressPercentage": 45,
      "remainingDays": 15,
      "durationInDays": 31
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

**POST** `/api/sysadmin/leaderboard-cycles`

- **Description**: Create new cycle
- **Body** (multipart/form-data):

```json
{
  "title": "Summer Challenge",
  "description": "<p>Compete for amazing prizes!</p>",
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-01-31T23:59:59Z",
  "numberOfWinners": 3,
  "guaranteeFirstPlace": true,
  "headerImage": "file" // optional image file
}
```

**GET** `/api/sysadmin/leaderboard-cycles/:id`

- **Description**: Get detailed cycle information
- **Response**: Same as list item but with full details

**PUT** `/api/sysadmin/leaderboard-cycles/:id`

- **Description**: Update cycle (only if scheduled/active)
- **Body**: Same as create

**PUT** `/api/sysadmin/leaderboard-cycles/:id/cancel`

- **Description**: Cancel cycle
- **Response**: `{ "message": "Cycle cancelled successfully" }`

**PUT** `/api/sysadmin/leaderboard-cycles/:id/complete`

- **Description**: Manually complete cycle and select winners
- **Response**: `{ "message": "Cycle completed successfully", "winners": 3 }`

**DELETE** `/api/sysadmin/leaderboard-cycles/:id/delete`

- **Description**: Permanently delete cancelled cycle
- **Response**: `{ "message": "Cycle deleted successfully" }`

#### Participants & Winners

**GET** `/api/sysadmin/leaderboard-cycles/:id/participants`

- **Description**: Get cycle participants with rankings
- **Query Parameters**: `page`, `limit`
- **Response**:

```json
{
  "participants": [
    {
      "id": "uuid",
      "totalPoints": 15.50,
      "rank": 1,
      "userName": "John Doe",
      "user": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "city": "Zagreb"
      }
    }
  ],
  "pagination": { ... }
}
```

**GET** `/api/sysadmin/leaderboard-cycles/:id/winners`

- **Description**: Get cycle winners
- **Response**:

```json
{
  "winners": [
    {
      "id": "uuid",
      "rank": 1,
      "pointsAtSelection": 15.5,
      "isGuaranteedWinner": true,
      "selectedAt": "2025-01-31T23:59:59Z",
      "userName": "John Doe",
      "user": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "city": "Zagreb"
      }
    }
  ]
}
```

#### Utility Endpoints

**POST** `/api/sysadmin/leaderboard-cycles/trigger-check`

- **Description**: Manually trigger cycle status check
- **Response**: `{ "message": "Cycle check triggered successfully" }`

### App Routes (User-facing)

#### Active Cycle Information

**GET** `/api/app/leaderboard-cycles/active`

- **Description**: Get currently active cycle with user's position
- **Headers**: `Authorization: Bearer <token>`
- **Response**:

```json
{
  "activeCycle": {
    "id": "uuid",
    "title": "Summer Challenge",
    "description": "<p>Compete for amazing prizes!</p>",
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-01-31T23:59:59Z",
    "status": "active",
    "headerImageUrl": "https://cdn.example.com/image.jpg",
    "numberOfWinners": 3,
    "guaranteeFirstPlace": true,
    "progressPercentage": 45,
    "remainingDays": 15,
    "durationInDays": 31
  },
  "userPosition": 5,
  "userPoints": 8.25,
  "totalParticipants": 25
}
```

#### Cycle Leaderboard

**GET** `/api/app/leaderboard-cycles/:id/leaderboard`

- **Description**: Get public leaderboard for a cycle with user's position
- **Headers**: `Authorization: Bearer <token>` (optional - for user stats)
- **Query Parameters**: `page`, `limit`
- **Response**:

```json
{
  "leaderboard": [
    {
      "id": "uuid",
      "rank": 1,
      "totalPoints": 15.5,
      "formattedPoints": "15.50",
      "userName": "John Doe",
      "user": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "city": "Zagreb"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "totalPages": 1
  },
  "userStats": {
    "position": 5,
    "points": 8.25,
    "formattedPoints": "8.25",
    "isParticipating": true
  }
}
```

**Note**: `userStats` is only returned if user is authenticated. If user is not participating or has 0 points, `position` will be `null` and `isParticipating` will be `false`.

#### Cycle History

**GET** `/api/app/leaderboard-cycles/history`

- **Description**: Get past completed cycles with winners
- **Query Parameters**: `page`, `limit`
- **Response**:

```json
{
  "cycles": [
    {
      "id": "uuid",
      "title": "Spring Challenge",
      "endDate": "2025-01-31T23:59:59Z",
      "winners": [
        {
          "rank": 1,
          "userName": "Jane Smith",
          "pointsAtSelection": 12.75,
          "isGuaranteedWinner": true
        }
      ]
    }
  ],
  "pagination": { ... }
}
```

## Cycle Lifecycle

### Status Transitions

1. **scheduled** → **active**: When `startDate` is reached
2. **active** → **completed**: When `endDate` is reached
3. **scheduled/active** → **cancelled**: Manual cancellation by sysadmin
4. **active** → **completed**: Manual completion by sysadmin

### Automatic Transitions

The cron job (`leaderboardCycleManager.js`) runs every hour and:

1. **Activates scheduled cycles** when `startDate` is reached
2. **Completes active cycles** when `endDate` is reached
3. **Selects winners** using the weighted random algorithm
4. **Sends push notifications** to all participants about winners

## Winner Selection Algorithm

### Weighted Random Selection

```javascript
// Each point = 1 "ticket" in the lottery
// User with 10 points has 10 tickets
// User with 5 points has 5 tickets

const selectWinners = (participants, numberOfWinners, guaranteeFirstPlace) => {
  const winners = [];
  const remainingParticipants = [...participants];

  // Sort by points (descending)
  remainingParticipants.sort((a, b) => b.totalPoints - a.totalPoints);

  // Guarantee first place if enabled
  if (guaranteeFirstPlace && remainingParticipants.length > 0) {
    const firstPlace = remainingParticipants.shift();
    winners.push({
      ...firstPlace,
      rank: 1,
      isGuaranteedWinner: true,
    });
  }

  // Select remaining winners using weighted random
  const remainingSlots = numberOfWinners - winners.length;
  for (let i = 0; i < remainingSlots && remainingParticipants.length > 0; i++) {
    const winner = selectWeightedRandom(remainingParticipants);
    winners.push({
      ...winner,
      rank: winners.length + 1,
      isGuaranteedWinner: false,
    });

    // Remove selected winner from pool
    const index = remainingParticipants.findIndex((p) => p.id === winner.id);
    remainingParticipants.splice(index, 1);
  }

  return winners;
};
```

## Points Integration

### Automatic Points Tracking

When users earn points through any activity, the system automatically:

1. **Updates global points** (`UserPoints.totalPoints`)
2. **Updates cycle points** (`LeaderboardCycleParticipant.totalPoints`) if active cycle exists
3. **Logs transaction** (`UserPointsHistory`)

### Points Sources

- **Reviews**: 3 points per review
- **Elite Reviews**: +3 bonus points (sysadmin marked)
- **Receipt Approvals**: 10€ = 1 point (dynamic calculation)
- **Referral Verification**: 2 points each (referrer + referred)
- **Referral First Receipt**: 2 points to referrer

## Push Notifications

### Cycle Completion Notification

When a cycle ends, all participants receive:

```json
{
  "title": "Cycle Completed!",
  "body": "Summer Challenge has ended! Check out the winners and start earning points for the next cycle!",
  "data": {
    "type": "cycle_completed",
    "cycleId": "uuid",
    "cycleTitle": "Summer Challenge"
  }
}
```

### Winner Notification

Winners receive special notifications:

```json
{
  "title": "Congratulations!",
  "body": "You won 1st place in Summer Challenge! You earned 15.50 points.",
  "data": {
    "type": "cycle_winner",
    "cycleId": "uuid",
    "rank": 1,
    "points": 15.5
  }
}
```

## Frontend Implementation Guide

### Required Components

1. **Cycle List View** - Display active/past cycles
2. **Cycle Detail View** - Show cycle info, leaderboard, countdown
3. **User Position Card** - Show user's current rank and points
4. **Leaderboard Table** - Display top participants
5. **Winner Announcement** - Show cycle winners

### Key Features to Implement

#### 1. Active Cycle Display

```typescript
// Fetch active cycle
const response = await fetch('/api/app/leaderboard-cycles/active', {
  headers: { Authorization: `Bearer ${token}` },
});
const { activeCycle, userPosition, userPoints, totalParticipants } =
  await response.json();

// Display countdown
const remainingTime = new Date(activeCycle.endDate).getTime() - Date.now();
const days = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));
```

#### 2. Leaderboard Integration

```typescript
// Fetch leaderboard with user stats
const response = await fetch(
  `/api/app/leaderboard-cycles/${cycleId}/leaderboard?page=1&limit=50`,
  {
    headers: { Authorization: `Bearer ${token}` },
  },
);
const { leaderboard, userStats } = await response.json();

// Display leaderboard
leaderboard.forEach((participant, index) => {
  const isCurrentUser = participant.user.id === currentUserId;
  // Highlight current user's row
});

// Display user's position separately
if (userStats) {
  if (userStats.isParticipating) {
    console.log(
      `You are ranked #${userStats.position} with ${userStats.formattedPoints} points`,
    );
  } else {
    console.log('You are not participating in this cycle');
  }
}
```

#### 3. Real-time Updates

```typescript
// Poll for updates every 30 seconds during active cycle
useEffect(() => {
  if (activeCycle) {
    const interval = setInterval(() => {
      fetchActiveCycle();
    }, 30000);

    return () => clearInterval(interval);
  }
}, [activeCycle]);
```

#### 4. Push Notification Handling

```typescript
// Handle cycle completion notifications
const handleNotification = (notification) => {
  if (notification.data.type === 'cycle_completed') {
    // Refresh cycle data
    // Show winner announcement modal
  }

  if (notification.data.type === 'cycle_winner') {
    // Show congratulations modal
    // Update user's achievement status
  }
};
```

### UI/UX Recommendations

1. **Visual Hierarchy**: Use cards for cycle info, tables for leaderboards
2. **Progress Indicators**: Show cycle progress with progress bars
3. **Countdown Timers**: Display remaining time prominently
4. **User Highlighting**: Clearly mark user's position in leaderboards
5. **Winner Announcements**: Use modals or banners for winner notifications
6. **Loading States**: Show skeletons during data fetching
7. **Error Handling**: Graceful fallbacks for API failures

### Performance Considerations

1. **Pagination**: Implement pagination for large leaderboards
2. **Caching**: Cache cycle data to reduce API calls
3. **Optimistic Updates**: Update UI immediately, sync with backend
4. **Image Optimization**: Use CDN URLs for cycle header images
5. **Lazy Loading**: Load leaderboard data on demand

## Security Considerations

1. **Authentication**: All app routes require valid JWT tokens
2. **Authorization**: Sysadmin routes require sysadmin role
3. **Input Validation**: Sanitize all user inputs
4. **Rate Limiting**: Implement rate limiting on API endpoints
5. **Data Privacy**: Only show necessary user information in leaderboards

## Monitoring & Analytics

### Key Metrics to Track

1. **Cycle Participation**: Number of participants per cycle
2. **Points Distribution**: Average points earned per user
3. **Engagement**: Time spent viewing leaderboards
4. **Completion Rate**: Percentage of cycles completed vs cancelled
5. **Winner Distribution**: Geographic distribution of winners

### Logging

All cycle operations are logged for audit purposes:

- Cycle creation/modification
- Winner selection
- Status transitions
- User participation

## Troubleshooting

### Common Issues

1. **Missing Participants**: Check if `UserPointsHistory.logPoints()` is updating cycle points
2. **Winner Selection Fails**: Verify cron job is running and has proper permissions
3. **Push Notifications Not Sent**: Check push token validity and notification service
4. **Image Upload Issues**: Verify S3 configuration and file size limits

### Debug Endpoints

- **GET** `/api/sysadmin/leaderboard-cycles/trigger-check` - Manual cron trigger
- Check server logs for detailed error messages
- Verify database constraints and foreign key relationships

## Future Enhancements

1. **Multi-tier Rewards**: Different rewards for different ranks
2. **Team Cycles**: Group competitions
3. **Custom Point Multipliers**: Special events with bonus points
4. **Social Features**: Share achievements, challenge friends
5. **Analytics Dashboard**: Detailed participation analytics
6. **Mobile Push Notifications**: Rich notifications with images
7. **Offline Support**: Cache cycle data for offline viewing
