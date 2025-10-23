# Points System Documentation

## Overview

The Dinver app uses a comprehensive points system that tracks user activities and awards points for various actions. Points are stored in two main places:

- **Global Points**: `UserPoints` table - tracks total lifetime points for levels and achievements
- **Cycle Points**: `LeaderboardCycleParticipant` table - tracks points earned during active leaderboard cycles

## Points Configuration

### Current Points Values

Located in `src/utils/pointsService.js`:

| Action                            | Points | Description                                               |
| --------------------------------- | ------ | --------------------------------------------------------- |
| `REVIEW_ADD`                      | 3      | Basic review submission                                   |
| `REVIEW_ELITE`                    | 3      | Elite review (marked by sysadmin)                         |
| `REFERRAL_VERIFICATION_REFERRER`  | 2      | Referrer gets points when friend verifies email+phone     |
| `REFERRAL_VERIFICATION_REFERRED`  | 2      | New user gets points when they verify email+phone         |
| `REFERRAL_FIRST_RECEIPT_REFERRER` | 2      | Referrer gets points when friend's first receipt approved |
| `RECEIPT_APPROVED`                | 1      | Receipt approval (10€ = 1 point, calculated dynamically)  |

## Points Awarding Locations

### 1. Review System

**File**: `src/utils/pointsService.js` - `addReviewPoints()`
**Actions**:

- Basic review: 3 points
- Elite review (sysadmin marked): +3 points

**Current Status**: ✅ **Global + Cycle points** - fully integrated

### 2. Elite Review System

**File**: `src/controllers/reviewController.js` - `markReviewAsElite()`
**Actions**:

- Elite review marking: 3 points (sysadmin only)

**Current Status**: ✅ **Global + Cycle points** - fully integrated

### 3. Referral System

**File**: `src/controllers/authController.js` - `verifyPhone()` & `src/controllers/receiptController.js` - `approveReceipt()`
**Actions**:

- Referrer verification bonus: 2 points (when friend verifies email+phone)
- Referred user verification bonus: 2 points (when they verify email+phone)
- Referrer first receipt bonus: 2 points (when friend's first receipt approved)

**Current Status**: ✅ **Global + Cycle points** - fully integrated

### 4. Receipt System

**File**: `src/controllers/receiptController.js` - `approveReceipt()`
**Actions**:

- Receipt approval: 10€ = 1 point (calculated dynamically)

**Current Status**: ✅ **Both global AND cycle points** - properly integrated

## Points Processing Flow

### Global Points Processing

All points go through `UserPointsHistory.logPoints()` which:

1. Creates history record
2. Updates `UserPoints.totalPoints` (global)
3. Updates `LeaderboardCycleParticipant.totalPoints` (if active cycle exists)

### Cycle Points Processing

Only receipt approvals currently update cycle points. Other actions need integration.

## Required Changes

### Actions That Need Cycle Integration

The following actions currently only update global points and need cycle integration:

1. **Review System** (`addReviewPoints`)
2. **Restaurant Visits** (`addVisitPoints`)
3. **Referral System** (`addReferralRegistrationPoints`, `addReferralFirstVisitBonus`)
4. **Achievement System** (`addAchievementPoints`)
5. **Coupon System** (`spendPointsForCoupon`)

### Implementation Pattern

Each action should follow the same pattern as receipt approvals:

```javascript
// In UserPointsHistory.logPoints()
// Update active leaderboard cycle participant points
try {
  const activeLeaderboardCycle =
    await this.sequelize.models.LeaderboardCycle.findOne({
      where: { status: 'active' },
    });

  if (activeLeaderboardCycle) {
    const [participant, created] =
      await this.sequelize.models.LeaderboardCycleParticipant.findOrCreate({
        where: { cycleId: activeLeaderboardCycle.id, userId },
        defaults: { totalPoints: 0 },
      });

    await participant.addPoints(roundedPoints);
  }
} catch (error) {
  console.error('Error updating leaderboard cycle participant points:', error);
  // Don't throw error - we don't want to break points awarding if cycle update fails
}
```

## Points Calculation

### Decimal Handling

All points are rounded to 2 decimal places:

```javascript
const roundedPoints = Math.round(parseFloat(points) * 100) / 100;
```

### Receipt Points Calculation

```javascript
const pointsAwarded = Math.round((totalAmount / 10) * 100) / 100;
// Example: 25.87€ = 2.587 points → 2.59 points
```

## Database Schema

### UserPoints Table

- `totalPoints`: DECIMAL(10,2) - Global lifetime points
- `level`: INTEGER - User level based on total points

### LeaderboardCycleParticipant Table

- `totalPoints`: DECIMAL(10,2) - Points earned in specific cycle
- `rank`: INTEGER - Calculated rank within cycle

### UserPointsHistory Table

- `points`: DECIMAL(10,2) - Individual transaction points
- `actionType`: ENUM - Type of action that earned points

## Testing Points System

### Manual Testing

1. Create active leaderboard cycle
2. Perform various actions (reviews, visits, referrals, etc.)
3. Check both `UserPoints` and `LeaderboardCycleParticipant` tables
4. Verify points are correctly calculated and rounded

### Points Validation

- All points should be rounded to 2 decimal places
- Global points should always increase (except coupon spending)
- Cycle points should only increase during active cycles
- Negative points should only occur for coupon spending

## Future Considerations

### Points Multipliers

Consider adding seasonal multipliers for certain actions during special events.

### Points Expiration

Consider implementing points expiration for inactive users.

### Tiered Rewards

Consider different point values based on user level or restaurant tier.

---

**Last Updated**: 2025-10-22
**Maintainer**: Development Team
