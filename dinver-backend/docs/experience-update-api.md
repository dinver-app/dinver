# Experience Update API

## Pregled

Experience Update API omogucuje korisnicima uredivanje objavljenih iskustava (experiences) na ogranicen nacin - slicno Instagramu.

### Filozofija

Jednom kada korisnik objavi iskustvo, **slike i ocjene su "zapisane u kamen"**. Ne mogu se mijenjati jer predstavljaju autenticni trenutak posjeta restoranu. Ako je korisnik pogrijesio s ocjenama ili slikama, treba obrisati iskustvo i kreirati novo.

Ono sto se **moze** mijenjati su tekstualni elementi i metadata - opis, vrsta obroka, opisi slika, redoslijed slika i oznaka omiljene slike.

---

## Sto se moze mijenjati

| Polje | Opis |
|-------|------|
| `description` | Tekstualni opis iskustva (min 20 karaktera) |
| `mealType` | Vrsta obroka (breakfast, brunch, lunch, dinner, sweet, drinks) |
| `caption` | Tekst/opis za svaku pojedinacnu sliku |
| `menuItemId` | Povezivanje slike s jelom iz menija restorana |
| `isRecommended` | Oznaka "preporucujem" za jednu sliku |
| `orderIndex` | Redoslijed slika u galeriji (reorder) |

## Sto se NE moze mijenjati

| Polje | Razlog |
|-------|--------|
| `foodRating` | Ocjena hrane je fiksna - autenticni dojam |
| `ambienceRating` | Ocjena ambienta je fiksna |
| `serviceRating` | Ocjena usluge je fiksna |
| Dodavanje slika | Slike su dio originalnog iskustva |
| Brisanje slika | Slike su dio originalnog iskustva |

---

## API Endpoint

```
PUT /api/app/experiences/:experienceId
```

### Headers

```
Authorization: Bearer <accessToken>
Content-Type: application/json
X-API-Key: <apiKey>
```

---

## Request Body

```json
{
  "description": "Azurirani opis iskustva. Moramo imati barem 20 karaktera.",
  "mealType": "dinner",
  "mediaUpdates": [
    {
      "mediaId": "550e8400-e29b-41d4-a716-446655440001",
      "orderIndex": 0,
      "caption": "Predjelo - carpaccio od tune",
      "menuItemId": "660e8400-e29b-41d4-a716-446655440099",
      "isRecommended": true
    },
    {
      "mediaId": "550e8400-e29b-41d4-a716-446655440002",
      "orderIndex": 1,
      "caption": "Glavno jelo - riba na zaru",
      "menuItemId": null,
      "isRecommended": false
    },
    {
      "mediaId": "550e8400-e29b-41d4-a716-446655440003",
      "orderIndex": 2,
      "caption": null,
      "menuItemId": null,
      "isRecommended": false
    }
  ]
}
```

### Polja u Request Body

| Polje | Tip | Obavezno | Opis |
|-------|-----|----------|------|
| `description` | string | Ne* | Novi opis iskustva (min 20 karaktera). *Ako se salje, mora imati min 20 char |
| `mealType` | string \| null | Ne | Vrsta obroka. Moze biti: `breakfast`, `brunch`, `lunch`, `dinner`, `sweet`, `drinks`, ili `null` |
| `mediaUpdates` | array | Ne | Niz objekata za azuriranje metapodataka slika |

### Polja u mediaUpdates objektu

| Polje | Tip | Obavezno | Opis |
|-------|-----|----------|------|
| `mediaId` | UUID | Da | ID slike koja se azurira (mora pripadati ovom experience-u) |
| `orderIndex` | number | Ne | Nova pozicija slike (0-based). Za reorder slika |
| `caption` | string \| null | Ne | Tekst/opis slike (max 255 karaktera) |
| `menuItemId` | UUID \| null | Ne | ID jela iz menija restorana koje je na slici |
| `isRecommended` | boolean | Ne | Da li je ovo slika koju korisnik preporucuje. **Samo jedna slika moze biti recommended!** |

---

## Response

### Uspjesan response (200 OK)

```json
{
  "experienceId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Experience updated successfully!",
  "updated": {
    "description": true,
    "mealType": true,
    "mediaCount": 3
  },
  "experience": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "description": "Azurirani opis iskustva...",
    "mealType": "dinner",
    "detectedLanguage": "hr",
    "media": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "storageKey": "experiences/user123/image1.jpg",
        "cdnUrl": "https://cdn.dinver.eu/...",
        "orderIndex": 0,
        "caption": "Predjelo - carpaccio od tune",
        "menuItemId": "660e8400-e29b-41d4-a716-446655440099",
        "isRecommended": true
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "storageKey": "experiences/user123/image2.jpg",
        "cdnUrl": "https://cdn.dinver.eu/...",
        "orderIndex": 1,
        "caption": "Glavno jelo - riba na zaru",
        "menuItemId": null,
        "isRecommended": false
      }
    ]
  }
}
```

### Response polja

| Polje | Opis |
|-------|------|
| `experienceId` | UUID azuriranog iskustva |
| `message` | Poruka o uspjehu |
| `updated.description` | Da li je description azuriran |
| `updated.mealType` | Da li je mealType azuriran |
| `updated.mediaCount` | Broj azuriranih media zapisa |
| `experience` | Azurirani podaci iskustva s transformiranim URL-ovima |

---

## Error Responses

### 404 Not Found - Iskustvo ne postoji ili nije vlasnik

```json
{
  "error": "Experience not found"
}
```

### 400 Bad Request - Rejected iskustvo

```json
{
  "error": "Cannot edit rejected experience"
}
```

### 400 Bad Request - Prekratak opis

```json
{
  "error": "Description is required (minimum 20 characters)",
  "details": {
    "descriptionLength": 15,
    "minDescriptionLength": 20
  }
}
```

### 400 Bad Request - Nevalidan mealType

```json
{
  "error": "Invalid meal type. Must be one of: breakfast, brunch, lunch, dinner, sweet, drinks"
}
```

### 400 Bad Request - Vise od jedne recommended slike

```json
{
  "error": "Only one image can be marked as recommended"
}
```

### 400 Bad Request - MediaId ne pripada iskustvu

```json
{
  "error": "Media 550e8400-e29b-41d4-a716-446655440099 does not belong to this experience"
}
```

### 500 Internal Server Error

```json
{
  "error": "Failed to update experience",
  "details": "Error message..."
}
```

---

## Primjeri koristenja (React Native)

### 1. Azuriranje samo opisa

```typescript
const updateExperienceDescription = async (experienceId: string, newDescription: string) => {
  const response = await fetch(`${API_URL}/api/app/experiences/${experienceId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      description: newDescription,
    }),
  });

  return response.json();
};
```

### 2. Promjena vrste obroka

```typescript
const updateMealType = async (experienceId: string, mealType: string | null) => {
  const response = await fetch(`${API_URL}/api/app/experiences/${experienceId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      mealType: mealType, // 'breakfast' | 'brunch' | 'lunch' | 'dinner' | 'sweet' | 'drinks' | null
    }),
  });

  return response.json();
};
```

### 3. Reorder slika (promjena redoslijeda)

```typescript
const reorderMedia = async (experienceId: string, mediaItems: Array<{id: string}>) => {
  // mediaItems je niz u novom redoslijedu
  const mediaUpdates = mediaItems.map((item, index) => ({
    mediaId: item.id,
    orderIndex: index,
  }));

  const response = await fetch(`${API_URL}/api/app/experiences/${experienceId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      mediaUpdates,
    }),
  });

  return response.json();
};
```

### 4. Azuriranje caption-a i oznacavanje recommended slike

```typescript
const updateMediaDetails = async (
  experienceId: string,
  mediaId: string,
  caption: string,
  isRecommended: boolean
) => {
  const response = await fetch(`${API_URL}/api/app/experiences/${experienceId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      mediaUpdates: [
        {
          mediaId,
          caption,
          isRecommended,
        },
      ],
    }),
  });

  return response.json();
};
```

### 5. Kompletni update - sve odjednom

```typescript
interface MediaUpdate {
  mediaId: string;
  orderIndex?: number;
  caption?: string | null;
  menuItemId?: string | null;
  isRecommended?: boolean;
}

interface UpdateExperienceData {
  description?: string;
  mealType?: 'breakfast' | 'brunch' | 'lunch' | 'dinner' | 'sweet' | 'drinks' | null;
  mediaUpdates?: MediaUpdate[];
}

const updateExperience = async (experienceId: string, data: UpdateExperienceData) => {
  const response = await fetch(`${API_URL}/api/app/experiences/${experienceId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update experience');
  }

  return response.json();
};

// Primjer poziva
await updateExperience('experience-uuid', {
  description: 'Novi opis s minimalno 20 karaktera...',
  mealType: 'dinner',
  mediaUpdates: [
    { mediaId: 'media-1', orderIndex: 0, caption: 'Predjelo', isRecommended: true },
    { mediaId: 'media-2', orderIndex: 1, caption: 'Glavno jelo', isRecommended: false },
    { mediaId: 'media-3', orderIndex: 2, caption: null, isRecommended: false },
  ],
});
```

---

## Vazne napomene

1. **Samo vlasnik moze editirati** - API provjerava da li je ulogirani korisnik vlasnik iskustva

2. **REJECTED iskustva se ne mogu editirati** - Ako je iskustvo odbijeno, korisnik ga mora obrisati i kreirati novo

3. **Language detection** - Kada se promijeni description, sustav automatski ponovo detektira jezik teksta

4. **Cache invalidation** - Kada se promijeni description, brise se cached prijevod (ako postoji)

5. **Samo jedna recommended slika** - API ce vratiti gresku ako pokusate oznaciti vise od jedne slike kao recommended

6. **MediaId validacija** - Svi mediaId-ovi u mediaUpdates moraju pripadati tom experience-u

7. **Parcijalni update** - Mozete slati samo polja koja zelite azurirati. Npr. samo `description`, ili samo `mediaUpdates`

---

## TypeScript Types

```typescript
// Request types
interface UpdateExperienceRequest {
  description?: string;
  mealType?: 'breakfast' | 'brunch' | 'lunch' | 'dinner' | 'sweet' | 'drinks' | null;
  mediaUpdates?: MediaUpdateItem[];
}

interface MediaUpdateItem {
  mediaId: string;
  orderIndex?: number;
  caption?: string | null;
  menuItemId?: string | null;
  isRecommended?: boolean;
}

// Response types
interface UpdateExperienceResponse {
  experienceId: string;
  message: string;
  updated: {
    description: boolean;
    mealType: boolean;
    mediaCount: number;
  };
  experience: {
    id: string;
    description: string | null;
    mealType: string | null;
    detectedLanguage: string | null;
    media: ExperienceMediaItem[];
  };
}

interface ExperienceMediaItem {
  id: string;
  storageKey: string;
  cdnUrl: string;
  orderIndex: number;
  caption: string | null;
  menuItemId: string | null;
  isRecommended: boolean;
}

// Error response
interface ErrorResponse {
  error: string;
  details?: Record<string, unknown>;
}
```
