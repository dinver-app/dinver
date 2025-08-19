# Coupon System Documentation

## Overview

The coupon system allows for both system-wide (DINVER) and restaurant-specific coupons. Users can claim coupons based on various conditions and redeem them at restaurants.

## Database Schema

### Tables

1. **Coupons** - Main coupon table
2. **CouponConditions** - Conditions that must be met to claim a coupon
3. **UserCoupons** - User's claimed coupons
4. **CouponRedemptions** - Records of coupon redemptions

### Key Fields

#### Coupons

- `source`: 'DINVER' (system-wide) or 'RESTAURANT' (restaurant-specific)
- `type`: 'REWARD_ITEM', 'PERCENT_DISCOUNT', 'FIXED_DISCOUNT', 'GENERIC_REWARD'
- `status`: 'DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED'
- `totalLimit`: Maximum global claims
- `perUserLimit`: Maximum claims per user

#### CouponConditions

- `kind`: Type of condition (points, referrals, visits, etc.)
- `valueInt`: Required value for the condition
- `restaurantScopeId`: Restaurant ID for restaurant-specific conditions

## API Endpoints

### Public Routes (Customers)

#### GET /api/coupons

Get available coupons for customers

- Query params: `city`, `restaurantId`, `userLat`, `userLng`, `distanceFilter`

#### POST /api/coupons/claim

Claim a coupon

- Body: `{ "couponId": "uuid" }`

#### GET /api/coupons/my-coupons

Get user's claimed coupons

#### GET /api/coupons/:userCouponId/qr

Generate QR code for a user coupon

### Restaurant Admin Routes

#### GET /api/admin/coupons/:restaurantId

Get restaurant-specific coupons

#### POST /api/admin/coupons

Create a new coupon

- Body: Full coupon object with conditions

#### PUT /api/admin/coupons/:id

Update an existing coupon

#### DELETE /api/admin/coupons/:id

Delete a coupon

#### POST /api/admin/restaurants/:restaurantId/coupons/redeem

Redeem a user coupon (restaurant staff)

### Sysadmin Routes

#### GET /sysadmin/coupons

Get all system-wide coupons

#### POST /sysadmin/coupons

Create system-wide coupon

#### PUT /sysadmin/coupons/:id

Update system-wide coupon

#### DELETE /sysadmin/coupons/:id

Delete system-wide coupon

## Coupon Types

### 1. REWARD_ITEM

- Free menu item
- Requires `rewardItemId` to be set
- User can choose restaurant when claiming

### 2. PERCENT_DISCOUNT

- Percentage off the bill
- Requires `percentOff` (0-100)
- Can be combined with max discount amount

### 3. FIXED_DISCOUNT

- Fixed amount off the bill
- Requires `fixedOff` (in currency units)

### 4. GENERIC_REWARD

- Generic reward (custom implementation needed)

## Condition Types

### 1. POINTS_AT_LEAST

- User must have minimum points
- Example: 100 points required

### 2. REFERRALS_AT_LEAST

- User must have minimum referrals
- Example: 3 referrals required

### 3. VISITS_SAME_RESTAURANT_AT_LEAST

- User must visit same restaurant minimum times
- Requires `restaurantScopeId`

### 4. VISITS_DIFFERENT_RESTAURANTS_AT_LEAST

- User must visit different restaurants minimum times
- Example: Visit 5 different restaurants

### 5. VISITS_CITIES_AT_LEAST

- User must visit minimum number of cities
- Example: Visit 3 different cities

## Usage Flow

### 1. Creating Coupons

```javascript
// System-wide coupon
const coupon = {
  source: 'DINVER',
  title: 'Welcome Bonus',
  type: 'PERCENT_DISCOUNT',
  percentOff: 50,
  totalLimit: 1000,
  perUserLimit: 1,
  startsAt: new Date(),
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  conditions: [
    {
      kind: 'POINTS_AT_LEAST',
      valueInt: 100,
    },
  ],
};

// Restaurant-specific coupon
const restaurantCoupon = {
  source: 'RESTAURANT',
  restaurantId: 'uuid',
  title: 'Happy Hour',
  type: 'PERCENT_DISCOUNT',
  percentOff: 20,
  totalLimit: 200,
  perUserLimit: 1,
  startsAt: new Date(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
};
```

### 2. Claiming Coupons

1. User browses available coupons
2. User meets conditions (points, visits, etc.)
3. User claims coupon
4. Coupon is valid for 1 year from claim date

### 3. Redeeming Coupons

1. User opens app and selects coupon
2. App generates QR code
3. Restaurant staff scans QR code
4. Coupon is marked as redeemed

## Business Logic

### Points System

- Points are deducted when claiming points-based coupons
- Points are tracked in `UserPoints` table

### Visit Tracking

- Visit counting system needs to be implemented
- Will track restaurant visits for condition checking

### Referral System

- Referral counting system needs to be implemented
- Will track user referrals for condition checking

### Expiration Logic

- Coupons have two expiration dates:
  1. `expiresAt`: When coupon becomes unavailable for claiming
  2. User coupon `expiresAt`: When claimed coupon expires (1 year from claim)

## Security Features

### QR Token Security

- Each user coupon has a unique `qrTokenHash`
- Hash is regenerated each time QR is generated
- Prevents QR code reuse

### Rate Limiting

- Per-user limits enforced
- Global limits enforced
- Audit logging for all actions

## Audit Logging

All coupon actions are logged:

- CREATE: When coupons are created
- UPDATE: When coupons are modified
- DELETE: When coupons are deleted
- CLAIM: When users claim coupons
- REDEEM: When coupons are redeemed

## Future Enhancements

1. **Referral System**: Implement referral tracking
2. **Visit Counting**: Implement restaurant visit tracking
3. **Advanced Conditions**: Add more complex condition types
4. **Analytics**: Track coupon performance and usage
5. **Notifications**: Notify users about available coupons
6. **Bulk Operations**: Create multiple coupons at once
7. **Templates**: Predefined coupon templates

## Testing

Demo data is available in the seed file:

- System-wide coupons with various conditions
- Restaurant-specific coupons
- Different coupon types and configurations

Run with: `npx sequelize-cli db:seed --seed 20250814121718-demo-coupons.js`
