# Points System Documentation

## Overview

The Dinver points system rewards users for their engagement with restaurants. Points act as a currency that can be redeemed for rewards offered by restaurants.

## Point-Earning Actions

### Reviews

| Action              | Points | Description                                                    |
| ------------------- | ------ | -------------------------------------------------------------- |
| `review_add`        | 10     | Adding a basic review (less than 120 characters)               |
| `review_long`       | 20     | Adding a detailed review (more than 120 characters)            |
| `review_with_photo` | 10     | Additional points for including at least one photo in a review |

### Restaurant Visits

| Action              | Points | Description                                                     |
| ------------------- | ------ | --------------------------------------------------------------- |
| `visit_qr`          | 30     | Scanning restaurant's QR code to confirm visit                  |
| `reservation_bonus` | 5      | Additional points when visit is through a confirmed reservation |

## Examples

### Maximum Points per Review

A user can earn up to 30 points for a single review:

- Long review (>120 chars): 20 points
- Adding photos: +10 points

### Maximum Points per Visit

A user can earn up to 35 points for a single visit:

- Basic visit (QR scan): 30 points
- Through reservation: +5 points

## Implementation Notes

### Point Awarding

- Points are awarded immediately after completing an action
- Each action's points are logged in the UserPointsHistory table
- Points can be spent on rewards offered by restaurants

### Anti-Abuse Measures

- Users can only scan a restaurant's QR code once per day
- Reservation QR codes are unique per reservation
- All point transactions are logged for audit purposes

### Database Structure

#### UserPoints Table

```sql
CREATE TABLE UserPoints (
  userId UUID PRIMARY KEY,
  totalPoints INTEGER DEFAULT 0
);
```

#### UserPointsHistory Table

```sql
CREATE TABLE UserPointsHistory (
  id UUID PRIMARY KEY,
  userId UUID NOT NULL,
  actionType ENUM('review_add', 'review_long', 'review_with_photo', 'visit_qr', 'reservation_bonus'),
  referenceId UUID,
  points INTEGER NOT NULL,
  description TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Example Point History Entry

```json
{
  "id": "uuid",
  "userId": "user-uuid",
  "actionType": "review_long",
  "referenceId": "review-uuid",
  "points": 20,
  "description": "Long review for Restaurant Name",
  "createdAt": "2024-04-22T12:34:56Z"
}
```

## Future Considerations

These features could be added in future iterations:

- Daily point earning limits
- Streak bonuses for consecutive days
- Special promotional periods with bonus points
- Achievement-based point bonuses
