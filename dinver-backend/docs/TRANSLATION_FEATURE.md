# Translation Feature - App Developer Guide

## Pregled funkcionalnosti

### Što je napravljeno?

Implementirana je **"Prevedi" funkcionalnost** slična onoj na Facebooku i Instagramu. Korisnici mogu vidjeti sadržaj na svom jeziku bez da autori moraju pisati na više jezika.

### Zašto?

- Dinver app je dvojezičan (hrvatski i engleski)
- Korisnici (gosti) pišu **Experience** recenzije na svom jeziku
- Restorani objavljuju **What's New** objave (RestaurantUpdate) na svom jeziku
- Turisti koji koriste app na engleskom trebaju moći pročitati hrvatske objave i obrnuto

### Kako radi?

```
┌─────────────────────────────────────────────────────────────────┐
│  1. KREIRANJE OBJAVE                                            │
│  ────────────────────                                           │
│  Korisnik napiše tekst → Backend automatski detektira jezik     │
│  → Sprema se: content + detectedLanguage ('hr' ili 'en')        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. PRIKAZ U FEEDU                                              │
│  ─────────────────                                              │
│  App dobije objavu s poljem `detectedLanguage`                  │
│                                                                 │
│  Logika za prikaz "Prevedi" buttona:                            │
│  if (detectedLanguage && detectedLanguage !== userLanguage)     │
│     → Prikaži "Prevedi" / "See translation" button              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. KORISNIK KLIKNE "PREVEDI"                                   │
│  ────────────────────────────                                   │
│  App pozove POST /translate endpoint                            │
│  → Backend prevede (ili vrati iz cache-a)                       │
│  → App prikaže prijevod ISPOD originalnog teksta                │
└─────────────────────────────────────────────────────────────────┘
```

### Gdje se koristi?

| Sadržaj                | Model              | Polje za tekst | Endpoint za prijevod                      |
| ---------------------- | ------------------ | -------------- | ----------------------------------------- |
| Experience (recenzije) | `Experience`       | `description`  | `POST /api/app/experiences/:id/translate` |
| What's New objave      | `RestaurantUpdate` | `content`      | `POST /api/app/updates/:id/translate`     |

---

## Promjene u postojećim API odgovorima

### Experience Feed / Single Experience

Novi field u response-u:

```json
{
  "experiences": [
    {
      "id": "uuid-123",
      "description": "Fantastična pizza, osoblje super ljubazno!",
      "detectedLanguage": "hr" // ← NOVO POLJE
      // ... ostala polja
    }
  ]
}
```

### RestaurantUpdate Feed / Single Update

Novi field u response-u:

```json
{
  "updates": [
    {
      "id": "uuid-456",
      "content": "Večeras svirka uživo od 20h!",
      "detectedLanguage": "hr" // ← NOVO POLJE
      // ... ostala polja
    }
  ]
}
```

### Moguće vrijednosti `detectedLanguage`

| Vrijednost | Značenje                                                                |
| ---------- | ----------------------------------------------------------------------- |
| `"hr"`     | Hrvatski (uključuje i srpski/bosanski koji se automatski normaliziraju) |
| `"en"`     | Engleski                                                                |
| `null`     | Detekcija nije uspjela ili tekst prekratak (<10 znakova)                |

---

## Novi API Endpointi

### 1. Translate Experience

Prevodi opis Experience-a na jezik korisnika.

```
POST /api/app/experiences/:experienceId/translate
```

**Headers:**

```
Authorization: Bearer <user_token>
X-API-Key: <app_api_key>
```

**Request Body:** Nije potreban (jezik se uzima iz UserSettings)

**Success Response (200):**

```json
{
  "translatedText": "Fantastic pizza, staff super friendly!",
  "sourceLanguage": "hr",
  "targetLanguage": "en",
  "cached": false
}
```

**Cached Response (200):**

```json
{
  "translatedText": "Fantastic pizza, staff super friendly!",
  "sourceLanguage": "hr",
  "targetLanguage": "en",
  "cached": true
}
```

**Same Language Response (200):**

```json
{
  "translatedText": "Fantastična pizza...",
  "sourceLanguage": "hr",
  "targetLanguage": "hr",
  "cached": false,
  "note": "Same language, no translation needed"
}
```

**Error Responses:**

| Status | Error                            | Kada se vraća                             |
| ------ | -------------------------------- | ----------------------------------------- |
| 404    | `Experience not found`           | Experience s tim ID-om ne postoji         |
| 400    | `No content to translate`        | Experience nema description ili je prazan |
| 401    | `Unauthorized`                   | Korisnik nije ulogiran                    |
| 500    | `Failed to translate experience` | Google Translate API greška               |

---

### 2. Translate Restaurant Update

Prevodi sadržaj What's New objave na jezik korisnika.

```
POST /api/app/updates/:updateId/translate
```

**Headers:**

```
Authorization: Bearer <user_token>
X-API-Key: <app_api_key>
```

**Request Body:** Nije potreban (jezik se uzima iz UserSettings)

**Success Response (200):**

```json
{
  "translatedText": "Live music tonight from 8 PM!",
  "sourceLanguage": "hr",
  "targetLanguage": "en",
  "cached": false
}
```

**Error Responses:**

| Status | Error                        | Kada se vraća                     |
| ------ | ---------------------------- | --------------------------------- |
| 404    | `Update not found`           | Update s tim ID-om ne postoji     |
| 400    | `No content to translate`    | Update nema content ili je prazan |
| 401    | `Unauthorized`               | Korisnik nije ulogiran            |
| 500    | `Failed to translate update` | Google Translate API greška       |

---

## Implementacija u Appu

### 1. Prikaži "Prevedi" button

```typescript
// Dohvati korisnikov jezik iz settings-a
const userLanguage = userSettings.language; // 'hr' ili 'en'

// Za svaki Experience ili Update u feedu
const showTranslateButton = (item) => {
  return item.detectedLanguage && item.detectedLanguage !== userLanguage;
};
```

### 2. UI za "Prevedi" button

```
┌──────────────────────────────────────────┐
│ 👤 Marko Horvat                          │
│ ⭐⭐⭐⭐⭐                                 │
│                                          │
│ Fantastična pizza, osoblje super         │
│ ljubazno! Preporučujem svima.            │
│                                          │
│ 🌐 See translation                       │  ← Prikaži ako detectedLanguage !== userLanguage
│                                          │
│ ❤️ 12  💬 3  📤                          │
└──────────────────────────────────────────┘
```

### 3. Pozovi translate endpoint

```typescript
const translateExperience = async (experienceId: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/app/experiences/${experienceId}/translate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'X-API-Key': APP_API_KEY,
        },
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const data = await response.json();
    return data.translatedText;
  } catch (error) {
    console.error('Translation failed:', error);
    // Prikaži error toast korisniku
    throw error;
  }
};
```

### 4. Prikaži prijevod ispod originala

```
┌──────────────────────────────────────────┐
│ 👤 Marko Horvat                          │
│ ⭐⭐⭐⭐⭐                                 │
│                                          │
│ Fantastična pizza, osoblje super         │
│ ljubazno! Preporučujem svima.            │
│                                          │
│ ─────────────────────────────────        │
│ 🌐 Fantastic pizza, staff super          │  ← Prijevod (drugačiji font/boja)
│    friendly! I recommend to everyone.    │
│                                          │
│ 🔼 Hide translation                      │  ← Toggle za sakriti prijevod
│                                          │
│ ❤️ 12  💬 3  📤                          │
└──────────────────────────────────────────┘
```

### 5. Cachiranje na klijentu

Prijevodi su već cachirani na backendu, ali možeš ih cachirati i lokalno:

```typescript
// Jednostavan in-memory cache
const translationCache = new Map<string, string>();

const getTranslation = async (type: 'experience' | 'update', id: string) => {
  const cacheKey = `${type}:${id}`;

  // Provjeri lokalni cache
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  // Pozovi API
  const endpoint = type === 'experience'
    ? `/api/app/experiences/${id}/translate`
    : `/api/app/updates/${id}/translate`;

  const response = await fetch(endpoint, { method: 'POST', ... });
  const { translatedText } = await response.json();

  // Spremi u lokalni cache
  translationCache.set(cacheKey, translatedText);

  return translatedText;
};
```

---

## Edge Cases i UX savjeti

### 1. Tekst na istom jeziku kao korisnik

Ako je `detectedLanguage` jednak korisnikovom jeziku, **NE prikazuj** "Prevedi" button.

### 2. Nepoznat jezik (`detectedLanguage: null`)

Ako je `detectedLanguage` null:

- Možeš prikazati "Prevedi" button svejedno (API će pretpostaviti suprotni jezik)
- Ili možeš ne prikazivati button (sigurnija opcija)

### 3. Loading state

Dok se čeka prijevod, prikaži loading spinner:

```
┌──────────────────────────────────────────┐
│ Fantastična pizza...                     │
│                                          │
│ ⏳ Translating...                        │
└──────────────────────────────────────────┘
```

### 4. Error handling

Ako prijevod ne uspije:

```
┌──────────────────────────────────────────┐
│ Fantastična pizza...                     │
│                                          │
│ ⚠️ Translation failed. Try again.       │
│    [Retry]                               │
└──────────────────────────────────────────┘
```

### 5. Offline mode

Prijevod zahtijeva internet. Ako je korisnik offline:

- Ne prikazuj "Prevedi" button, ILI
- Prikaži disabled button s tooltipom "Requires internet"

---

## Response Field Reference

### Experience s detectedLanguage

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "...",
  "restaurantId": "...",
  "visitId": "...",
  "status": "APPROVED",
  "description": "Fantastična pizza, osoblje super ljubazno!",
  "detectedLanguage": "hr",
  "foodRating": 4.5,
  "ambienceRating": 4.0,
  "serviceRating": 5.0,
  "overallRating": 4.5,
  "mealType": "dinner",
  "likesCount": 12,
  "sharesCount": 3,
  "publishedAt": "2024-01-08T12:00:00.000Z",
  "createdAt": "2024-01-08T12:00:00.000Z",
  "author": { ... },
  "restaurant": { ... },
  "media": [ ... ],
  "hasLiked": false
}
```

### RestaurantUpdate s detectedLanguage

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "restaurant": {
    "id": "...",
    "name": "Pizzeria Napoli",
    "slug": "pizzeria-napoli"
  },
  "content": "Večeras svirka uživo od 20h! Dođite i uživajte uz odličnu hranu.",
  "detectedLanguage": "hr",
  "category": "LIVE_MUSIC",
  "categoryLabel": "Glazba uživo",
  "durationDays": 1,
  "expiresAt": "2024-01-09T00:00:00.000Z",
  "imageUrl": "https://cdn.dinver.app/...",
  "createdAt": "2024-01-08T10:00:00.000Z"
}
```

### Translate Response

```json
{
  "translatedText": "Live music tonight from 8 PM! Come and enjoy great food.",
  "sourceLanguage": "hr",
  "targetLanguage": "en",
  "cached": true
}
```

---
