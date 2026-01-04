# Restaurant Updates API (What's New)

## Overview

Restaurant Updates (ili "What's New") je sustav koji omogucuje vlasnicima restorana da objavljuju kratkorocne novosti koje korisnici mogu vidjeti u posebnom tabu u feedu ili na stranici restorana.

### Sto su Updates?

Updates su kratke objave koje vlasnici restorana kreiraju kako bi obavijestili korisnike o:
- Glazbi uzivo veceras
- Novom proizvodu na meniju
- Posebnoj ponudi (happy hour, popusti)
- Eventima (degustacije, tematske veceri)
- Promjeni radnog vremena
- I slicno...

### Kljucne karakteristike

| Karakteristika | Vrijednost |
|----------------|------------|
| Trajanje | 1, 3, ili 7 dana (vlasnik bira) |
| Rate limit | Max 5 updatea po kalendarskom danu po restoranu |
| Slika | Opcionalno, jedna slika |
| Kategorije | 12 kategorija (za filtriranje) |

### Zivotni ciklus updatea

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   ACTIVE    │───▶│   EXPIRED   │    │   DELETED   │
│  (default)  │    │ (auto/cron) │    │ (soft del)  │
└─────────────┘    └─────────────┘    └─────────────┘
      │                                      ▲
      └──────────────────────────────────────┘
              (vlasnik obrise rucno)
```

- **ACTIVE** - Update je vidljiv u feedu dok ne istekne `expiresAt`
- **EXPIRED** - Automatski postavljeno kad istekne (cron job svaki sat)
- **DELETED** - Vlasnik je rucno obrisao update prije isteka

---

## Kategorije

Updates imaju obaveznu kategoriju koja omogucuje korisnicima filtriranje.

| Key | Label (HR) | Opis |
|-----|------------|------|
| `LIVE_MUSIC` | Glazba uzivo | Koncerti, DJ, bend... |
| `NEW_PRODUCT` | Novi proizvod | Novo jelo ili pice na meniju |
| `NEW_LOCATION` | Nova lokacija | Restoran se preselio ili otvorio novu lokaciju |
| `SPECIAL_OFFER` | Posebna ponuda | Happy hour, popusti, akcije, 2+1... |
| `SEASONAL_MENU` | Sezonski meni | Bozicni meni, ljetna ponuda... |
| `EVENT` | Dogadaj | Degustacije, wine pairing, tematske veceri |
| `EXTENDED_HOURS` | Novo radno vrijeme | Produzeno radno vrijeme za praznike |
| `RESERVATIONS` | Rezervacije otvorene | Za posebne dane (Valentinovo, Nova godina) |
| `CHEFS_SPECIAL` | Chef's special | Jelo dana, tjedni specijal |
| `FAMILY_FRIENDLY` | Za obitelji | Djecji kutak, obiteljska ponuda |
| `REOPENING` | Ponovo otvoreno | Nakon renovacije, sezone... |
| `OTHER` | Ostalo | Za sve ostale novosti koje ne spadaju u gornje kategorije |

---

## API Endpoints

### Public Routes (korisnici aplikacije)

#### 1. Get Updates Feed

Dohvaca sve aktivne updateove sortirane po najnovijima. Koristi se za "What's New" tab u feedu.

```
GET /api/app/updates/feed
```

**Query parametri:**

| Param | Tip | Required | Default | Opis |
|-------|-----|----------|---------|------|
| `lat` | float | Da* | - | Latitude korisnika (za distance filter) |
| `lng` | float | Da* | - | Longitude korisnika |
| `distance` | number/string | Ne | `20` | Udaljenost u km: `10`, `20`, `50`, ili `"all"` |
| `category` | string | Ne | - | Filter po kategoriji (npr. `LIVE_MUSIC`) |
| `limit` | number | Ne | `20` | Broj rezultata po stranici |
| `offset` | number | Ne | `0` | Offset za paginaciju |

*Required samo ako zelite distance filtering

**Response:**

```json
{
  "updates": [
    {
      "id": "uuid",
      "restaurant": {
        "id": "uuid",
        "name": "Restaurant Name",
        "slug": "restaurant-slug",
        "thumbnail": "https://cdn.../thumbnail.jpg"
      },
      "content": "Veceras glazba uzivo od 20h! Svirat ce Jazz Trio.",
      "category": "LIVE_MUSIC",
      "categoryLabel": "Glazba uzivo",
      "durationDays": 1,
      "expiresAt": "2025-01-16T10:00:00.000Z",
      "imageUrl": "https://cdn.../image-medium.jpg",
      "imageUrls": {
        "thumbnail": "https://cdn.../thumb.jpg",
        "medium": "https://cdn.../medium.jpg",
        "fullscreen": "https://cdn.../full.jpg"
      },
      "createdAt": "2025-01-15T10:00:00.000Z",
      "distanceKm": "2.5"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0,
  "categories": {
    "LIVE_MUSIC": "Glazba uzivo",
    "NEW_PRODUCT": "Novi proizvod",
    "NEW_LOCATION": "Nova lokacija",
    "SPECIAL_OFFER": "Posebna ponuda",
    "SEASONAL_MENU": "Sezonski meni",
    "EVENT": "Dogadaj",
    "EXTENDED_HOURS": "Novo radno vrijeme",
    "RESERVATIONS": "Rezervacije otvorene",
    "CHEFS_SPECIAL": "Chef's special",
    "FAMILY_FRIENDLY": "Za obitelji",
    "REOPENING": "Ponovo otvoreno",
    "OTHER": "Ostalo"
  }
}
```

---

#### 2. Get Updates for Restaurant

Dohvaca aktivne updateove za odredeni restoran. Koristi se na restaurant details stranici.

```
GET /api/app/updates/restaurant/:restaurantId
```

**Path parametri:**

| Param | Tip | Opis |
|-------|-----|------|
| `restaurantId` | UUID | ID restorana |

**Query parametri:**

| Param | Tip | Default | Opis |
|-------|-----|---------|------|
| `limit` | number | `10` | Max broj updateova |

**Response:**

```json
{
  "updates": [
    {
      "id": "uuid",
      "content": "Veceras glazba uzivo!",
      "category": "LIVE_MUSIC",
      "categoryLabel": "Glazba uzivo",
      "durationDays": 1,
      "expiresAt": "2025-01-16T10:00:00.000Z",
      "imageUrl": "https://cdn.../image.jpg",
      "imageUrls": { ... },
      "createdAt": "2025-01-15T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

#### 3. Get Categories

Dohvaca sve dostupne kategorije. Koristi se za UI filter.

```
GET /api/app/updates/categories
```

**Response:**

```json
{
  "categories": [
    { "key": "LIVE_MUSIC", "label": "Glazba uzivo" },
    { "key": "NEW_PRODUCT", "label": "Novi proizvod" },
    { "key": "NEW_LOCATION", "label": "Nova lokacija" },
    { "key": "SPECIAL_OFFER", "label": "Posebna ponuda" },
    { "key": "SEASONAL_MENU", "label": "Sezonski meni" },
    { "key": "EVENT", "label": "Dogadaj" },
    { "key": "EXTENDED_HOURS", "label": "Novo radno vrijeme" },
    { "key": "RESERVATIONS", "label": "Rezervacije otvorene" },
    { "key": "CHEFS_SPECIAL", "label": "Chef's special" },
    { "key": "FAMILY_FRIENDLY", "label": "Za obitelji" },
    { "key": "REOPENING", "label": "Ponovo otvoreno" },
    { "key": "OTHER", "label": "Ostalo" }
  ]
}
```

---

#### 4. Get Single Update

Dohvaca detalje pojedinog updatea.

```
GET /api/app/updates/:updateId
```

**Response:**

```json
{
  "id": "uuid",
  "restaurant": {
    "id": "uuid",
    "name": "Restaurant Name",
    "slug": "restaurant-slug",
    "thumbnail": "https://cdn.../thumbnail.jpg"
  },
  "content": "Veceras glazba uzivo od 20h!",
  "category": "LIVE_MUSIC",
  "categoryLabel": "Glazba uzivo",
  "durationDays": 1,
  "expiresAt": "2025-01-16T10:00:00.000Z",
  "imageUrl": "https://cdn.../image.jpg",
  "imageUrls": { ... },
  "status": "ACTIVE",
  "viewCount": 123,
  "createdAt": "2025-01-15T10:00:00.000Z"
}
```

---

#### 5. Record View

Zabiljezava da je korisnik vidio update (za analytics).

```
POST /api/app/updates/:updateId/view
```

**Response:**

```json
{
  "success": true,
  "viewCount": 124
}
```

**Napomena:** Za ulogirane korisnike, view se broji samo jednom. Za anonimne korisnike, svaki poziv broji kao novi view.

---

### Admin Routes (vlasnici restorana)

**Autentikacija:** Sve admin rute zahtijevaju:
- `Authorization: Bearer <token>` header
- `x-api-key` header
- Korisnik mora biti admin restorana

---

#### 1. Create Update

Kreira novi update za restoran.

```
POST /api/app/admin/updates
```

**Body (multipart/form-data):**

| Polje | Tip | Required | Opis |
|-------|-----|----------|------|
| `restaurantId` | UUID | Da | ID restorana |
| `content` | string | Da | Tekst updatea (10-500 znakova) |
| `category` | string | Da | Jedna od kategorija (npr. `LIVE_MUSIC`) |
| `durationDays` | number | Da | Trajanje: `1`, `3`, ili `7` |
| `image` | file | Ne | Slika (max 10MB, JPEG/PNG/WebP) |

**Response (201):**

```json
{
  "id": "uuid",
  "restaurantId": "uuid",
  "content": "Veceras glazba uzivo od 20h!",
  "category": "LIVE_MUSIC",
  "categoryLabel": "Glazba uzivo",
  "durationDays": 1,
  "expiresAt": "2025-01-16T10:00:00.000Z",
  "imageUrl": "https://cdn.../image.jpg",
  "imageUrls": { ... },
  "status": "ACTIVE",
  "createdAt": "2025-01-15T10:00:00.000Z"
}
```

**Errors:**

| Status | Error Code | Opis |
|--------|------------|------|
| 400 | - | Validation error (content too short, invalid category...) |
| 403 | - | Not admin of this restaurant |
| 429 | `RATE_LIMIT_EXCEEDED` | Vec ste objavili 5 updatea danas |

---

#### 2. Get Restaurant Updates (Admin)

Dohvaca sve updateove restorana (ukljucujuci expired i deleted) za admin panel.

```
GET /api/app/admin/updates/:restaurantId
```

**Query parametri:**

| Param | Tip | Default | Opis |
|-------|-----|---------|------|
| `status` | string | - | Filter po statusu: `ACTIVE`, `EXPIRED`, `DELETED` |
| `limit` | number | `20` | Broj rezultata |
| `offset` | number | `0` | Offset za paginaciju |

**Response:**

```json
{
  "updates": [
    {
      "id": "uuid",
      "content": "Veceras glazba uzivo!",
      "category": "LIVE_MUSIC",
      "categoryLabel": "Glazba uzivo",
      "durationDays": 1,
      "expiresAt": "2025-01-16T10:00:00.000Z",
      "imageUrl": "https://cdn.../image.jpg",
      "imageUrls": { ... },
      "status": "ACTIVE",
      "viewCount": 123,
      "createdAt": "2025-01-15T10:00:00.000Z",
      "isExpired": false
    }
  ],
  "total": 15,
  "limit": 20,
  "offset": 0
}
```

---

#### 3. Delete Update

Soft delete updatea (postavlja status na DELETED).

```
DELETE /api/app/admin/updates/:updateId
```

**Response:** `204 No Content`

---

## UI/UX Preporuke

### Feed Tab

Na glavnom feedu, dodajte "What's New" tab koji prikazuje updateove:

```
┌─────────────────────────────────────┐
│  [Experiences]  [What's New]        │  <- Tab bar
├─────────────────────────────────────┤
│  [Filter by category ▼]             │  <- Category filter
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ 🏠 Restaurant Name          │    │
│  │ 🎵 Glazba uzivo             │    │  <- Category badge
│  │                             │    │
│  │ Veceras glazba uzivo od 20h!│    │
│  │ Svirat ce Jazz Trio.        │    │
│  │                             │    │
│  │ [Slika ako postoji]         │    │
│  │                             │    │
│  │ 📍 2.5 km  ⏱ Istice za 5h   │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ ...                         │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### Restaurant Details Page

Na stranici restorana, prikazite aktivne updateove:

```
┌─────────────────────────────────────┐
│  Restaurant Name                    │
│  ⭐ 4.5  📍 Zagreb                   │
├─────────────────────────────────────┤
│  📢 What's New                      │
│  ┌─────────────────────────────┐    │
│  │ 🎵 Glazba uzivo              │   │
│  │ Veceras od 20h!             │    │
│  │ ⏱ Istice za 5h              │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  Menu                               │
│  ...                                │
└─────────────────────────────────────┘
```

### Admin Panel - Create Update

```
┌─────────────────────────────────────┐
│  Novi Update                        │
├─────────────────────────────────────┤
│  Kategorija:                        │
│  [Glazba uzivo ▼]                   │
│                                     │
│  Tekst:                             │
│  ┌─────────────────────────────┐    │
│  │ Veceras glazba uzivo od 20h!│    │
│  │ Svirat ce Jazz Trio.        │    │
│  └─────────────────────────────┘    │
│  10-500 znakova                     │
│                                     │
│  Trajanje:                          │
│  ○ 1 dan  ● 3 dana  ○ 7 dana        │
│                                     │
│  Slika (opcionalno):                │
│  [+ Dodaj sliku]                    │
│                                     │
│  [Objavi Update]                    │
└─────────────────────────────────────┘
```

---

## Error Handling

### Common Errors

| Status | Opis | Rjesenje |
|--------|------|----------|
| 400 | Validation error | Provjerite sve required polja i formate |
| 401 | Unauthorized | Token istekao, refreshajte token |
| 403 | Not admin | Korisnik nije admin restorana |
| 404 | Not found | Update ili restoran ne postoji |
| 429 | Rate limit | Restoran je vec objavio 5 updatea danas |

### Rate Limit Error Example

```json
{
  "error": "Možete objaviti maksimalno 5 updatea dnevno",
  "error_code": "RATE_LIMIT_EXCEEDED",
  "limit": 5,
  "current": 5
}
```

**Napomena o rate limitu:** Limit se resetira svaki dan u ponoć (00:00). To znači da ako objavite update u 23:00, možete objaviti novi u 00:00 idući dan (samo 1 sat kasnije). Limit se ne računa kao "zadnjih 24 sata" nego kao kalendarskih dana.

---

## Cron Job

Svaki sat, cron job automatski oznacava istekle updateove kao EXPIRED:

```
Schedule: 0 * * * * (svaki sat u :00)
File: src/cron/expireUpdates.js
```

Ovo znaci da updateovi mogu ostati vidljivi do 59 minuta nakon sto isteknu (worst case). Za vecinu slucajeva, ovo je prihvatljivo.
