# Experience API Documentation

**Datum:** Studeni 2025

Dokumentacija za Experience sustav - moderne recenzije restorana povezane s Visitima.

---

## Pregled

Experience je recenzija restorana koja se kreira nakon što korisnik uploada račun (Visit). Svaki Experience sadrži:

- **3 ocjene** (1.0-10.0): Hrana, Ambijent, Usluga
- **Overall ocjena**: Automatski izračunat prosjek
- **Opis**: Tekst opis doživljaja (optional)
- **Slike**: Do 6 slika s opisima (optional)
- **Metadata**: Broj osoba, vrsta obroka, visibility

---

## User Flow

```
1. Korisnik uploada račun
   POST /api/app/visits/upload-receipt
   ↓
2. Sistem prikaže: "Dodaj doživljaj?" [Sada] [Kasnije]
   ↓
3. Korisnik klikne "Sada"
   ↓
┌─────────────────────────────────────────────────────┐
│ SCREEN 1: Ocjene                                    │
│                                                     │
│ Hrana    [====slider 1-10====] 8.5                 │
│ Ambijent [====slider 1-10====] 7.0                 │
│ Usluga   [====slider 1-10====] 9.0                 │
│                                                     │
│ Overall: 8.2 ⭐ (automatski izračunat)             │
└─────────────────────────────────────────────────────┘
   ↓
   POST /api/app/experiences { visitId, foodRating, ambienceRating, serviceRating }
   Response: { experienceId: "..." }
   ↓
┌─────────────────────────────────────────────────────┐
│ SCREEN 2: Detalji                                   │
│                                                     │
│ Opis (optional):                                    │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Odlična pizza, brza usluga...                   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ S koliko osoba? [- 2 +]                            │
│                                                     │
│ Vrsta obroka:                                       │
│ [🍳 Doručak] [🥐 Brunch] [🍝 Ručak]                │
│ [🍷 Večera] [☕ Kava] [🍿 Snack]                   │
│                                                     │
│ Tko može vidjeti?                                   │
│ [🌍 Svi ✓] [👥 Followeri] [🤝 Buddies]            │
└─────────────────────────────────────────────────────┘
   ↓
   PUT /api/app/experiences/:experienceId { description, partySize, mealType, visibility }
   ↓
┌─────────────────────────────────────────────────────┐
│ SCREEN 3: Slike (optional)                          │
│                                                     │
│ Dodaj slike (max 6):                                │
│                                                     │
│ ┌─────┐ ┌─────┐ ┌─────┐                            │
│ │ 📷  │ │ 🍕  │ │ 🍝  │                            │
│ │ +   │ │     │ │     │                            │
│ └─────┘ └─────┘ └─────┘                            │
│                                                     │
│ "Što je na slici?" (optional)                       │
│ [Pizza Margherita]                                  │
└─────────────────────────────────────────────────────┘
   ↓
   POST /api/app/experiences/:experienceId/media (za svaku sliku)
   ↓
   POST /api/app/experiences/:experienceId/publish
   ↓
[Success: "Doživljaj spremljen!"]
```

---

## Autentifikacija

Sve rute zahtijevaju:

- **API Key**: `X-Api-Key` header
- **JWT Token**: `Authorization: Bearer {token}` header (osim za feed koji je opcionalan)

---

## API Endpointi

### 1. Kreiraj Experience

**Endpoint:** `POST /api/app/experiences`

**Opis:** Kreira novi Experience povezan s Visitom.

**Headers:**
```
Authorization: Bearer {token}
X-Api-Key: {api-key}
Content-Type: application/json
```

**Request Body:**
```json
{
  "visitId": "550e8400-e29b-41d4-a716-446655440000",
  "foodRating": 8.5,
  "ambienceRating": 7.0,
  "serviceRating": 9.0,
  "description": "Odlična pizza, brza usluga...",
  "partySize": 2,
  "mealType": "dinner",
  "visibility": "ALL"
}
```

| Field | Type | Required | Opis |
|-------|------|----------|------|
| `visitId` | UUID | ✅ | ID Visita za koji se kreira Experience |
| `foodRating` | Decimal | ✅ | Ocjena hrane (1.0-10.0) |
| `ambienceRating` | Decimal | ✅ | Ocjena ambijenta (1.0-10.0) |
| `serviceRating` | Decimal | ✅ | Ocjena usluge (1.0-10.0) |
| `description` | String | ❌ | Opis doživljaja (max 500 znakova) |
| `partySize` | Integer | ❌ | Broj osoba (default: 2) |
| `mealType` | Enum | ❌ | Vrsta obroka |
| `visibility` | Enum | ❌ | Tko može vidjeti (default: ALL) |

**mealType opcije:** `breakfast`, `brunch`, `lunch`, `dinner`, `coffee`, `snack`

**visibility opcije:** `ALL`, `FOLLOWERS`, `BUDDIES`

**Response - Success (201):**
```json
{
  "experienceId": "660e8400-e29b-41d4-a716-446655440001",
  "message": "Experience created. Add images to complete.",
  "overallRating": 8.2
}
```

**Response - Error:**
```json
// 400 - Missing visitId
{ "error": "Visit ID is required" }

// 400 - Invalid ratings
{ "error": "Ratings must be between 1.0 and 10.0" }

// 404 - Visit not found
{ "error": "Visit not found" }

// 400 - Already has experience
{ "error": "This visit already has an experience", "experienceId": "..." }
```

---

### 2. Ažuriraj Experience

**Endpoint:** `PUT /api/app/experiences/:experienceId`

**Opis:** Ažurira Experience dok je u DRAFT statusu.

**Headers:**
```
Authorization: Bearer {token}
X-Api-Key: {api-key}
Content-Type: application/json
```

**Request Body:**
```json
{
  "description": "Ažurirani opis...",
  "partySize": 4,
  "mealType": "lunch",
  "visibility": "FOLLOWERS"
}
```

Sva polja su opcionalna - šalju se samo ona koja se mijenjaju.

**Response - Success (200):**
```json
{
  "message": "Experience updated",
  "experienceId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Response - Error:**
```json
// 400 - Already published
{ "error": "Cannot update experience after publishing", "status": "APPROVED" }
```

---

### 3. Upload Slike

**Endpoint:** `POST /api/app/experiences/:experienceId/media`

**Opis:** Uploaduje sliku za Experience (max 6 slika).

**Headers:**
```
Authorization: Bearer {token}
X-Api-Key: {api-key}
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**

| Field | Type | Required | Opis |
|-------|------|----------|------|
| `image` | File | ✅ | Slika (JPEG, PNG, WEBP, HEIC) |
| `caption` | String | ❌ | "Što je na slici?" odgovor |
| `menuItemId` | UUID | ❌ | ID jela iz menija (ako se mapira) |

**Response - Success (201):**
```json
{
  "mediaId": "770e8400-e29b-41d4-a716-446655440002",
  "imageUrl": "experiences/user123/abc.jpg",
  "thumbnailUrl": "experiences/user123/abc-thumb.jpg",
  "orderIndex": 0,
  "message": "Image uploaded successfully"
}
```

**Response - Error:**
```json
// 400 - Max images reached
{ "error": "Maximum 6 images allowed per experience" }

// 400 - Invalid file type
{ "error": "Invalid file type. Only JPEG, PNG, WEBP, and HEIC are allowed." }
```

---

### 4. Obriši Sliku

**Endpoint:** `DELETE /api/app/experiences/:experienceId/media/:mediaId`

**Opis:** Briše sliku iz Experience-a (samo dok je DRAFT).

**Response - Success (200):**
```json
{
  "message": "Media deleted"
}
```

---

### 5. Objavi Experience

**Endpoint:** `POST /api/app/experiences/:experienceId/publish`

**Opis:** Objavljuje Experience (DRAFT → PENDING/APPROVED).

**Napomena:** Ako je povezani Visit APPROVED, Experience postaje odmah APPROVED. Ako je Visit još PENDING, Experience ostaje PENDING dok se Visit ne odobri.

**Response - Success (200):**
```json
{
  "message": "Experience published successfully!",
  "status": "APPROVED",
  "experienceId": "660e8400-e29b-41d4-a716-446655440001"
}
```

Ili ako Visit nije još odobren:
```json
{
  "message": "Experience saved! Will be visible once receipt is approved.",
  "status": "PENDING",
  "experienceId": "660e8400-e29b-41d4-a716-446655440001"
}
```

---

### 6. Dohvati Experience

**Endpoint:** `GET /api/app/experiences/:experienceId`

**Opis:** Dohvaća detalje Experience-a.

**Response - Success (200):**
```json
{
  "experience": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "userId": "user-uuid",
    "restaurantId": "restaurant-uuid",
    "visitId": "visit-uuid",
    "status": "APPROVED",
    "foodRating": "8.5",
    "ambienceRating": "7.0",
    "serviceRating": "9.0",
    "overallRating": "8.2",
    "description": "Odlična pizza...",
    "partySize": 2,
    "mealType": "dinner",
    "visibility": "ALL",
    "likesCount": 15,
    "sharesCount": 3,
    "publishedAt": "2025-11-25T14:30:00Z",
    "author": {
      "id": "user-uuid",
      "name": "Marko Marković",
      "username": "marko",
      "profileImage": "https://..."
    },
    "restaurant": {
      "id": "restaurant-uuid",
      "name": "Pizzeria Napoli",
      "slug": "pizzeria-napoli",
      "place": "Zagreb",
      "address": "Ilica 100",
      "thumbnailUrl": "https://..."
    },
    "media": [
      {
        "id": "media-uuid",
        "kind": "IMAGE",
        "storageKey": "experiences/user/abc.jpg",
        "caption": "Pizza Margherita",
        "orderIndex": 0,
        "menuItem": {
          "id": "menu-item-uuid",
          "name": "Pizza Margherita"
        }
      }
    ],
    "visit": {
      "id": "visit-uuid",
      "status": "APPROVED",
      "visitDate": "2025-11-20"
    },
    "hasLiked": false,
    "hasSaved": false
  }
}
```

---

### 7. Experience Feed

**Endpoint:** `GET /api/app/experiences/feed`

**Opis:** Dohvaća feed Experience-a (kronološki, najnoviji prvi).

**Query Parametri:**

| Param | Type | Default | Opis |
|-------|------|---------|------|
| `limit` | Integer | 20 | Broj rezultata po stranici |
| `offset` | Integer | 0 | Pomak za paginaciju |
| `city` | String | - | Filter po gradu |
| `mealType` | String | - | Filter po vrsti obroka |

**Primjer:** `GET /api/app/experiences/feed?city=Zagreb&mealType=dinner&limit=10`

**Response - Success (200):**
```json
{
  "experiences": [
    {
      "id": "experience-uuid",
      "foodRating": "8.5",
      "ambienceRating": "7.0",
      "serviceRating": "9.0",
      "overallRating": "8.2",
      "description": "Odlična pizza...",
      "partySize": 2,
      "mealType": "dinner",
      "likesCount": 15,
      "publishedAt": "2025-11-25T14:30:00Z",
      "author": {
        "id": "user-uuid",
        "name": "Marko Marković",
        "username": "marko",
        "profileImage": "https://..."
      },
      "restaurant": {
        "id": "restaurant-uuid",
        "name": "Pizzeria Napoli",
        "slug": "pizzeria-napoli",
        "place": "Zagreb",
        "thumbnailUrl": "https://..."
      },
      "media": [
        {
          "id": "media-uuid",
          "storageKey": "experiences/user/abc.jpg"
        }
      ],
      "hasLiked": false,
      "hasSaved": false
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### 8. Korisnikovi Experience-i

**Endpoint:** `GET /api/app/experiences/user/:userId`

**Opis:** Dohvaća Experience-e određenog korisnika.

**Response:** Isto kao Feed, ali filtrirano po korisniku.

---

### 9. Restoranovi Experience-i

**Endpoint:** `GET /api/app/experiences/restaurant/:restaurantId`

**Opis:** Dohvaća sve Experience-e (recenzije) za određeni restoran.

**Response - Success (200):**
```json
{
  "experiences": [...],
  "stats": {
    "totalExperiences": 45,
    "averageRatings": {
      "food": 8.3,
      "ambience": 7.8,
      "service": 8.1,
      "overall": 8.1
    }
  },
  "pagination": {
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### 10. Like Experience

**Endpoint:** `POST /api/app/experiences/:experienceId/like`

**Response - Success (201):**
```json
{
  "message": "Liked",
  "likesCount": 16
}
```

---

### 11. Unlike Experience

**Endpoint:** `DELETE /api/app/experiences/:experienceId/like`

**Response - Success (200):**
```json
{
  "message": "Unliked",
  "likesCount": 15
}
```

---

### 12. Share Experience

**Endpoint:** `POST /api/app/experiences/:experienceId/share`

**Opis:** Bilježi share za statistiku.

**Response - Success (200):**
```json
{
  "message": "Share tracked",
  "sharesCount": 4
}
```

---

## Experience Statusi

| Status | Opis |
|--------|------|
| `DRAFT` | Experience u izradi, još nije objavljen |
| `PENDING` | Objavljen, čeka da se Visit odobri |
| `APPROVED` | Vidljiv na feedu i profilu |
| `REJECTED` | Odbijen od strane admina |

---

## Visibility Opcije

| Visibility | Opis |
|------------|------|
| `ALL` | Vidljiv svima |
| `FOLLOWERS` | Vidljiv samo korisnicima koji prate autora |
| `BUDDIES` | Vidljiv samo korisnicima koji su tagirani u autorovim Visitima |

---

## Meal Type Opcije

| Meal Type | Emoji | Opis |
|-----------|-------|------|
| `breakfast` | 🍳 | Doručak |
| `brunch` | 🥐 | Brunch |
| `lunch` | 🍝 | Ručak |
| `dinner` | 🍷 | Večera |
| `coffee` | ☕ | Kava/Piće |
| `snack` | 🍿 | Snack |

---

## Database Schema

### Experiences Table

```sql
CREATE TABLE "Experiences" (
  id UUID PRIMARY KEY,
  userId UUID NOT NULL,
  restaurantId UUID,
  visitId UUID,
  status ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED'),
  title VARCHAR(200),
  description TEXT,

  -- Ratings (1.0-10.0)
  foodRating DECIMAL(3,1),
  ambienceRating DECIMAL(3,1),
  serviceRating DECIMAL(3,1),
  overallRating DECIMAL(3,1),

  -- Metadata
  partySize INTEGER DEFAULT 2,
  mealType ENUM('breakfast', 'brunch', 'lunch', 'dinner', 'coffee', 'snack'),
  visibility ENUM('ALL', 'FOLLOWERS', 'BUDDIES') DEFAULT 'ALL',

  -- Engagement
  likesCount INTEGER DEFAULT 0,
  sharesCount INTEGER DEFAULT 0,

  -- Timestamps
  publishedAt TIMESTAMP,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### ExperienceMedia Table

```sql
CREATE TABLE "ExperienceMedia" (
  id UUID PRIMARY KEY,
  experienceId UUID NOT NULL,
  kind ENUM('IMAGE', 'VIDEO'),
  storageKey VARCHAR(500),
  cdnUrl VARCHAR(1000),
  width INTEGER,
  height INTEGER,
  orderIndex INTEGER DEFAULT 0,

  -- Caption
  caption VARCHAR(255),
  menuItemId UUID,

  createdAt TIMESTAMP
);
```

---

## Primjeri Korištenja

### Primjer: Kreiranje Experience-a s Slikama

```javascript
// 1. Kreiraj Experience
const createResponse = await fetch('https://api.dinver.com/api/app/experiences', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Api-Key': API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    visitId: '550e8400-e29b-41d4-a716-446655440000',
    foodRating: 8.5,
    ambienceRating: 7.0,
    serviceRating: 9.0
  })
});

const { experienceId } = await createResponse.json();

// 2. Ažuriraj s detaljima
await fetch(`https://api.dinver.com/api/app/experiences/${experienceId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Api-Key': API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    description: 'Odlična pizza, brza usluga!',
    partySize: 2,
    mealType: 'dinner',
    visibility: 'ALL'
  })
});

// 3. Upload slika
const formData = new FormData();
formData.append('image', imageFile);
formData.append('caption', 'Pizza Margherita');

await fetch(`https://api.dinver.com/api/app/experiences/${experienceId}/media`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Api-Key': API_KEY
  },
  body: formData
});

// 4. Objavi
await fetch(`https://api.dinver.com/api/app/experiences/${experienceId}/publish`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Api-Key': API_KEY
  }
});
```

### Primjer: Dohvat Feeda

```javascript
const response = await fetch(
  'https://api.dinver.com/api/app/experiences/feed?city=Zagreb&limit=10',
  {
    headers: {
      'X-Api-Key': API_KEY
    }
  }
);

const { experiences, pagination } = await response.json();
```

---

## Features

- ✅ Visit-first pristup (Experience se veže na Visit)
- ✅ Ocjene 1.0-10.0 s jednom decimalom
- ✅ Automatski izračun overall ocjene
- ✅ Party size (broj osoba)
- ✅ Meal type filter
- ✅ Visibility opcije (ALL/FOLLOWERS/BUDDIES)
- ✅ Caption za slike ("Što je na slici?")
- ✅ Mapiranje na menu item
- ✅ Kronološki feed
- ✅ Like/Share tracking

---

## Support

Za pitanja ili probleme, kontaktirajte backend tim.
