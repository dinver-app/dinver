# Custom Reservations API Documentation

## Overview

Custom Reservations feature allows restaurant staff to manually create reservations for guests who contact the restaurant directly (e.g., phone bookings) without having a Dinver account. These reservations appear in the restaurant's calendar alongside regular Dinver user reservations but don't have chat functionality.

## Key Features

- **Admin-only creation**: Only restaurant admins can create custom reservations
- **Guest information storage**: Stores guest name, phone, and email (name is required)
- **SMS notifications**: Optional SMS confirmations to guests when phone number is provided
- **No chat functionality**: Custom reservations don't support messaging
- **Calendar integration**: Appears in restaurant reservation calendar
- **Same management**: Can be confirmed, declined, or cancelled by restaurant staff

## API Endpoints

### Create Custom Reservation

**POST** `/api/app/restaurants/:restaurantId/custom-reservations`

Creates a new custom reservation for a guest who doesn't have a Dinver account.

#### Authentication

- Requires API key authentication
- Requires user authentication token
- Requires admin permissions for the specified restaurant

#### URL Parameters

- `restaurantId` (string, required): UUID of the restaurant

#### Request Body

```json
{
  "date": "2024-01-15",
  "time": "19:30:00",
  "guests": 4,
  "guestName": "Marko Marić",
  "guestPhone": "+385 91 234 5678",
  "guestEmail": "marko.maric@email.com",
  "noteFromUser": "Birthday celebration, window table preferred"
}
```

#### Request Body Schema

| Field          | Type    | Required | Description                                        |
| -------------- | ------- | -------- | -------------------------------------------------- |
| `date`         | string  | Yes      | Reservation date in YYYY-MM-DD format              |
| `time`         | string  | Yes      | Reservation time in HH:mm:ss format                |
| `guests`       | integer | Yes      | Number of guests (1-99)                            |
| `guestName`    | string  | Yes      | Full name of the guest                             |
| `guestPhone`   | string  | No       | Guest's phone number                               |
| `guestEmail`   | string  | No       | Guest's email address (must be valid email format) |
| `noteFromUser` | string  | No       | Additional notes from the guest                    |

#### Response

**Success (201 Created)**

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "userId": null,
  "restaurantId": "987fcdeb-51a2-43d1-b456-426614174000",
  "date": "2024-01-15",
  "time": "19:30:00",
  "guests": 4,
  "status": "pending",
  "noteFromUser": "Birthday celebration, window table preferred",
  "noteFromOwner": null,
  "suggestedDate": null,
  "suggestedTime": null,
  "respondedAt": null,
  "cancelledAt": null,
  "isCustomReservation": true,
  "guestName": "Marko Marić",
  "guestPhone": "+385 91 234 5678",
  "guestEmail": "marko.maric@email.com",
  "threadActive": true,
  "canSendMessages": false,
  "createdAt": "2024-01-10T10:30:00.000Z",
  "updatedAt": "2024-01-10T10:30:00.000Z",
  "messages": [
    {
      "id": "msg-123",
      "reservationId": "123e4567-e89b-12d3-a456-426614174000",
      "senderId": null,
      "messageType": "system",
      "content": "Custom rezervacija kreirana za 4 osoba - Marko Marić",
      "metadata": {
        "type": "custom_reservation_created",
        "guests": 4,
        "date": "2024-01-15",
        "time": "19:30:00",
        "noteFromUser": "Birthday celebration, window table preferred",
        "guestName": "Marko Marić",
        "guestPhone": "+385 91 234 5678",
        "guestEmail": "marko.maric@email.com"
      },
      "readAt": null,
      "createdAt": "2024-01-10T10:30:00.000Z",
      "updatedAt": "2024-01-10T10:30:00.000Z",
      "sender": null
    }
  ]
}
```

**Error Responses**

**400 Bad Request - Missing required field**

```json
{
  "error": "Guest name is required for custom reservations."
}
```

**403 Forbidden - Access denied**

```json
{
  "error": "Access denied. Only restaurant admins can create custom reservations."
}
```

**404 Not Found - Restaurant not found**

```json
{
  "error": "Restaurant not found"
}
```

**500 Internal Server Error**

```json
{
  "error": "Failed to create custom reservation"
}
```

## Updated Endpoints

### Get Restaurant Reservations

**GET** `/api/app/restaurants/:restaurantId/reservations`

Now includes custom reservations in the response. Custom reservations will have:

- `isCustomReservation: true`
- `userId: null`
- Guest information fields: `guestName`, `guestPhone`, `guestEmail`
- `canSendMessages: false`

**Note**: This endpoint already returns both regular and custom reservations in the same response. Use the `isCustomReservation` flag to differentiate between them.

#### Response Example

```json
[
  {
    "id": "regular-reservation-id",
    "userId": "user-uuid",
    "restaurantId": "restaurant-uuid",
    "isCustomReservation": false,
    "canSendMessages": true,
    "user": {
      "id": "user-uuid",
      "firstName": "Ana",
      "lastName": "Anić",
      "email": "ana@email.com",
      "phone": "+385 91 123 4567"
    }
  },
  {
    "id": "custom-reservation-id",
    "userId": null,
    "restaurantId": "restaurant-uuid",
    "isCustomReservation": true,
    "canSendMessages": false,
    "guestName": "Marko Marić",
    "guestPhone": "+385 91 234 5678",
    "guestEmail": "marko.maric@email.com",
    "user": null
  }
]
```

## SMS Notifications

When a phone number is provided for custom reservations, the following SMS messages are sent:

### 1. Reservation Created

**Trigger**: When custom reservation is created with `guestPhone`
**Type**: `custom_reservation_created`
**Message**:

```
Hvala vam na rezervaciji! Vaša rezervacija u restoranu "[Restaurant Name]" za [DD.MM.YYYY.] u [HH:mm] je zaprimljena. Broj gostiju: [X]. Potvrda će vam stići uskoro.
```

### 2. Reservation Confirmed

**Trigger**: When custom reservation is confirmed by restaurant
**Type**: `custom_reservation_confirmed`
**Message**:

```
Vaša rezervacija u restoranu "[Restaurant Name]" za [DD.MM.YYYY.] u [HH:mm] je potvrđena. Broj gostiju: [X]. Vidimo se uskoro!
```

## Frontend Implementation Notes

### UI Considerations

1. **Reservation List Display**:
   - Use `isCustomReservation` flag to differentiate display
   - Show guest name instead of user name for custom reservations
   - Display guest contact info (phone/email) if available
   - Hide chat/messaging buttons for custom reservations (`canSendMessages: false`)

2. **Create Custom Reservation Form**:
   - Required fields: date, time, guests, guestName
   - Optional fields: guestPhone, guestEmail, noteFromUser
   - Validate email format if provided
   - Show SMS notification info when phone is provided

3. **Reservation Management**:
   - Custom reservations can be confirmed, declined, or cancelled by restaurant
   - Custom reservations cannot have alternative times suggested
   - Custom reservations cannot be cancelled by users (no user account)

### Example Frontend Code

```javascript
// Check if reservation is custom
const isCustomReservation = reservation.isCustomReservation;

// Display appropriate name
const displayName = isCustomReservation
  ? reservation.guestName
  : `${reservation.user.firstName} ${reservation.user.lastName}`;

// Show/hide chat button
const showChatButton = reservation.canSendMessages;

// Display contact info for custom reservations
const contactInfo = isCustomReservation
  ? {
      phone: reservation.guestPhone,
      email: reservation.guestEmail,
    }
  : null;
```

## Database Schema Changes

### Reservations Table

- Added `isCustomReservation` (BOOLEAN, default false)
- Added `guestName` (STRING, nullable)
- Added `guestPhone` (STRING, nullable)
- Added `guestEmail` (STRING, nullable)
- Modified `userId` to be nullable

### ReservationEvents Table

- Modified `userId` to be nullable (for custom reservation events)

## Error Handling

- SMS sending failures are logged but don't cause API errors
- Custom reservations don't trigger email notifications
- Custom reservations don't support push notifications
- All validation errors return appropriate HTTP status codes with descriptive messages

## Security

- Only restaurant admins can create custom reservations
- Admin permissions are validated on every request
- Guest information is stored securely and only accessible to restaurant staff
