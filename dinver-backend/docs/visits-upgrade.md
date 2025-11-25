# Visits API Upgrade - V2

## Pregled promjena

Visits API sada grupira visite po restoranu umjesto da vraća flat listu. Ovo omogućuje prikaz "Visited 15 restaurants" umjesto "28 visits" na profilu.

---

## Breaking Changes

### `GET /api/app/visits`

**Prije:**

```json
[
  { "id": "...", "restaurant": {...}, "receiptImageUrl": "..." },
  { "id": "...", "restaurant": {...}, "receiptImageUrl": "..." }
]
```

**Sada:**

```json
{
  "visitedRestaurants": [
    {
      "restaurant": {
        "id": "uuid",
        "name": "Restaurant Name",
        "rating": 4.5,
        "priceLevel": 2,
        "address": "Street 123",
        "place": "Zagreb",
        "isClaimed": true,
        "thumbnailUrl": "https://...",
        "userRatingsTotal": 150
      },
      "visitCount": 3,
      "lastVisitDate": "2025-11-20T12:00:00Z",
      "firstVisitDate": "2025-06-15T14:30:00Z",
      "visits": [
        {
          "id": "uuid",
          "submittedAt": "2025-11-20T12:00:00Z",
          "reviewedAt": "2025-11-20T14:00:00Z",
          "visitDate": "2025-11-20",
          "wasInMustVisit": false,
          "totalAmount": 45.5,
          "pointsAwarded": 4.55
        }
      ]
    }
  ],
  "totalRestaurantsVisited": 15,
  "totalVisits": 28
}
```

### `GET /api/app/users/:userId/visits`

Ista struktura kao `/visits`, ali bez `totalAmount` i `pointsAwarded` (privacy).

---

## Novi Endpointi

### `GET /api/app/visits/restaurant/:restaurantId`

Dohvati sve visite za specifični restoran.

**Response:**

```json
{
  "restaurant": {
    "id": "uuid",
    "name": "Restaurant Name",
    "thumbnailUrl": "https://..."
  },
  "visitCount": 3,
  "visits": [
    {
      "id": "uuid",
      "submittedAt": "2025-11-20T12:00:00Z",
      "visitDate": "2025-11-20",
      "totalAmount": 45.5,
      "pointsAwarded": 4.55
    }
  ]
}
```

### `GET /api/app/receipts`

Dohvati sve račune korisnika (pending, approved, rejected).

**Query params:**

- `status` - filter po statusu (optional): `pending`, `approved`, `rejected`
- `page` - stranica (default: 1)
- `limit` - broj po stranici (default: 20)

**Response:**

```json
{
  "receipts": [
    {
      "id": "uuid",
      "status": "pending",
      "submittedAt": "2025-11-20T12:00:00Z",
      "verifiedAt": null,
      "rejectionReason": null,
      "totalAmount": 45.5,
      "merchantName": "Restaurant ABC",
      "issueDate": "2025-11-20",
      "pointsAwarded": null,
      "imageUrl": "https://...",
      "restaurant": null,
      "visitId": "uuid",
      "visitStatus": "PENDING"
    }
  ],
  "totalCount": 28,
  "totalPages": 2,
  "currentPage": 1
}
```

### `GET /api/app/users/buddies`

Dohvati buddies (mutual follows) za tagging u visitima.

**Response:**

```json
{
  "buddies": [
    {
      "id": "uuid",
      "name": "John Doe",
      "username": "johndoe",
      "profileImage": "https://..."
    }
  ]
}
```

---

## Maknuto iz response-a

Slike računa su maknute iz visits response-a radi performansi:

- `receiptImageUrl`
- `receipt.thumbnailUrl`
- `receipt.mediumUrl`
- `receipt.fullscreenUrl`
- `receipt.originalUrl`

Umjesto toga dodano:

- `totalAmount` - iznos računa u EUR
- `pointsAwarded` - broj dodijeljenih bodova
