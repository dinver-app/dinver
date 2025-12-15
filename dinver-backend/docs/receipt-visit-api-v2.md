# Receipt & Visit API Documentation V2

**Verzija:** 2.0
**Datum:** Siječanj 2025

Dokumentacija za mobilne app rute koje upravljaju računima (receipts) i posjetama restorana (visits).

## Pregled Nove Arhitekture

**Ključne promjene u V2:**

- **Visit-First pristup**: Visit i Receipt se kreiraju zajedno u jednom atomičnom requestu
- **Background OCR**: Claude AI procesira račun u pozadini nakon što korisnik dobije potvrdu
- **Automatski Restaurant Matching**: Sistem automatski pokušava pronaći ili kreirati restoran
- **Admin Manual Linking**: Ako auto-matching ne uspije, admin ručno povezuje restoran (ne korisnik)
- **Bez GPS Filtriranja**: Korisnici mogu reviewati restorane odakle god žele

---

## Autentifikacija

Sve rute zahtijevaju:

- **API Key**: `X-Api-Key` header
- **JWT Token**: `Authorization: Bearer {token}` header

---

## Kompletan User Flow

### Scenarij 1: Automatski Matching (Idealan Flow)

```
1. Korisnik skenira račun
   ↓
2. POST /api/app/visits/upload-receipt
   Body: { receiptImage (multipart/form-data) }
   ↓
3. Backend:
   - Uploaduje sliku u S3 (2000px @ 88% quality)
   - Kreira Visit (status: PENDING, restaurantId: null)
   - Kreira Receipt (povezan s Visitom)
   - Vraća ODMAH uspješan response
   ↓
4. Response: {
     visitId: 789,
     receiptId: 123,
     message: "Račun uspješno poslan na provjeru!"
   }
   ↓
5. U pozadini (korisnik NE čeka):
   - Claude OCR izvlači podatke (OIB, JIR, ZKI, iznos, datum, ime restorana)
   - Automatski Restaurant Matching (3 strategije):
     • Strategija 1: OIB Database Match (100% točnost)
     • Strategija 2: Name + AI Match (80%+ točnost)
     • Strategija 3: Google Places Search + Auto-create (85%+ točnost)
   - Ako pronađe restoran → Automatski povezuje Visit s Restaurantom
   - Visit ostaje PENDING dok admin ne odobri Receipt
   ↓
6. Admin panel:
   - Admin vidi Visit s detaljima iz OCR-a
   - Approve → Visit postaje VISIBLE
   - Reject → Korisnik može ponovo uploadati račun
```

### Scenarij 2: Manual Fallback (Kada Matching Zakaže)

```
1. Pozadinski OCR ne uspije pronaći restoran
   ↓
2. Visit ostaje sa restaurantId: null
   ↓
3. Admin panel:
   - Admin vidi Visit bez povezanog restorana
   - Admin ručno traži i povezuje restoran
   - Approve → Visit postaje VISIBLE
```

---

## API Endpointi

### 1. Upload Računa i Kreiraj Visit

**Endpoint:** `POST /api/app/visits/upload-receipt`

**Opis:** Uploaduje račun, kreira Visit i Receipt u jednoj atomičnoj transakciji, zatim pokreće background OCR za automatsko prepoznavanje restorana.

**Headers:**
```
Authorization: Bearer {token}
X-Api-Key: {api-key}
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**

| Field | Type | Required | Opis |
|-------|------|----------|------|
| `receiptImage` | File | ✅ | Slika računa (JPG, PNG, WEBP, HEIC) |
| `taggedBuddies` | JSON String | ❌ | Array ID-jeva prijatelja (npr. `"[1,2,3]"`) |
| `locationLat` | String | ❌ | GPS latitude (za OCR matching) |
| `locationLng` | String | ❌ | GPS longitude (za OCR matching) |
| `gpsAccuracy` | String | ❌ | GPS točnost u metrima |

**Response - Success (201 Created):**
```json
{
  "visitId": "550e8400-e29b-41d4-a716-446655440000",
  "receiptId": "660e8400-e29b-41d4-a716-446655440001",
  "message": "Račun uspješno poslan na provjeru!"
}
```

**Response - Error:**
```json
// 400 - Missing image
{
  "error": "Receipt image is required"
}

// 400 - Duplicate receipt
{
  "error": "Ovaj račun je već poslan na provjeru"
}

// 400 - Invalid file format
{
  "error": "Nepodržan format slike. Molimo koristite: JPG, PNG, WEBP ili HEIC."
}

// 500 - Upload failed
{
  "error": "Failed to upload receipt image",
  "details": "Error message..."
}
```

**Bitno:**
- Visit se kreira ODMAH s `restaurantId: null` i `status: PENDING`
- Receipt se kreira ODMAH povezan s Visitom
- Response se vraća trenutno (ne čeka OCR)
- Background OCR matchanje se događa nakon responsa
- Ako OCR pronađe restoran → Visit se automatski updatea
- Korisnik vidi Visit u svom feedu dok čeka admin approval

---

### 2. Dohvati Korisnikove Visite

**Endpoint:** `GET /api/app/visits`

**Opis:** Vraća listu svih Visita trenutnog korisnika.

**Headers:**
```
Authorization: Bearer {token}
X-Api-Key: {api-key}
```

**Response - Success (200 OK):**
```json
{
  "visits": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "userId": 1,
      "restaurantId": "660e8400-e29b-41d4-a716-446655440002",
      "receiptImageUrl": "receipts/1/abc123.jpg",
      "status": "APPROVED",
      "wasInMustVisit": true,
      "visitDate": "2025-01-17",
      "submittedAt": "2025-01-17T10:30:00Z",
      "reviewedAt": "2025-01-18T09:00:00Z",
      "taggedBuddies": [2, 3],
      "restaurant": {
        "id": "660e8400-e29b-41d4-a716-446655440002",
        "name": "Pop's Pizza Ljubljana",
        "address": "Trg bana Jelačića 5",
        "place": "Ljubljana",
        "country": "Slovenia",
        "rating": 4.7,
        "thumbnailUrl": "https://cdn.dinver.com/..."
      },
      "receipt": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "imageUrl": "receipts/1/abc123.jpg",
        "status": "approved",
        "totalAmount": 89.5,
        "issueDate": "2025-01-17",
        "oib": "12345678901",
        "jir": "abc-123-def"
      }
    }
  ]
}
```

**Visit Statusi:**
- `PENDING`: Čeka admin approval
- `APPROVED`: Odobren, vidljiv korisniku
- `REJECTED`: Odbijen, korisnik može retake

---

### 3. Dohvati Pojedinačni Visit

**Endpoint:** `GET /api/app/visits/:visitId`

**Opis:** Vraća detalje o pojedinačnom Visitu.

**Headers:**
```
Authorization: Bearer {token}
X-Api-Key: {api-key}
```

**Response - Success (200 OK):**
```json
{
  "visit": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": 1,
    "restaurantId": "660e8400-e29b-41d4-a716-446655440002",
    "receiptImageUrl": "receipts/1/abc123.jpg",
    "status": "PENDING",
    "wasInMustVisit": false,
    "visitDate": null,
    "submittedAt": "2025-01-17T10:30:00Z",
    "reviewedAt": null,
    "experienceDeadline": "2025-01-31T10:30:00Z",
    "taggedBuddies": [],
    "restaurant": {
      "id": "660e8400-e29b-41d4-a716-446655440002",
      "name": "Pop's Pizza Ljubljana",
      "address": "Trg bana Jelačića 5",
      "place": "Ljubljana",
      "rating": 4.7,
      "thumbnailUrl": "https://cdn.dinver.com/..."
    },
    "receipt": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "imageUrl": "receipts/1/abc123.jpg",
      "status": "pending",
      "oib": "12345678901",
      "totalAmount": 89.5,
      "issueDate": "2025-01-17"
    },
    "experience": null
  }
}
```

**Response - Error:**
```json
// 404 - Visit not found
{
  "error": "Visit not found"
}

// 403 - Unauthorized
{
  "error": "Unauthorized"
}
```

---

### 4. Retake Računa (Za Rejected Visite)

**Endpoint:** `PUT /api/app/visits/:visitId/retake`

**Opis:** Omogućava korisniku da ponovo uploada račun za Visit koji je odbijen.

**Headers:**
```
Authorization: Bearer {token}
X-Api-Key: {api-key}
Content-Type: multipart/form-data
```

**Request Body:**

| Field | Type | Required | Opis |
|-------|------|----------|------|
| `receiptImage` | File | ✅ | Nova slika računa |

**Uvjeti:**
- Visit mora biti u statusu `REJECTED`
- Mora biti unutar 48 sati od `retakeDeadline`

**Response - Success (200 OK):**
```json
{
  "message": "Receipt retake submitted successfully",
  "visit": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "PENDING",
    "receiptImageUrl": "receipts/1/new-receipt.jpg",
    "retakeDeadline": null
  }
}
```

**Response - Error:**
```json
// 400 - Visit not rejected
{
  "error": "Only rejected visits can be retaken"
}

// 400 - Deadline passed
{
  "error": "Retake deadline has passed"
}

// 400 - No image
{
  "error": "Receipt image is required"
}
```

---

### 5. Provjeri Je Li Korisnik Posjetio Restoran

**Endpoint:** `GET /api/app/visits/restaurant/:restaurantId/check`

**Opis:** Provjerava je li korisnik već posjetio određeni restoran (ima APPROVED Visit).

**Headers:**
```
Authorization: Bearer {token}
X-Api-Key: {api-key}
```

**Response - Success (200 OK):**
```json
// Ako JE posjetio
{
  "hasVisited": true,
  "visitId": "550e8400-e29b-41d4-a716-446655440000"
}

// Ako NIJE posjetio
{
  "hasVisited": false,
  "visitId": null
}
```

---

### 6. Obriši Visit

**Endpoint:** `DELETE /api/app/visits/:visitId`

**Opis:** Briše Visit (samo unutar 14 dana od kreiranja).

**Headers:**
```
Authorization: Bearer {token}
X-Api-Key: {api-key}
```

**Pravila:**
- Samo unutar 14 dana od `submittedAt`
- Hard delete (trajno brisanje)
- Briše Visit i povezani Receipt

**Response - Success (200 OK):**
```json
{
  "message": "Visit deleted successfully"
}
```

**Response - Error:**
```json
// 400 - Deadline passed
{
  "error": "Visits can only be deleted within 14 days of creation"
}

// 404 - Not found
{
  "error": "Visit not found"
}

// 403 - Unauthorized
{
  "error": "Unauthorized"
}
```

---

### 7. Dohvati Korisnikove Buddies

**Endpoint:** `GET /api/app/users/buddies`

**Opis:** Vraća listu korisnika koje je trenutni korisnik tagirao u prethodnim Visitima (za auto-complete u formi).

**Headers:**
```
Authorization: Bearer {token}
X-Api-Key: {api-key}
```

**Response - Success (200 OK):**
```json
{
  "buddies": [
    {
      "id": 2,
      "name": "Marko Marković",
      "username": "marko",
      "profileImage": "https://cdn.dinver.com/..."
    },
    {
      "id": 3,
      "name": "Ana Anić",
      "username": "ana",
      "profileImage": null
    }
  ]
}
```

---

## Background OCR Restaurant Matching

Kada korisnik uploada račun, backend automatski pokreće Claude AI OCR koji pokušava pronaći ili kreirati restoran u 3 koraka:

### Strategija 1: OIB Database Match

**Što radi:**
- Claude OCR izvlači OIB s računa
- Pretražuje bazu: `Restaurant.findOne({ oib: extractedOib })`
- Ako pronađe → MATCH! (100% sigurnost)

**Primjer:**
```
OCR izvlači: "OIB: 12345678901"
   ↓
SELECT * FROM Restaurants WHERE oib = '12345678901'
   ↓
Pronađen: "Pop's Pizza Ljubljana"
   ↓
UPDATE Visits SET restaurantId = '...' WHERE id = '...'
```

**Prednosti:**
- Najbrži (simple DB lookup)
- 100% točnost
- Radi samo za Hrvatsku (OIB)

---

### Strategija 2: Name + AI Fuzzy Match

**Što radi:**
- Claude OCR izvlači ime restorana s računa
- Pretražuje bazu: `Restaurant.findAll({ name ILIKE '%merchantName%' })`
- Normalizira dijakritike: `"Čingi"` → `"cingi"`
- Ako ima više rezultata → Claude AI uspoređuje podatke s računa
- Ako Claude sigurnost ≥ 80% → MATCH!

**Primjer:**
```
OCR izvlači: "CINGI LINGI CARDA"
   ↓
Normalizacija: "cingi lingi carda"
   ↓
SELECT * FROM Restaurants
WHERE LOWER(UNACCENT(name)) LIKE '%cingi lingi carda%'
   ↓
Pronađeno 2 rezultata:
  1. "Restoran Čingi Lingi Čarda" (Zagreb)
  2. "CINGI LINGI - Zadar" (Zadar)
   ↓
Claude AI uspoređuje:
  - OCR Address: "Ulica 123, Zagreb"
  - DB Address #1: "Ulica 123, Zagreb" → MATCH! (95% confidence)
   ↓
UPDATE Visits SET restaurantId = '...' WHERE id = '...'
```

**Prednosti:**
- Brzo (DB pretraga + AI)
- 80%+ točnost
- Radi bez dijakritika
- Globalno

---

### Strategija 3: Google Places Search + Auto-Create

**Što radi:**
- Claude OCR izvlači ime i adresu restorana
- Google Places Text Search: `"{merchantName} {merchantAddress}"`
- Claude AI uspoređuje podatke s računa s Google rezultatima
- Ako Claude sigurnost ≥ 85% → Dohvati Place Details → Auto-kreiraj Restaurant

**Primjer:**
```
OCR izvlači:
  - Name: "Pop's Pizza"
  - Address: "Trg bana Jelačića 5, Ljubljana"
   ↓
Google Places Text Search:
  "Pop's Pizza Trg bana Jelačića 5, Ljubljana"
   ↓
Google vraća:
  - Name: "Pop's Pizza Ljubljana"
  - Address: "Trg bana Jelačića 5, Ljubljana"
  - placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4"
  - Rating: 4.7
   ↓
Claude AI uspoređuje: 95% confidence → MATCH!
   ↓
Dohvati Place Details (telefon, website, radno vrijeme...)
   ↓
Provjeri duplikat: SELECT * FROM Restaurants WHERE placeId = '...'
   ↓
Ako NE postoji → CREATE Restaurant (auto-kreiranje!)
   ↓
UPDATE Visits SET restaurantId = '...' WHERE id = '...'
```

**Prednosti:**
- Automatski popunjava bazu s novim restoranima
- Globalno (sve što je na Google Places)
- 85%+ točnost (viši prag za auto-kreiranje)

**Troškovi:**
- Google Places Text Search: ~$0.017 po requestu
- Google Places Details: ~$0.017 po requestu
- **Ukupno:** ~$0.034 po novom restoranu

---

### Strategija 4: Manual Fallback

Ako nijedna automatska strategija ne uspije:

1. Visit ostaje sa `restaurantId: null`
2. Admin vidi Visit u panelu s OCR podacima
3. Admin ručno traži i povezuje restoran
4. Approve → Visit postaje VISIBLE

---

## Image Processing

### Upload Strategy: QUICK

Za receiptove koristi se `UPLOAD_STRATEGY.QUICK`:

```javascript
{
  strategy: 'quick',
  maxWidth: 2000,     // Veća slika za OCR točnost
  quality: 88,        // Viši quality za text recognition
  mimeType: 'image/jpeg'
}
```

**Što se događa:**
1. Validacija slike (format, veličina)
2. HEIC → JPEG konverzija (ako je potrebno)
3. Resize na 2000px širine (ako je veće)
4. Optimizacija (quality 88%)
5. Upload na S3: `receipts/{userId}/{uuid}.jpg`

**Prednosti:**
- Brzi upload (jedna varijanta)
- Dovoljno velika slika za OCR točnost
- Optimizirano za prostor

---

## CDN URLs

Slike se serviraju preko CloudFront CDN-a sa signed URLovima.

**Format:**
```
https://cdn.dinver.com/receipts/1/abc123.jpg?Expires=...&Signature=...
```

**Napomena za Receipts folder:**
- Receipts NE koriste `-medium`, `-thumbnail` sufixe
- Jedna slika = jedan URL
- CloudFront automatski cachea (1 godina)

---

## Database Schema (Ključni dijelovi)

### Visits Table

```sql
CREATE TABLE "Visits" (
  id UUID PRIMARY KEY,
  userId INTEGER NOT NULL,
  restaurantId UUID NULL,  -- NULL dok OCR ne pronađe
  receiptImageUrl TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED
  wasInMustVisit BOOLEAN DEFAULT FALSE,
  visitDate DATE NULL,  -- NULL dok nije APPROVED
  submittedAt TIMESTAMP NOT NULL,
  reviewedAt TIMESTAMP NULL,
  retakeDeadline TIMESTAMP NULL,  -- Za REJECTED status
  experienceDeadline TIMESTAMP NULL,  -- 14 dana od APPROVED
  taggedBuddies INTEGER[] DEFAULT '{}',
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

### Receipts Table

```sql
CREATE TABLE "Receipts" (
  id UUID PRIMARY KEY,
  userId INTEGER NOT NULL,
  visitId UUID NOT NULL,  -- ODMAH povezan s Visitom
  restaurantId UUID NULL,  -- NULL dok OCR ne pronađe
  imageUrl TEXT NOT NULL,
  imageHash VARCHAR(32) NOT NULL UNIQUE,
  locationLat DECIMAL(10, 8) NULL,
  locationLng DECIMAL(11, 8) NULL,
  gpsAccuracy DECIMAL(10, 2) NULL,
  status VARCHAR(50) DEFAULT 'pending',  -- pending, approved, rejected
  ocrMethod VARCHAR(50) DEFAULT 'claude',
  ocrExtractedData JSONB NULL,
  ocrAttempts INTEGER DEFAULT 0,
  ocrCompletedAt TIMESTAMP NULL,
  totalAmount DECIMAL(10, 2) NULL,
  issueDate DATE NULL,
  issueTime TIME NULL,
  oib VARCHAR(11) NULL,
  jir VARCHAR(255) NULL,
  zki VARCHAR(255) NULL,
  merchantName VARCHAR(255) NULL,
  merchantAddress TEXT NULL,
  submittedAt TIMESTAMP NOT NULL,
  modelVersion VARCHAR(50) DEFAULT 'claude-3.5-sonnet',
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

---

## Error Handling

### Transakcije

Visit i Receipt se kreiraju u **atomičnoj transakciji**:

```javascript
const transaction = await sequelize.transaction();

try {
  // 1. Upload sliku
  const imageUrl = await uploadImage(...);

  // 2. Kreiraj Visit
  const visit = await Visit.create({...}, { transaction });

  // 3. Kreiraj Receipt (povezan s Visitom)
  const receipt = await Receipt.create({
    visitId: visit.id,
    ...
  }, { transaction });

  // 4. Commit
  await transaction.commit();

  // 5. Return success
  return { visitId, receiptId };

  // 6. Background OCR (ne blokira response)
  processFullOcrInBackground(receipt.id, imageBuffer);

} catch (error) {
  await transaction.rollback();
  throw error;
}
```

**Prednosti:**
- Visit i Receipt se kreiraju zajedno ili nikako
- Rollback ako bilo što zakaže
- Response se vraća odmah (brzo)

---

## Status Flow Dijagram

```
┌─────────────────────────────────────────────────────────┐
│                   KORISNIK UPLOADA RAČUN                 │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
      ┌───────────────────────────────┐
      │ POST /visits/upload-receipt   │
      └───────────────┬───────────────┘
                      │
                      ▼
      ┌───────────────────────────────┐
      │ Visit (PENDING, restaurantId: null) │
      │ Receipt (pending, linked to Visit)  │
      └───────────────┬───────────────┘
                      │
                      ├─────────────► Response 201 (korisnik dobije potvrdu)
                      │
                      ▼
      ┌───────────────────────────────┐
      │   Background OCR Processing   │
      │ (Claude izvlači podatke)      │
      └───────────────┬───────────────┘
                      │
                      ├─────────► OIB Match? ──► Restaurant Found
                      │                              │
                      ├─────────► Name Match? ──► Restaurant Found
                      │                              │
                      ├─────────► Google Match? ─► Create Restaurant
                      │                              │
                      └─────────► No Match ──────► restaurantId: null


      ┌───────────────────────────────┐
      │      ADMIN PANEL REVIEW        │
      └───────────────┬───────────────┘
                      │
            ┌─────────┴─────────┐
            │                   │
            ▼                   ▼
    ┌─────────────┐     ┌─────────────┐
    │   APPROVE   │     │   REJECT    │
    └──────┬──────┘     └──────┬──────┘
           │                   │
           ▼                   ▼
    Visit: APPROVED     Visit: REJECTED
    Receipt: approved   Receipt: rejected
    visitDate: SET      retakeDeadline: +48h
           │                   │
           │                   └────► Retake? ──► PENDING (opet)
           │
           ▼
    Vidljivo korisniku
    Experience deadline: +14 dana
```

---

## Migration Notes

**Breaking Change:** Visit.restaurantId je sada NULLABLE

```sql
-- Migration: 20251123175911-make-restaurantId-nullable-in-visits.js
ALTER TABLE "Visits" ALTER COLUMN "restaurantId" DROP NOT NULL;
```

**Razlog:** Visit se kreira BEZ poznatog restorana, OCR ga pronalazi u pozadini.

**Rollback plan:** Migracija prvo briše sve postojeće Visite (breaking change).

---

## Logging i Debugging

Background OCR proces ispisuje detaljne logove:

```
┌─ STEP 1: OCR Extraction ─────────────────────────────┐
│ Running Claude AI OCR on receipt image...
│ ✅ OCR completed in 2341ms
│
│ Extracted Data:
│   • OIB: 12345678901
│   • JIR: abc-123-def
│   • ZKI: xyz789
│   • Total Amount: 89.50 EUR
│   • Issue Date: 2025-01-17
│   • Issue Time: 14:30:00
│   • Merchant Name: Pop's Pizza
│   • Merchant Address: Trg bana Jelačića 5, Ljubljana
└───────────────────────────────────────────────────────┘

┌─ STEP 2: Restaurant Matching ────────────────────────┐
│
│ 🔍 Strategy 1: OIB Database Match
│    Searching for OIB: 12345678901...
│    ❌ FAILED: No restaurant with this OIB in database
│
│ 🔍 Strategy 2: Name-based Database Search
│    Searching for name: "Pop's Pizza"...
│    Normalized search: "pops pizza"
│    No exact match, trying fuzzy match...
│    Found 0 candidates
│    ❌ FAILED: No restaurants found with similar name
│
│ 🔍 Strategy 3: Google Places Search (Fallback)
│    Query: "Pop's Pizza Trg bana Jelačića 5, Ljubljana"
│    Searching Google Places API...
│    Google found 1 place(s)
│    Creating new restaurant from Google Places...
│    ✅ SUCCESS! Created new restaurant from Google
│       Restaurant: Pop's Pizza Ljubljana
│       ID: 660e8400-e29b-41d4-a716-446655440002
│       Place ID: ChIJN1t_tDeuEmsRUsoyG83frY4
│       Confidence: 85% (Google Places)
│
└───────────────────────────────────────────────────────┘

┌─ STEP 3: Update Receipt ─────────────────────────────┐
│ ✅ Receipt updated with OCR data
└───────────────────────────────────────────────────────┘

┌─ STEP 4: Update Visit ───────────────────────────────┐
│ ✅ Visit linked to restaurant: Pop's Pizza Ljubljana
└───────────────────────────────────────────────────────┘

╔════════════════════════════════════════════════════════╗
║                    ✅ SUCCESS                          ║
║    Total Duration: 3456ms                              ║
║    Match Method: GOOGLE_PLACES                         ║
║    Restaurant: Pop's Pizza Ljubljana                   ║
╚════════════════════════════════════════════════════════╝
```

**Korisni logovi za debugging:**
- Svaki korak OCR procesa ispisuje rezultat
- Confidence score za AI matchanje
- Razlog zašto strategija nije uspjela
- Vrijeme izvršavanja svakog koraka

---

## Napomene

1. **Background Processing**: OCR se izvršava u pozadini, korisnik ne čeka
2. **Duplicate Prevention**: MD5 hash slike sprečava duplikate
3. **HEIC Conversion**: Automatska konverzija HEIC → JPEG
4. **Diacritic Normalization**: Pretraga ignoriše kvačice (č→c, ć→c, š→s, ž→z, đ→d)
5. **Auto Restaurant Creation**: Google Places automatski popunjava bazu
6. **Admin Manual Linking**: Ako OCR zakaže, admin ručno povezuje restoran
7. **Retake Window**: 48 sati za retake odbijenih računa
8. **Delete Window**: 14 dana za brisanje Visita

---

## Primjeri Korištenja

### Primjer 1: Upload Računa

```javascript
const formData = new FormData();
formData.append('receiptImage', imageFile);
formData.append('taggedBuddies', JSON.stringify([2, 3]));
formData.append('locationLat', '45.815000');
formData.append('locationLng', '15.982000');

const response = await fetch('https://api.dinver.com/api/app/visits/upload-receipt', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Api-Key': API_KEY
  },
  body: formData
});

const data = await response.json();
// { visitId: "...", receiptId: "...", message: "..." }
```

### Primjer 2: Dohvat Visita

```javascript
const response = await fetch('https://api.dinver.com/api/app/visits', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Api-Key': API_KEY
  }
});

const data = await response.json();
// { visits: [...] }
```

---

## Changelog

### V2.0 (Siječanj 2025)
- ✅ Visit-First pristup (Visit + Receipt kreiraju se zajedno)
- ✅ Background OCR s Claude AI
- ✅ Automatski Restaurant Matching (3 strategije)
- ✅ Google Places Auto-Create
- ✅ Diacritic Normalization
- ✅ Pojednostavljeni Receipt Image Processing (jedna varijanta)
- ✅ Uklonjeni GPS filtri
- ✅ Admin manual linking (umjesto korisničke pretrage)
- ✅ Dodana buddies lista

### V1.0 (Legacy)
- Receipt-First pristup
- Sync OCR (korisnik čeka)
- Manual restaurant linking
- Multiple image variants
- GPS filtering

---

## Support

Za pitanja ili probleme, kontaktirajte backend tim.
