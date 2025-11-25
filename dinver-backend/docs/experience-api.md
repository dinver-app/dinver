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
3. Korisnik klikne "Sada" i ispuni formu
   ↓
┌─────────────────────────────────────────────────────┐
│ EXPERIENCE FORM                                      │
│                                                     │
│ Hrana    [====slider 1-10====] 8.5                 │
│ Ambijent [====slider 1-10====] 7.0                 │
│ Usluga   [====slider 1-10====] 9.0                 │
│                                                     │
│ Overall: 8.2 (automatski izračunat)                │
│                                                     │
│ Opis (optional):                                    │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Odlična pizza, brza usluga...                   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ S koliko osoba? [- 2 +]                            │
│                                                     │
│ Vrsta obroka:                                       │
│ [Doručak] [Brunch] [Ručak]                          │
│ [Večera] [Kava] [Snack]                            │
│                                                     │
│ Tko može vidjeti?                                   │
│ [Svi] [Followeri] [Buddies]                        │
│                                                     │
│ Slike (max 6):                                      │
│ ┌─────┐ ┌─────┐ ┌─────┐                            │
│ │ +   │ │ img │ │ img │                            │
│ └─────┘ └─────┘ └─────┘                            │
│ "Što je na slici?" (optional caption)              │
│                                                     │
│              [Objavi doživljaj]                     │
└─────────────────────────────────────────────────────┘
   ↓
   POST /api/app/experiences (multipart/form-data)
   - sve u jednom pozivu: ocjene, tekst, slike
   ↓
[Success: "Doživljaj objavljen!"]
```

---

## Autentifikacija

Sve rute zahtijevaju:

- **API Key**: `X-Api-Key` header
- **JWT Token**: `Authorization: Bearer {token}` header (osim za feed koji je opcionalan)

---

## API Endpointi

### 1. Kreiraj Experience (sve u jednom pozivu)

**POST** `/api/app/experiences`

Kreira Experience sa svim podacima i slikama u jednom multipart/form-data requestu.

**Headers:**

```
Content-Type: multipart/form-data
X-Api-Key: {api_key}
Authorization: Bearer {token}
```

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| visitId | UUID | Yes | ID Visita za koji se kreira Experience |
| foodRating | number | Yes | Ocjena hrane (1.0-10.0) |
| ambienceRating | number | Yes | Ocjena ambijenta (1.0-10.0) |
| serviceRating | number | Yes | Ocjena usluge (1.0-10.0) |
| description | string | No | Tekstualni opis doživljaja |
| partySize | number | No | Broj osoba (default: 2) |
| mealType | string | No | Vrsta obroka: breakfast, brunch, lunch, dinner, coffee, snack |
| visibility | string | No | Tko može vidjeti: ALL, FOLLOWERS, BUDDIES (default: ALL) |
| images | file[] | No | Do 6 slika (JPEG, PNG, WEBP, HEIC) |
| captions | string | No | JSON array ili comma-separated captions za slike |

**Response (201):**

```json
{
  "experienceId": "uuid",
  "status": "APPROVED",
  "overallRating": 8.2,
  "imagesUploaded": 3,
  "media": [
    {
      "id": "uuid",
      "imageUrl": "https://cdn.example.com/...",
      "thumbnailUrl": "https://cdn.example.com/...",
      "orderIndex": 0,
      "caption": "Pizza Margherita"
    }
  ],
  "message": "Experience published successfully!"
}
```

**Status Logic:**

- Ako je Visit APPROVED -> Experience je odmah APPROVED
- Ako je Visit PENDING -> Experience je PENDING dok se Visit ne approvea

---

### 2. Dohvati Experience Feed

**GET** `/api/app/experiences/feed`

Dohvaća kronološki feed odobrenih Experiencea s distance-based filterom.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| lat | number | Korisnikova latitude |
| lng | number | Korisnikova longitude |
| distance | number/string | Udaljenost u km: 20, 60, ili "all" |
| mealType | string | Filter po vrsti obroka |
| limit | number | Broj rezultata (default: 20) |
| offset | number | Pagination offset |

**Primjer:** `GET /api/app/experiences/feed?lat=45.815&lng=15.982&distance=20&mealType=dinner`

**Response (200):**

```json
{
  "experiences": [
    {
      "id": "uuid",
      "author": {
        "id": "uuid",
        "name": "Ime Korisnika",
        "username": "username",
        "profileImage": "url"
      },
      "restaurant": {
        "id": "uuid",
        "name": "Pizzeria Roma",
        "slug": "pizzeria-roma",
        "place": "Zagreb",
        "thumbnailUrl": "url",
        "latitude": 45.815,
        "longitude": 15.982
      },
      "media": [
        {
          "id": "uuid",
          "cdnUrl": "url",
          "thumbnails": [{ "cdnUrl": "url" }]
        }
      ],
      "foodRating": 8.5,
      "ambienceRating": 7.0,
      "serviceRating": 9.0,
      "overallRating": 8.2,
      "description": "Odlična pizza...",
      "partySize": 2,
      "mealType": "dinner",
      "likesCount": 15,
      "hasLiked": false,
      "distanceKm": 2.5,
      "publishedAt": "2025-11-25T10:00:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "hasMore": true
  },
  "filters": {
    "distance": "20",
    "mealType": null
  }
}
```

---

### 3. Dohvati Experience po ID-u

**GET** `/api/app/experiences/:experienceId`

**Response (200):**

```json
{
  "experience": {
    "id": "uuid",
    "author": { ... },
    "restaurant": { ... },
    "visit": {
      "id": "uuid",
      "status": "APPROVED",
      "visitDate": "2025-11-25"
    },
    "media": [ ... ],
    "foodRating": 8.5,
    "ambienceRating": 7.0,
    "serviceRating": 9.0,
    "overallRating": 8.2,
    "description": "...",
    "partySize": 2,
    "mealType": "dinner",
    "visibility": "ALL",
    "likesCount": 15,
    "sharesCount": 3,
    "hasLiked": false,
    "publishedAt": "2025-11-25T10:00:00Z"
  }
}
```

---

### 4. Dohvati Experiencee korisnika

**GET** `/api/app/experiences/user/:userId`

**Query Parameters:**

- `limit` (default: 20)
- `offset` (default: 0)

---

### 5. Dohvati Experiencee restorana

**GET** `/api/app/experiences/restaurant/:restaurantId`

**Response uključuje:**

- Lista Experiencea
- Statistike (prosjek ocjena)

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
  "pagination": { ... }
}
```

---

### 6. Like Experience

**POST** `/api/app/experiences/:experienceId/like`

**Response (201):**

```json
{
  "message": "Liked",
  "likesCount": 16
}
```

---

### 7. Unlike Experience

**DELETE** `/api/app/experiences/:experienceId/like`

**Response (200):**

```json
{
  "message": "Unliked",
  "likesCount": 15
}
```

---

### 8. Share Experience

**POST** `/api/app/experiences/:experienceId/share`

Evidentira share za statistiku.

**Response (200):**

```json
{
  "message": "Share tracked",
  "sharesCount": 4
}
```

---

### 9. Obriši Experience

**DELETE** `/api/app/experiences/:experienceId`

Korisnik može obrisati vlastiti Experience.

**Response (200):**

```json
{
  "message": "Experience deleted"
}
```

---

## Distance Filter

Feed podržava filtriranje po udaljenosti:

```
GET /api/app/experiences/feed?lat=45.815&lng=15.982&distance=20
```

**Opcije:**

- `distance=20` - Restorani unutar 20km
- `distance=60` - Restorani unutar 60km
- `distance=all` ili bez parametra - Svi restorani

Svaki Experience u responsu ima `distanceKm` polje s udaljenošću od korisnika.

---

## Status Flow

```
     Visit APPROVED?
           │
     ┌─────┴─────┐
     │           │
    YES          NO
     │           │
     ↓           ↓
  APPROVED    PENDING
     │           │
     │     Visit approved
     │           │
     │           ↓
     │       APPROVED
     │           │
     └─────┬─────┘
           │
      (Admin može)
           │
           ↓
       REJECTED
```

- **PENDING**: Experience čeka da se Visit approvea
- **APPROVED**: Experience je vidljiv u feedu
- **REJECTED**: Experience je odbijen (admin odluka)

---

## Database Schema

### Experiences Table

```sql
CREATE TABLE "Experiences" (
  id UUID PRIMARY KEY,
  userId UUID NOT NULL,
  restaurantId UUID,
  visitId UUID NOT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED'),
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
  kind ENUM('IMAGE'),
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

## React Native Implementation Example

### UX Preporuka za Progress

Upload ima dvije faze:

1. **Uploading (0-100%)** - Podaci se šalju na server, korisnik vidi postotak
2. **Processing** - Server obrađuje slike, kratko traje (~1-2 sekunde)

```
[Uploading... 45%]  →  [Uploading... 100%]  →  [Processing...]  →  [Done!]
     ████░░░░░░            ██████████            spinner           ✓
```

Kad `onUploadProgress` dođe do 100%, prebaci UI na "Processing..." s spinnerom dok ne dobiješ response.

### Kod

```javascript
import axios from 'axios';

const createExperience = async ({
  visitId,
  ratings,
  description,
  partySize,
  mealType,
  visibility,
  images, // array of { uri, type, name }
  captions,
  onProgress, // callback za progress (0-100)
}) => {
  const formData = new FormData();

  // Dodaj text polja
  formData.append('visitId', visitId);
  formData.append('foodRating', ratings.food.toString());
  formData.append('ambienceRating', ratings.ambience.toString());
  formData.append('serviceRating', ratings.service.toString());
  formData.append('partySize', partySize.toString());
  formData.append('visibility', visibility);

  if (description) {
    formData.append('description', description);
  }
  if (mealType) {
    formData.append('mealType', mealType);
  }

  // Dodaj captions kao JSON
  if (captions && captions.length > 0) {
    formData.append('captions', JSON.stringify(captions));
  }

  // Dodaj slike
  images.forEach((image, index) => {
    formData.append('images', {
      uri: image.uri,
      type: image.type || 'image/jpeg',
      name: image.name || `image${index}.jpg`,
    });
  });

  // Upload s progress trackingom
  const response = await axios.post(
    `${API_URL}/api/app/experiences`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-Api-Key': API_KEY,
        Authorization: `Bearer ${token}`,
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total,
        );
        // Callback za UI update
        if (onProgress) {
          onProgress(percentCompleted);
        }
      },
    },
  );

  return response.data;
};

// Primjer korištenja u komponenti
const ExperienceForm = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | uploading | processing | done | error

  const handleSubmit = async () => {
    setStatus('uploading');
    setUploadProgress(0);

    try {
      const result = await createExperience({
        visitId: '...',
        ratings: { food: 8.5, ambience: 7.0, service: 9.0 },
        description: 'Odlična pizza!',
        partySize: 2,
        mealType: 'dinner',
        visibility: 'ALL',
        images: selectedImages,
        captions: imageCaptions,
        onProgress: (progress) => {
          setUploadProgress(progress);
          // Kad dođe do 100%, prebaci na processing
          if (progress >= 100) {
            setStatus('processing');
          }
        },
      });

      setStatus('done');
      // Navigate ili show success
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <View>
      {status === 'uploading' && (
        <View>
          <Text>Uploading... {uploadProgress}%</Text>
          <ProgressBar progress={uploadProgress / 100} />
        </View>
      )}
      {status === 'processing' && (
        <View>
          <ActivityIndicator />
          <Text>Processing...</Text>
        </View>
      )}
      <Button
        onPress={handleSubmit}
        title="Objavi"
        disabled={status !== 'idle'}
      />
    </View>
  );
};
```

---

## Visibility Opcije

| Visibility  | Opis                                                           |
| ----------- | -------------------------------------------------------------- |
| `ALL`       | Vidljiv svima                                                  |
| `FOLLOWERS` | Vidljiv samo korisnicima koji prate autora                     |
| `BUDDIES`   | Vidljiv samo korisnicima koji su tagirani u autorovim Visitima |

---

## Meal Type Opcije

| Meal Type   | Opis      |
| ----------- | --------- |
| `breakfast` | Doručak   |
| `brunch`    | Brunch    |
| `lunch`     | Ručak     |
| `dinner`    | Večera    |
| `coffee`    | Kava/Piće |
| `snack`     | Snack     |

---

## Features

- Visit-first pristup (Experience se veže na Visit)
- Ocjene 1.0-10.0 s jednom decimalom
- Automatski izračun overall ocjene
- Party size (broj osoba)
- Meal type filter
- Visibility opcije (ALL/FOLLOWERS/BUDDIES)
- Caption za slike ("Što je na slici?")
- Distance-based feed filtering (20km, 60km, all)
- Kronološki feed
- Like/Share tracking
- Jedan API poziv za kreiranje sa slikama
- Progress tracking za upload
