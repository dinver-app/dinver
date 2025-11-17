# Kreiranje Visita - Dokumentacija za Frontend

## 📋 Pregled

Novi sustav kreирanja Visita s **Receipt-first** pristupom:
1. Korisnik skenira račun → Backend kreira Receipt s Claude OCR-om
2. Backend automatski pokušava pronaći restoran (5-koračni algoritam)
3. Korisnik potvrđuje → Visit se kreira i povezuje s Receiptom

**Prednosti:**
- ✅ Receipt i Visit su odvojeni entiteti
- ✅ Receipt može postojati bez Visita (siročad za ručno procesiranje)
- ✅ Visit uvijek ima kompletan Receipt
- ✅ Bolje rukovanje greškama i oporavak

---

## 🔄 Kompletan Flow

### Scenarij 1: ✅ Restoran Automatski Pronađen

```
1. Korisnik otvara kameru i skenira račun
   ↓
2. App šalje na: POST /api/app/receipts
   Body: { image, locationLat?, locationLng? }
   ↓
3. Backend:
   - ⚡ VALIDIRA da je slika račun PRVO (Claude Vision - blokira ne-račune)
   - ✅ Ako je validan: Procesira sliku (4 varijante)
   - ✅ Ako je validan: Claude OCR izvlači podatke (OIB, JIR, ZKI, iznos, datum, ime/adresa restorana)
   - ✅ Ako je validan: Auto-matching algoritam (5 koraka)
   - ❌ Ako NIJE validan: Odmah vraća grešku (bez procesiranja/uploada)
   ↓
4. Response: { receiptId, restaurant: {...}, extractedData: {...} }
   ↓
5. Frontend prikazuje ekran za potvrdu:
   "Našli smo restoran: Pop's Pizza Ljubljana ✓"
   - Prikazuje iznos, datum
   - Gumb: "Potvrdi Visit"
   ↓
6. Korisnik klikne "Potvrdi Visit"
   ↓
7. App kreira visit: POST /api/app/visits
   Body: { receiptId, restaurantId }
   ↓
8. ✅ USPJEH - Visit kreiran, Receipt povezan
```

### Scenarij 2: ❓ Restoran Nije Pronađen (Jednostavna Ručna Pretraga)

```
1. Korisnik skenira račun
   ↓
2. POST /api/app/receipts
   ↓
3. Response: { receiptId, needsRestaurantSelection: true, extractedData: {...} }
   ↓
4. Frontend prikazuje JEDNOSTAVNO sučelje za pretragu:
   - Tražilica: "Pretražite restorane..."
   - Pretraži SVE restorane iz baze (bez Googlea)
   - Pretraga radi BEZ dijakritika ("cingi" pronalazi "čingi")
   - Case-insensitive ("LINGI" pronalazi "Lingi")
   ↓
5. Korisnik upisuje: GET /api/app/restaurants/search?q=cingi lingi
   ↓
6. Prikazuje listu restorana SAMO IZ BAZE:
   - Ime, adresa, grad
   - Jednostavna lista, sortirana abecedno
   ↓
7a. AKO KORISNIK PRONAĐE RESTORAN:
    → Korisnik klikne na restoran
    → POST /api/app/visits
       Body: { receiptId, restaurantId }
    → ✅ USPJEH - Visit kreiran!

7b. AKO KORISNIK NE PRONAĐE RESTORAN:
    → Gumb: "Nije na listi - Upiši ručno"
    → Prikazuje 2 inputa: "Naziv restorana" + "Grad"
    → Korisnik upisuje: "Pizzeria Nova" + "Zagreb"
    → POST /api/app/visits
       Body: { receiptId, manualRestaurantName, manualRestaurantCity }
    → Backend pokušava pronaći na Google Placesima (Claude confidence ≥ 0.85)
    → AKO pronađe: Auto-kreira restoran + Visit ✅
    → AKO NE pronađe: Kreira Visit s fallback podacima (admin će povezati ručno) ✅
```

**Ključna pojednostavljenja:**
- ✅ Bez kompleksne Google Places pretrage u frontendu
- ✅ Bez URLova ili kompliciranih inputa
- ✅ Samo: Pretraži listu → Ako nema, upiši ime + grad
- ✅ Backend rukovodi svom Google Places logikom
- ✅ Fallback na ručno povezivanje od strane admina

---

## 🔍 Algoritam Traženja Restorana (5 Koraka)

Backend automatski pokušava pronaći restoran ovim redom:

### **Korak 1: OIB Točno Podudaranje** (samo Hrvatska)
```
AKO Claude pročita OIB s računa:
  → Pretraži bazu: Restaurant.findOne({ oib: extractedOib })
  → AKO pronađe: ✅ MATCH! (100% sigurnost)
  → AKO ne pronađe: → Korak 1.5
```
**Brzina:** Najbrži (točan DB lookup)
**Sigurnost:** 100%
**Pokrivenost:** Samo Hrvatska

### **Korak 1.5: Pretraga po Imenu** (postojeći restorani)
```
AKO Claude pročita merchantName s računa:
  → Pretraži bazu: Restaurant.findAll({ name ILIKE '%merchantName%' })
  → AKO ima više rezultata I dostupan je GPS:
    → Filtriraj po udaljenosti (unutar 50km)
  → Claude uspoređuje podatke s računa s pronađenim restoranima
  → AKO Claude sigurnost ≥ 0.80: ✅ MATCH!
  → AKO sigurnost < 0.80: → Korak 2
```
**Brzina:** Brzo (DB pretraga + opcionalni filter udaljenosti)
**Sigurnost:** 80%+
**Pokrivenost:** Sve zemlje (radi bez GPS-a, ali bolje s GPS-om)
**Primjer:** OCR pročita "CINGI LINGI CARDA" → Pronalazi "Restoran CINGI LINGI CARDA" u bazi

### **Korak 2: Geografsko + Claude Podudaranje** (postojeći restorani)
```
AKO korisnik ima GPS koordinate:
  → Pretraži bazu: Restaurant.findNearby(lat, lng, 5km)
  → Filtriraj top 50 najbližih
  → Claude uspoređuje podatke s računa s restoranima iz baze
  → AKO Claude sigurnost ≥ 0.80: ✅ MATCH!
  → AKO sigurnost < 0.80: → Korak 2.5
INAČE (bez GPS-a):
  → Preskoči → Korak 2.5
```
**Brzina:** Brzo (geo-filtrirani query + AI)
**Sigurnost:** 80%+ (Claude odabire najbolje podudaranje)
**Pokrivenost:** Bilo koja zemlja (gdje imamo restorane u bazi)

### **Korak 2.5: Google Places + Claude Podudaranje** (AUTO-KREIRANJE 🆕)
```
AKO Claude pročita merchantName i merchantAddress:
  → Google Places Text Search: "{merchantName} {merchantAddress}"
  → Google vraća top rezultate (s location bias ako je GPS dostupan)
  → Claude uspoređuje podatke s računa s Google rezultatima
  → AKO Claude sigurnost ≥ 0.85:
      → Dohvati potpune Place Details
      → Provjeri duplikat: Restaurant.findByPlaceId(placeId)
      → AKO već postoji: ✅ MATCH! (postojeći restoran)
      → AKO ne postoji: ✅ AUTO-KREIRAJ + MATCH! (novi restoran)
  → AKO sigurnost < 0.85: → Korak 3
```
**Brzina:** Sporije (2 Google API poziva: Text Search + Place Details)
**Sigurnost:** 85%+ (viši prag za auto-kreiranje)
**Pokrivenost:** Globalno (sve što je na Google Places)
**Trošak:** ~$0.034 po novom restoranu
**Magija:** Automatski popunjava bazu s novim restoranima! 🎉

### **Korak 3: Ručna Pretraga Fallback**
```
AKO nijedan automatizirani korak ne uspije:
  → Vrati: { needsRestaurantSelection: true }
  → Frontend prikazuje sučelje za pretragu
  → Korisnik ručno pretražuje i odabire restoran
  → Ponovno šalje s restaurantId ili manualRestaurantName + manualRestaurantCity
```
**Brzina:** Sporo (ručna intervencija)
**Sigurnost:** 100% (korisnik odlučuje)
**Pokrivenost:** Globalno (fallback za sve)

---

## 🌐 API Endpointi

### 1. Upload Računa (Skeniranje Računa)

**Endpoint:** `POST /api/app/receipts`

**Headers:**
```
Authorization: Bearer {token}
X-Api-Key: {api-key}
Content-Type: multipart/form-data
```

**Request Body (FormData):**
```javascript
{
  image: File,                    // OBAVEZNO: Slika računa
  locationLat: "45.815000",       // OPCIONALNO: GPS latitude (poboljšava podudaranje)
  locationLng: "15.982000",       // OPCIONALNO: GPS longitude (poboljšava podudaranje)
  gpsAccuracy: "10.5"             // OPCIONALNO: GPS točnost u metrima
}
```

**Response - Uspjeh (restoran pronađen):**
```json
{
  "receiptId": 123,
  "needsRestaurantSelection": false,
  "message": "Restoran \"Pop's Pizza Ljubljana\" pronađen!",
  "restaurant": {
    "id": 456,
    "name": "Pop's Pizza Ljubljana",
    "address": "Trg bana Jelačića 5",
    "place": "Ljubljana",
    "placeId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
    "rating": 4.7,
    "isNew": true  // true ako je auto-kreiran preko Koraka 2.5
  },
  "extractedData": {
    "oib": "12345678901",
    "jir": "abc-123-def",
    "zki": "xyz789",
    "totalAmount": 89.50,
    "issueDate": "2025-01-17",
    "issueTime": "14:30:00",
    "merchantName": "Pop's Pizza",
    "merchantAddress": "Trg bana Jelačića 5, Ljubljana"
  }
}
```

**Response - Potreban Odabir Restorana:**
```json
{
  "receiptId": 124,
  "needsRestaurantSelection": true,
  "message": "Račun obrađen. Molimo odaberite restoran.",
  "extractedData": {
    "totalAmount": 125.00,
    "issueDate": "2025-01-17",
    "merchantName": "Nepoznati Restoran",
    "merchantAddress": "Neka Adresa 123"
  }
}
```

**Greške:**
```json
// 400 - Nema slike
{ "error": "Receipt image is required" }

// 400 - Duplikat
{ "error": "Ovaj račun je već poslan na provjeru" }

// 400 - Nije račun (validacija nije prošla)
{
  "error": "Slika ne izgleda kao račun. Molimo učitajte jasnu fotografiju računa.",
  "details": "Image appears to be a menu, not a receipt",
  "confidence": 0.92
}

// 400 - Nevažeći format
{ "error": "Nepodržan format slike. Molimo koristite: JPG, PNG, WEBP ili HEIC." }

// 500 - Procesiranje nije uspjelo
{ "error": "Failed to process receipt image" }
```

---

### 2. Kreiraj Visit (Potvrdi Visit)

**Endpoint:** `POST /api/app/visits`

**Headers:**
```
Authorization: Bearer {token}
X-Api-Key: {api-key}
Content-Type: application/json
```

**Request Body:**
```javascript
{
  receiptId: 123,                       // OBAVEZNO: Iz uploadReceipt responsa

  // OPCIJA 1: Odabran postojeći restoran iz baze
  restaurantId: 456,                    // OPCIONALNO: ID restorana iz baze

  // OPCIJA 2: Auto-kreiranje iz Google Places podataka
  restaurantData: {                     // OPCIONALNO: Google Places podaci za auto-kreiranje
    name: "Pop's Pizza Ljubljana",
    address: "Trg bana Jelačića 5",
    place: "Ljubljana",
    placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4",
    latitude: 45.815000,
    longitude: 15.982000,
    phone: "+385 1 234 5678",
    websiteUrl: "https://popspizza.com",
    rating: 4.7,
    priceLevel: 2
  },

  // OPCIJA 3: Ručno upisan restoran (fallback)
  manualRestaurantName: "Pizzeria Nova", // OPCIONALNO: Ako korisnik upisao ručno (fallback)
  manualRestaurantCity: "Zagreb",       // OPCIONALNO: Ako korisnik upisao ručno (fallback)

  taggedBuddies: [1, 2, 3]             // OPCIONALNO: ID-jevi korisnika tagiranih u visitu
}
```

**Kada poslati što:**
- **restaurantId**: Korisnik pronašao restoran u listi → Pošalji samo restaurantId
- **restaurantData**: Korisnik odabrao iz Google Places → Pošalji cijeli objekt (backend auto-kreira)
- **manualRestaurantName + manualRestaurantCity**: Korisnik nije pronašao → Pošalji ručne podatke
  - Backend pokušava Google Places pretragu (confidence ≥ 0.85)
  - Ako pronađe → Auto-kreira restoran
  - Ako ne pronađe → Visit kreiran s fallback podacima (admin povezuje ručno)

**Response - Uspjeh:**
```json
{
  "message": "Visit created successfully. Waiting for admin approval.",
  "visit": {
    "id": 789,
    "userId": 1,
    "restaurantId": 456,
    "receiptImageUrl": "https://cdn.dinver.com/...",
    "status": "PENDING",
    "wasInMustVisit": false,
    "submittedAt": "2025-01-17T10:30:00Z",
    "taggedBuddies": [],
    "restaurant": {
      "id": 456,
      "name": "Pop's Pizza Ljubljana",
      "address": "Trg bana Jelačića 5",
      "place": "Ljubljana",
      "rating": 4.7,
      "thumbnailUrl": "https://cdn.dinver.com/...",
      "isNew": true
    },
    "receipt": {
      "id": 123,
      "thumbnailUrl": "...",
      "mediumUrl": "...",
      "fullscreenUrl": "...",
      "originalUrl": "...",
      "status": "pending",
      "oib": "12345678901",
      "totalAmount": 89.50,
      "issueDate": "2025-01-17"
    }
  }
}
```

**Response - Uspjeh (Fallback - Restoran će biti povezan ručno):**
```json
{
  "message": "Visit created! Restoran će biti spojen od strane administratora.",
  "visit": {
    "id": 789,
    "userId": 1,
    "restaurantId": null,
    "manualRestaurantName": "Pizzeria Nova",
    "manualRestaurantCity": "Zagreb",
    "status": "PENDING",
    "restaurant": null
  }
}
```

**Greške:**
```json
// 400 - Nema receiptId
{ "error": "Receipt ID is required" }

// 404 - Receipt nije pronađen
{ "error": "Receipt not found" }

// 403 - Nije tvoj receipt
{ "error": "Unauthorized" }

// 400 - Receipt već ima visit
{ "error": "Receipt already has a visit", "visitId": 789 }

// 400 - Nedostaju podaci o restoranu
{ "error": "Restaurant ID or manual restaurant name and city are required" }

// 404 - Restoran nije pronađen
{ "error": "Restaurant not found" }
```

---

### 3. Pretraži Restorane (Jednostavna Pretraga Baze - NOVO)

**Endpoint:** `GET /api/app/restaurants/search`

**Query Parametri:**
```
q=cingi lingi              // OBAVEZNO: Query za pretragu (min 2 znaka)
```

**Značajke:**
- ✅ Pretražuje SVE restorane u bazi
- ✅ Bez dijakritika: "cingi" pronalazi "čingi", "Cingi", "ČINGI"
- ✅ Case-insensitive: "LINGI" pronalazi "lingi", "Lingi"
- ✅ Pretražuje polja: ime, adresa i grad
- ✅ Vraća do 200 rezultata, sortirano abecedno
- ✅ Bez Google Placesa - jednostavno i brzo!

**Response:**
```json
{
  "results": [
    {
      "id": 123,
      "name": "Restoran Čingi Lingi Čarda",
      "address": "Ulica 123",
      "place": "Zagreb",
      "country": "Croatia"
    },
    {
      "id": 456,
      "name": "CINGI LINGI - Zadar",
      "address": "Obala kralja Petra Krešimira IV 2",
      "place": "Zadar",
      "country": "Croatia"
    }
  ]
}
```

**Greške:**
```json
// 400 - Query prekratak
{ "error": "Unesite najmanje 2 znaka za pretragu" }

// 500 - Pretraga nije uspjela
{ "error": "Pretraga nije uspjela" }
```

---

### 4. Dohvati Listu Visita

**Endpoint:** `GET /api/app/visits`

**Headers:**
```
Authorization: Bearer {token}
X-Api-Key: {api-key}
```

**Response:**
```json
{
  "visits": [
    {
      "id": 789,
      "userId": 1,
      "restaurantId": 456,
      "receiptImageUrl": "https://cdn.dinver.com/...",
      "status": "APPROVED",
      "wasInMustVisit": true,
      "visitDate": "2025-01-17",
      "submittedAt": "2025-01-17T10:30:00Z",
      "reviewedAt": "2025-01-18T09:00:00Z",
      "taggedBuddies": [],
      "restaurant": {
        "id": 456,
        "name": "Pop's Pizza Ljubljana",
        "address": "Trg bana Jelačića 5",
        "place": "Ljubljana",
        "thumbnailUrl": "https://cdn.dinver.com/...",
        "rating": 4.7
      },
      "receipt": {
        "id": 123,
        "thumbnailUrl": "...",
        "totalAmount": 89.50,
        "issueDate": "2025-01-17"
      }
    }
  ]
}
```

**Greške:**
```json
// 401 - Neautoriziran
{ "error": "Unauthorized" }
```

---

### 5. Dohvati Pojedinačni Visit

**Endpoint:** `GET /api/app/visits/:visitId`

**Headers:**
```
Authorization: Bearer {token}
X-Api-Key: {api-key}
```

**Response:**
```json
{
  "visit": {
    "id": 789,
    "userId": 1,
    "restaurantId": 456,
    "receiptImageUrl": "https://cdn.dinver.com/...",
    "status": "PENDING",
    "wasInMustVisit": false,
    "visitDate": null,
    "submittedAt": "2025-01-17T10:30:00Z",
    "reviewedAt": null,
    "experienceDeadline": "2025-01-31T10:30:00Z",
    "taggedBuddies": [],
    "manualRestaurantName": null,
    "manualRestaurantCity": null,
    "restaurant": {
      "id": 456,
      "name": "Pop's Pizza Ljubljana",
      "address": "Trg bana Jelačića 5",
      "place": "Ljubljana",
      "rating": 4.7,
      "thumbnailUrl": "https://cdn.dinver.com/..."
    },
    "receipt": {
      "id": 123,
      "thumbnailUrl": "...",
      "mediumUrl": "...",
      "fullscreenUrl": "...",
      "originalUrl": "...",
      "status": "pending",
      "oib": "12345678901",
      "totalAmount": 89.50,
      "issueDate": "2025-01-17"
    },
    "experience": null
  }
}
```

**Greške:**
```json
// 404 - Visit nije pronađen
{ "error": "Visit not found" }

// 403 - Nije tvoj visit
{ "error": "Unauthorized" }
```

---

### 6. Retake Računa (Za Rejected Visite)

**Endpoint:** `PUT /api/app/visits/:visitId/retake`

**Headers:**
```
Authorization: Bearer {token}
X-Api-Key: {api-key}
Content-Type: multipart/form-data
```

**Request Body (FormData):**
```javascript
{
  receiptImage: File  // OBAVEZNO: Nova slika računa
}
```

**Kada koristiti:**
- Visit je u statusu `REJECTED`
- Unutar 48 sati od retakeDeadline
- Korisnik uploaduje novi, ispravan račun

**Response:**
```json
{
  "message": "Receipt retake submitted successfully",
  "visit": {
    "id": 789,
    "status": "PENDING",
    "receiptImageUrl": "https://cdn.dinver.com/new-receipt.jpg",
    "retakeDeadline": null
  }
}
```

**Greške:**
```json
// 404 - Visit nije pronađen
{ "error": "Visit not found" }

// 403 - Nije tvoj visit
{ "error": "Unauthorized" }

// 400 - Visit nije rejected
{ "error": "Only rejected visits can be retaken" }

// 400 - Istekao rok
{ "error": "Retake deadline has passed" }

// 400 - Nema slike
{ "error": "Receipt image is required" }
```

---

### 7. Provjeri Je Li Korisnik Posjetio Restoran

**Endpoint:** `GET /api/app/visits/restaurant/:restaurantId/check`

**Headers:**
```
Authorization: Bearer {token}
X-Api-Key: {api-key}
```

**Response:**
```json
{
  "hasVisited": true,
  "visitId": 789
}
```

**Ili:**
```json
{
  "hasVisited": false,
  "visitId": null
}
```

**Greške:**
```json
// 404 - Restoran nije pronađen
{ "error": "Restaurant not found" }
```

---

### 8. Obriši Visit

**Endpoint:** `DELETE /api/app/visits/:visitId`

**Headers:**
```
Authorization: Bearer {token}
X-Api-Key: {api-key}
```

**Pravila:**
- Visit može biti obrisan samo unutar 14 dana od kreiranja
- Korisnik može obrisati samo svoje visite
- Brisanje je trajno (hard delete)

**Response:**
```json
{
  "message": "Visit deleted successfully"
}
```

**Greške:**
```json
// 404 - Visit nije pronađen
{ "error": "Visit not found" }

// 403 - Nije tvoj visit
{ "error": "Unauthorized" }

// 400 - Istekao rok za brisanje
{ "error": "Visits can only be deleted within 14 days of creation" }
```

---

## 🔧 Napredne Opcije i Legacy Endpointi

Ovi endpointi su dostupni za posebne slučajeve ili backward compatibility.

---

### 9. Legacy: Kreiraj Visit Direktno (Stari Flow)

**Endpoint:** `POST /api/app/visits/legacy`

**⚠️ NAPOMENA:** Ovaj endpoint je zadržan za backward compatibility. **Preporučujemo korištenje novog Receipt-first flowa** (POST /api/app/receipts → POST /api/app/visits).

**Headers:**
```
Authorization: Bearer {token}
X-Api-Key: {api-key}
Content-Type: multipart/form-data
```

**Request Body (FormData):**
```javascript
{
  restaurantId: 456,           // OBAVEZNO: ID restorana
  receiptImage: File,          // OBAVEZNO: Slika računa
  taggedBuddies: [1, 2, 3]    // OPCIONALNO: ID-jevi tagiranih korisnika
}
```

**Response:**
```json
{
  "message": "Visit created successfully. Waiting for admin approval.",
  "visit": {
    "id": 789,
    "status": "PENDING",
    "restaurant": { ... },
    "receipt": { ... }
  }
}
```

---

### 10. Legacy: Kompleksna Google Places Pretraga

**Endpoint:** `GET /api/app/receipts/search-restaurants`

**⚠️ NAPOMENA:** Za jednostavnu pretragu koristite **GET /api/app/restaurants/search** umjesto ovog endpointa.

**Query Parametri:**
```
query=pizza               // OBAVEZNO: Traženi pojam
lat=45.815000            // OPCIONALNO: GPS latitude
lng=15.982000            // OPCIONALNO: GPS longitude
```

**Značajke:**
- Kombinira pretragu baze + Google Places API
- Vraća rezultate s dodatnim Google Places podacima
- Sporo i skupo (Google API pozivi)

**Response:**
```json
{
  "database": [
    {
      "id": 123,
      "name": "Pizzeria Zagreb",
      "address": "Ulica 123",
      "place": "Zagreb",
      "source": "database"
    }
  ],
  "google": [
    {
      "placeId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
      "name": "Pop's Pizza Ljubljana",
      "address": "Trg bana Jelačića 5",
      "place": "Ljubljana",
      "rating": 4.7,
      "source": "google"
    }
  ]
}
```

---

### 11. Dohvati Google Places Detalje Restorana

**Endpoint:** `GET /api/app/receipts/restaurant-details/:placeId`

**Headers:**
```
Authorization: Bearer {token}
X-Api-Key: {api-key}
```

**Kada koristiti:**
- Korisnik odabrao restoran iz Google Places rezultata
- Potrebni potpuni detalji za kreiranje restorana

**Response:**
```json
{
  "name": "Pop's Pizza Ljubljana",
  "address": "Trg bana Jelačića 5",
  "place": "Ljubljana",
  "country": "Croatia",
  "placeId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
  "latitude": 45.815000,
  "longitude": 15.982000,
  "phone": "+385 1 234 5678",
  "websiteUrl": "https://popspizza.com",
  "rating": 4.7,
  "priceLevel": 2,
  "openingHours": {
    "monday": "08:00-22:00",
    "tuesday": "08:00-22:00",
    ...
  },
  "isOpenNow": true
}
```

**Greške:**
```json
// 404 - Place nije pronađen
{ "error": "Place not found" }

// 500 - Google API greška
{ "error": "Failed to fetch place details" }
```

**Tip za frontend:**
Ako koristiš ovaj endpoint, pošalji `restaurantData` objekt direktno u POST /api/app/visits.

---

## 💻 Frontend Implementacija

### React Native Primjer

```typescript
import { useState } from 'react';

// Korak 1: Upload računa
async function uploadReceipt(imageUri: string, lat: number | null, lng: number | null) {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'receipt.jpg',
  });

  // Dodaj GPS ako je dostupan
  if (lat !== null && lng !== null) {
    formData.append('locationLat', lat.toString());
    formData.append('locationLng', lng.toString());
  }

  const response = await fetch('/api/app/receipts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Api-Key': apiKey,
    },
    body: formData,
  });

  const result = await response.json();

  // Rukovanje validation greškom (slika nije račun)
  if (!response.ok && result.error?.includes('račun')) {
    showError(result.error); // "Slika ne izgleda kao račun..."
    return;
  }

  if (result.needsRestaurantSelection) {
    // AI nije mogao pronaći restoran - prikaži sučelje za pretragu
    return handleRestaurantSearch(result.receiptId, result.extractedData);
  } else {
    // ✅ Restoran pronađen - prikaži ekran za potvrdu
    return showConfirmationScreen(result);
  }
}

// Korak 2: Prikaži ekran za potvrdu
function showConfirmationScreen(receiptData: any) {
  return (
    <View>
      <Text>Restoran pronađen!</Text>
      <Text>{receiptData.restaurant.name}</Text>
      <Text>Iznos: {receiptData.extractedData.totalAmount}€</Text>
      <Text>Datum: {receiptData.extractedData.issueDate}</Text>

      <Button
        title="Potvrdi Visit"
        onPress={() => createVisit(receiptData.receiptId, receiptData.restaurant.id)}
      />
    </View>
  );
}

// Korak 3: Kreiraj visit
async function createVisit(
  receiptId: number,
  restaurantId: number,
  taggedBuddies?: number[]
) {
  const response = await fetch('/api/app/visits', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      receiptId,
      restaurantId,
      taggedBuddies: taggedBuddies || [],
    }),
  });

  const result = await response.json();

  if (response.ok) {
    // ✅ Uspjeh - navigiraj na detalje visita
    navigation.navigate('VisitDetails', { visitId: result.visit.id });
  } else {
    // Rukovanje greškom
    showError(result.error);
  }
}

// Korak 4: Jednostavna ručna pretraga restorana (NOVI FLOW)
function handleRestaurantSearch(receiptId: number, extractedData: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualCity, setManualCity] = useState('');

  // Pretraži bazu (bez dijakritika)
  const searchRestaurants = async (query: string) => {
    if (query.length < 2) return;

    const response = await fetch(
      `/api/app/restaurants/search?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Api-Key': apiKey,
        },
      }
    );

    const data = await response.json();
    setSearchResults(data.results);
  };

  return (
    <View>
      <Text>Pretražite restorane</Text>

      {/* Input za pretragu */}
      <TextInput
        placeholder="Unesite ime restorana..."
        value={searchQuery}
        onChangeText={(text) => {
          setSearchQuery(text);
          searchRestaurants(text);
        }}
      />

      {/* Rezultati pretrage */}
      {searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => createVisit(receiptId, item.id)}
            >
              <View>
                <Text>{item.name}</Text>
                <Text>{item.address}, {item.place}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Gumb "Nije na listi" */}
      <Button
        title="Nije na listi - Upiši ručno"
        onPress={() => setShowManualInput(true)}
      />

      {/* Ručni unos */}
      {showManualInput && (
        <View>
          <Text>Unesite podatke o restoranu:</Text>
          <TextInput
            placeholder="Naziv restorana"
            value={manualName}
            onChangeText={setManualName}
          />
          <TextInput
            placeholder="Grad"
            value={manualCity}
            onChangeText={setManualCity}
          />
          <Button
            title="Potvrdi"
            onPress={() => createVisitWithManualRestaurant(receiptId, manualName, manualCity)}
          />
        </View>
      )}
    </View>
  );
}

// Korak 5: Kreiraj visit s ručnim podacima o restoranu
async function createVisitWithManualRestaurant(
  receiptId: number,
  manualRestaurantName: string,
  manualRestaurantCity: string
) {
  const response = await fetch('/api/app/visits', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      receiptId,
      manualRestaurantName,
      manualRestaurantCity,
    }),
  });

  const result = await response.json();

  if (response.ok) {
    if (result.visit.restaurant) {
      // Backend pronašao restoran na Google Placesima
      showSuccess(`Visit kreiran! Restoran "${result.visit.restaurant.name}" dodan u sustav.`);
    } else {
      // Backend nije mogao pronaći - admin će povezati ručno
      showSuccess('Visit kreiran! Restoran će biti spojen od strane administratora.');
    }
    navigation.navigate('VisitDetails', { visitId: result.visit.id });
  } else {
    showError(result.error);
  }
}
```

---

## 🎨 UX Smjernice

### Ekran Greške Validacije (Slika Nije Račun)

**Kada validacija ne prođe (slika nije valjani račun):**
```
┌──────────────────────────────────┐
│  ❌ Slika nije račun             │
│                                  │
│  Slika ne izgleda kao račun.     │
│  Molimo učitajte jasnu           │
│  fotografiju računa.             │
│                                  │
│  Česta greška:                   │
│  • Fotografija menija            │
│  • Fotografija hrane             │
│  • Zamućena slika                │
│  • Neodgovarajući dokument       │
│                                  │
│  [ Pokušaj ponovo ]              │
│  [ Odustani ]                    │
└──────────────────────────────────┘
```

**Savjet za implementaciju:**
- Automatski omogućiti korisniku da ponovno fotografira odmah
- Ne spremaj nevalidnu sliku
- Razmisli o prikazu kamere odmah nakon greške

---

### Ekran Potvrde (Nakon Uploada Računa)

**Kada je restoran pronađen (needsRestaurantSelection: false):**
```
┌──────────────────────────────────┐
│  ✅ Restoran pronađen!           │
│                                  │
│  📍 Pop's Pizza Ljubljana        │
│  Trg bana Jelačića 5, Ljubljana  │
│  ⭐ 4.7                           │
│                                  │
│  💰 Iznos: 89.50 €               │
│  📅 Datum: 17.01.2025            │
│                                  │
│  [ Potvrdi Visit ]               │
│  [ Nije ovaj restoran ]          │
└──────────────────────────────────┘
```

---

### Ekran Ručne Pretrage

**Kada je restoran potrebno ručno odabrati:**
```
┌──────────────────────────────────┐
│  🔍 Pretražite restorane         │
│                                  │
│  ┌────────────────────────────┐ │
│  │ Unesite ime restorana...   │ │
│  └────────────────────────────┘ │
│                                  │
│  📋 Rezultati:                   │
│  ┌────────────────────────────┐ │
│  │ Restoran Čingi Lingi       │ │
│  │ Ulica 123, Zagreb          │ │
│  └────────────────────────────┘ │
│  ┌────────────────────────────┐ │
│  │ CINGI LINGI - Zadar        │ │
│  │ Obala kralja Petra...      │ │
│  └────────────────────────────┘ │
│                                  │
│  [ Nije na listi - Upiši ručno ]│
└──────────────────────────────────┘
```

**Ako klikne "Nije na listi":**
```
┌──────────────────────────────────┐
│  ✍️ Unesite podatke o restoranu  │
│                                  │
│  ┌────────────────────────────┐ │
│  │ Naziv restorana            │ │
│  └────────────────────────────┘ │
│                                  │
│  ┌────────────────────────────┐ │
│  │ Grad                       │ │
│  └────────────────────────────┘ │
│                                  │
│  ℹ️ Backend će pokušati pronaći │
│  restoran na Google Placesima.  │
│  Ako ne uspije, admin će        │
│  povezati restoran ručno.       │
│                                  │
│  [ Potvrdi ]                     │
│  [ Natrag ]                      │
└──────────────────────────────────┘
```

---

## 🛠️ Implementacijski Detalji

### Validacija Slike (Korak 1)

Backend koristi Claude Haiku 4.5 za validaciju slike prije procesiranja:
- Kompresira slike preko 4.5MB
- Provjerava da li slika sadrži indikatore računa (OIB, JIR, ZKI, datum, iznos)
- Blokira menije, fotografije hrane, zamućene slike

### OCR Izvlačenje (Korak 4)

Claude OCR izvlači:
- **Fiskalni podaci:** OIB, JIR, ZKI
- **Transakcijski podaci:** Ukupan iznos, datum, vrijeme
- **Podaci o trgovcu:** Ime, adresa (pazi na dvostruke adrese!)
- **Razine sigurnosti:** Za svako polje + ukupna sigurnost

### Auto-Kreiranje Restorana

Kada backend pronađe restoran na Google Placesima:
1. Dohvaća potpune detalje (Place Details API)
2. Generira unique slug (normalizira hrvatske znakove)
3. Kreira restoran u bazi sa svim podacima:
   - Ime, adresa, grad, država
   - Koordinate (lat/lng)
   - Telefon, website
   - Rating, price level
   - Radno vrijeme (openingHours, isOpenNow)
4. Povezuje s Visitom

### Fallback Mehanizam

Ako nijedan automatski korak ne uspije:
1. Visit se kreira s `restaurantId = null`
2. Sprema se `manualRestaurantName` i `manualRestaurantCity`
3. Admin vidi ove podatke u sysadmin sučelju
4. Admin može ručno povezati Visit s postojećim restoranom ili kreirati novi

---

## 📊 Logovi Procesiranja (za debugging)

```bash
# KORAK 1: Validacija (događa se PRIJE procesiranja/uploada)
[Receipt Upload] Starting receipt processing for user: abc-123
[Receipt Upload] Validating image is a receipt...
[Claude Validation] Validating image is a receipt...
[Claude Validation] Image too large (11.89MB), compressing...
[Claude Validation] Compressed to 1.24MB
[Claude Validation] Completed in 1243ms
[Claude Validation] Result: isReceipt=true, confidence=0.95, reason="Contains fiscal codes and merchant information"
[Receipt Upload] Image validated as receipt (confidence: 0.95)

# Ako validacija ne prođe (procesiranje STAJE ovdje, bez uploada):
[Claude Validation] Result: isReceipt=false, confidence=0.88, reason="Image appears to be a menu, not a receipt"
[Receipt Upload] Image is not a receipt: Image appears to be a menu, not a receipt
# → Vraća grešku, bez S3 uploada, bez unosa u bazu

# Korak 1 - OIB Match
[Restaurant Match] Attempting OIB match...
[Restaurant Match] Matched by OIB: Pizzeria Novi Zagreb

# Korak 1.5 - Pretraga po Imenu (NOVO)
[Restaurant Match] Attempting name-based search...
[Restaurant Match] Found 3 restaurants by name
[Restaurant Match] Filtering by distance (within 50km)...
[Restaurant Match] After distance filter: 2 restaurants
[Restaurant Match] Matched by name: Restoran CINGI LINGI CARDA (confidence: 0.92)

# Korak 2 - Geo + Claude
[Restaurant Match] Attempting geographic + Claude matching...
[Restaurant Match] Found 37 restaurants within 5km
[Restaurant Match] Matched by Claude: 123 (confidence: 0.92)

# Korak 2.5 - Google Places + AUTO-KREIRANJE
[Restaurant Match] Attempting Google Places proactive search...
[Restaurant Match] Google search query: "Pop's Pizza Trg bana Jelačića 5, Ljubljana"
[Restaurant Match] Found 5 Google Places results
[Restaurant Match] Claude Google match confidence: 0.92
[Restaurant Match] High confidence match (0.92), fetching place details...
[Restaurant Match] Creating new restaurant from Google Places: Pop's Pizza Ljubljana
[Restaurant Match] Auto-created restaurant ID: 789 (via Google Places + Claude)

# Manual Fallback u POST /api/app/visits
[Visit Create] Attempting Google Places search for manual input: "Pizzeria Nova" in "Zagreb"
[Visit Create] Found 3 Google Places results for manual search
[Visit Create] Claude confidence for manual search: 0.87
[Visit Create] Auto-created restaurant from manual search: Pizzeria Nova
```

---

## 🧪 Scenariji Testiranja

### 1. Validni Račun s OIB Podudarnjem (Hrvatska)
- Uploadaj hrvatski račun s poznatim OIB-om
- Očekivano: Validacija prođe, trenutno podudaranje preko Koraka 1

### 2. Nevaljana Slika (Nije Račun)
- Uploadaj fotografiju hrane, menija, ili zamućenu sliku
- Očekivano: Greška "Slika ne izgleda kao račun..."

### 3. Geo + Claude Podudaranje
- Uploadaj račun iz poznatog restorana (bez OIB-a)
- S GPS-om unutar 5km
- Očekivano: Podudaranje preko Koraka 2

### 4. Google Places Auto-Kreiranje
- Uploadaj račun iz NOVOG restorana
- Očekivano: Auto-kreiranje preko Koraka 2.5, restoran dodan u bazu

### 5. Ručna Pretraga - Pronađen u Bazi
- Pretraži "cingi lingi"
- Odaberi restoran iz liste
- Očekivano: Visit kreiran s postojećim restoranom

### 6. Ručna Pretraga - Fallback
- Pretraži restoran koji ne postoji
- Klikni "Nije na listi"
- Upiši "Pizzeria Nova" + "Zagreb"
- Očekivano:
  - Ako Google pronađe: Auto-kreira restoran + Visit
  - Ako Google ne pronađe: Visit kreiran s fallback podacima

---

## 🆘 Česta Pitanja

### Problem: "Slika ne izgleda kao račun"
**Uzrok:** Validacija slike nije prošla - uploadana slika ne izgleda kao račun
**Česti razlozi:**
- Fotografija menija umjesto računa
- Fotografija hrane/jela
- Preveć zamućeno ili izvan fokusa
- Screenshot nečeg što nije račun
- Poslovna kartica ili drugi dokument

**Rješenje:**
- Napravi jasnu, fokusiranu fotografiju pravog računa
- Osiguraj dobro osvjetljenje
- Fotografiraj cijeli račun (ne obrezano)
- Provjeri da je tekst na računu čitljiv

### Problem: "Receipt already has a visit"
**Uzrok:** Pokušaj kreiranja više visita iz istog računa
**Rješenje:** Svaki račun može imati samo jedan visit

### Problem: "Receipt not found"
**Uzrok:** receiptId nevažeći ili račun pripada drugom korisniku
**Rješenje:** Provjeri receiptId iz uploadReceipt responsa

### Problem: Restoran nije pronađen automatski
**Uzrok:** OCR nije pročitao dovolj podataka ili restoran ne postoji u bazi ni na Googleu
**Rješenje:**
1. Korisnik pretražuje ručno
2. Ako pronađe u listi - odabere
3. Ako ne pronađe - upiše ime + grad (backend pokušava Google Places)
4. U najgorem slučaju - Visit se kreira s fallback podacima, admin će povezati

---

## 🎯 Ključni Savjeti za Frontend Tim

1. **Uvijek rukuj validation greškom** - Ne dopusti da invalid slike idu kroz sustav
2. **Prikaži jasnu potvrdu** - Korisnik mora vidjeti da je restoran pronađen prije potvrde
3. **Jednostavna pretraga** - Samo input box i lista rezultata, ništa kompleksno
4. **Fallback poruka** - Jasno reci korisniku da će admin ručno povezati ako nije pronađeno
5. **GPS je opcionalan** - Sustav radi bez GPS-a, ali je bolji s GPS-om
6. **Loading indikatori** - OCR i Google Places mogu trajati 2-3 sekunde
7. **Retake funkcionalnost** - Za rejected visite prikaži gumb "Ponovno skenirati račun" s 48h brojaćem
8. **Brisanje visita** - Omogući brisanje samo prvih 14 dana od kreiranja
9. **Koristi novi flow** - POST /api/app/receipts → POST /api/app/visits (ne legacy endpoint)
10. **Provjeravaj duplikate** - Koristi GET /visits/restaurant/:id/check prije dodavanja u Must Visit

---

## 📝 Changelog

**v2.1 - Kompletan API Dokumentacija (17.11.2025)**
- ✅ Dodani svi Visit endpointi (GET, PUT, DELETE)
- ✅ Dokumentiran `restaurantData` parametar u POST /visits
- ✅ Dodan endpoint za retake računa (48h rok)
- ✅ Dodan endpoint za provjeru je li korisnik posjetio restoran
- ✅ Dodan endpoint za brisanje visita (14 dana rok)
- ✅ Dodana sekcija za napredne/legacy endpointe
- ✅ Dokumentirani Google Places endpointi za detalje restorana

**v2.0 - Jednostavni Sustav (17.01.2025)**
- ✅ Jednostavni search endpoint (bez dijakritika)
- ✅ Fallback mehanizam s ručnim unosom (samo ime + grad)
- ✅ Backend rukuje svom Google Places logikom
- ✅ Uklonjena kompleksnost iz frontenda
- ✅ Admin može ručno povezati restorane u sysadminu

**v1.0 - Receipt-first Flow**
- ✅ Odvojeni Receipt i Visit entiteti
- ✅ Claude OCR s validacijom
- ✅ 5-koračni algoritam traženja
- ✅ Auto-kreiranje restorana s Google Placesa
