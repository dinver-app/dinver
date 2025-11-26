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
- **Metadata**: Broj osoba, vrsta obroka

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
│ Opis doživljaja: *                                  │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Odlična pizza, brza usluga...                   │ │
│ └─────────────────────────────────────────────────┘ │
│ (min. 20 znakova)                                   │
│                                                     │
│ S koliko osoba? [- 2 +]                            │
│                                                     │
│ Vrsta obroka:                                       │
│ [Doručak] [Brunch] [Ručak]                          │
│ [Večera] [Piće]                                     │
│                                                     │
│ Slike (optional, max 6):                            │
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
| description | string | **Yes** | Tekstualni opis doživljaja (min. 20 znakova) |
| partySize | number | No | Broj osoba (default: 2) |
| mealType | string | No | Vrsta obroka: breakfast, brunch, lunch, dinner, drinks |
| images | file[] | No | Do 6 slika (JPEG, PNG, WEBP, HEIC) |
| captions | string | No | JSON array captions za slike (po indexu) |
| menuItemIds | string | No | JSON array UUID-ova menu itema za slike (po indexu) |
| recommendedImageIndex | number | No | Index slike (0-based) koju korisnik označava kao "Preporučam" |

**Content Validation:**
- **Opis je obavezan** - minimalno 20 znakova
- Slike su opcionalne ali preporučene (do 6 slika)

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
      "imageUrl": "https://cdn.example.com/experiences/user-id/image.jpg",
      "orderIndex": 0,
      "caption": "Pizza Margherita",
      "menuItemId": "uuid-of-menu-item",
      "isRecommended": true
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
        "longitude": 15.982,
        "isClaimed": true
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
  mealType ENUM('breakfast', 'brunch', 'lunch', 'dinner', 'drinks'),

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

## Meal Type Opcije

| Meal Type   | Opis      |
| ----------- | --------- |
| `breakfast` | Doručak   |
| `brunch`    | Brunch    |
| `lunch`     | Ručak     |
| `dinner`    | Večera    |
| `drinks`    | Piće      |

---

## Features

- Visit-first pristup (Experience se veže na Visit)
- Ocjene 1.0-10.0 s jednom decimalom
- Automatski izračun overall ocjene
- Party size (broj osoba)
- Meal type filter
- Caption za slike ("Što je na slici?")
- **Menu item tagging** - povezivanje slike s jelom iz jelovnika
- **"Preporučam" badge** - označavanje jedne slike kao preporučeno jelo
- Distance-based feed filtering (20km, 60km, all)
- Kronološki feed
- Like/Share tracking
- Jedan API poziv za kreiranje sa slikama
- Progress tracking za upload

---

## Menu Item Tagging & "Preporučam" Feature

### Koncept

Korisnik može:
1. **Tagirati jelo** iz jelovnika restorana na slici (umjesto free text captiona)
2. **Označiti jednu sliku** kao "Preporučam" - to jelo će biti istaknuto kao korisnikova preporuka

### UX Flow

```
┌─────────────────────────────────────────────────────┐
│ DODAJ SLIKE                                         │
│                                                     │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                │
│ │  slika  │ │  slika  │ │  slika  │                │
│ │    1    │ │    2    │ │    3    │                │
│ └─────────┘ └─────────┘ └─────────┘                │
│                                                     │
│ Za svaku sliku:                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Što je na slici?                                │ │
│ │ [Piz_________________] ← korisnik tipka         │ │
│ │                                                 │ │
│ │ Prijedlozi iz jelovnika:                        │ │
│ │ ┌─────────────────────────────────────────────┐ │ │
│ │ │ 🍕 Pizza Margherita         12€             │ │ │
│ │ │ 🍕 Pizza Quattro Formaggi   14€             │ │ │
│ │ │ 🍕 Pizza Diavola            13€             │ │ │
│ │ └─────────────────────────────────────────────┘ │ │
│ │                                                 │ │
│ │ [✓] Preporučam ovo jelo                         │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Frontend Implementation

**1. Dohvati Menu Items za Autocomplete**

Kad korisnik odabere Visit za Experience, dohvati menu items:

```
GET /api/app/restaurantDetails/menu/menuItems/{restaurantId}
```

**Response:**
```json
{
  "menuItems": [
    {
      "id": "uuid-pizza-margherita",
      "name": "Pizza Margherita",
      "category": "Pizza",
      "price": 12.00
    },
    {
      "id": "uuid-pizza-quattro",
      "name": "Pizza Quattro Formaggi",
      "category": "Pizza",
      "price": 14.00
    }
  ]
}
```

**2. Autocomplete Logic**

```javascript
// Filtriraj menu items dok korisnik tipka
const filterMenuItems = (query, menuItems) => {
  if (!query || query.length < 2) return [];

  const lowerQuery = query.toLowerCase();
  return menuItems.filter(item =>
    item.name.toLowerCase().includes(lowerQuery)
  );
};

// Kad korisnik odabere iz liste
const onSelectMenuItem = (imageIndex, menuItem) => {
  // Spremi i caption (za prikaz) i menuItemId (za strukturirane podatke)
  setCaptions(prev => ({ ...prev, [imageIndex]: menuItem.name }));
  setMenuItemIds(prev => ({ ...prev, [imageIndex]: menuItem.id }));
};

// Ako korisnik ne odabere iz liste, samo tekst caption
const onCaptionChange = (imageIndex, text) => {
  setCaptions(prev => ({ ...prev, [imageIndex]: text }));
  setMenuItemIds(prev => ({ ...prev, [imageIndex]: null })); // Nema menu item
};
```

**3. "Preporučam" Toggle**

```javascript
// Samo jedna slika može biti recommended
const [recommendedIndex, setRecommendedIndex] = useState(null);

const toggleRecommended = (imageIndex) => {
  if (recommendedIndex === imageIndex) {
    setRecommendedIndex(null); // Ukloni ako je ista
  } else {
    setRecommendedIndex(imageIndex); // Postavi novu
  }
};
```

**4. Slanje na Backend**

```javascript
const createExperience = async (data) => {
  const formData = new FormData();

  // ... ostala polja ...

  // Captions - JSON array
  formData.append('captions', JSON.stringify(
    data.images.map((_, i) => data.captions[i] || null)
  ));

  // Menu Item IDs - JSON array (null ako nije odabrano iz menija)
  formData.append('menuItemIds', JSON.stringify(
    data.images.map((_, i) => data.menuItemIds[i] || null)
  ));

  // Recommended image index (ili ne slati ako nije odabrano)
  if (data.recommendedIndex !== null) {
    formData.append('recommendedImageIndex', data.recommendedIndex.toString());
  }

  // ... images ...
};
```

### Prikaz u Feedu

Kad se Experience prikazuje u feedu, slike s `isRecommended: true` trebaju imati badge:

```
┌─────────────────────────────────────────┐
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │         [SLIKA JELA]           │    │
│  │                                 │    │
│  │  ⭐ PREPORUČAM                  │    │ ← Badge na slici
│  └─────────────────────────────────┘    │
│                                         │
│  Pizza Margherita                       │ ← Caption (klikabilno ako ima menuItemId)
│                                         │
└─────────────────────────────────────────┘
```

### Prednosti Menu Item Tagiranja

| Aspekt | Free Text | Menu Item Tag |
|--------|-----------|---------------|
| Strukturirani podaci | ❌ | ✅ |
| Klikabilno za viewer | ❌ | ✅ (otvara menu item detalje) |
| Analitika popularnosti jela | ❌ | ✅ |
| Pretraživanje po jelu | Teško | Lako |
| Cijena vidljiva | ❌ | ✅ |

---

## Backend Optimizacije

### Paralelni Upload Slika

Slike se uploadaju **paralelno** umjesto sekvencijalno, što značajno ubrzava kreiranje Experiencea:

```
Sekvencijalno: 6 slika × 2s = 12s
Paralelno:     6 slika odjednom = 2-3s
```

### Smart Skip (Izbjegavanje Duple Kompresije)

Frontend šalje pre-komprimirane slike (1800px, 0.85 quality). Backend koristi **EXPERIENCE** upload strategiju koja:

1. Provjerava je li slika već JPEG i ≤ 2000px
2. Ako da → **direktno uploada** bez re-kompresije
3. Ako ne → procesira i komprimira

```
Frontend: 1800px JPEG → Backend: Smart skip → S3: direktan upload
Frontend: 4000px PNG  → Backend: Resize + JPEG → S3: komprimirana slika
```

Ovo sprječava degradaciju kvalitete slike kroz višestruku kompresiju.
