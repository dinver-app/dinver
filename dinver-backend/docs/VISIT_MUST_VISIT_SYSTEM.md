# Visit & Must Visit Sustav - Vodič za Frontend Integraciju

## Pregled

Novi Visit i Must Visit sustav zamjenjuje stari favorites sustav sa:

- **Must Visit** - Wishlist funkcionalnost (korisnik želi posjetiti)
- **Visit** - Stvarni posjeti restoranima potvrđeni skeniranjem računa
- **Experience** - Opcionalni postovi/recenzije (sada povezani s Visits)

## Ključni Koncepti

### Must Visit Lista (Wishlist)

- Korisnik može dodati/ukloniti restorane koje želi posjetiti
- Like/bookmark funkcionalnost
- Kada korisnik skenira račun za restoran u Must Visit listi, automatski se premješta na Visited listu
- Ako je račun odbijen i restoran je bio u Must Visit listi, vraća se u Must Visit listu

### Visited Lista

- Prikazuje sve korisnikove posjete restoranima (PENDING, APPROVED, REJECTED, RETAKE_NEEDED)
- Svaki posjet zahtijeva skeniranje računa
- Korisnik može tagirati buddyje za dijeljenje bodova
- Pending posjeti se prikazuju "zasivljeno" dok admin ne odobri
- Ako je odbijen, korisnik ima 48 sati da ponovo slika račun

### Experience (Opcionalno)

- Korisnik može kreirati Experience (post/recenziju) **odmah nakon što uploaduje račun** (dok je Visit još PENDING)
- Experience ostaje **PRIVATAN** (vidljiv samo korisniku) dok je Visit u statusu PENDING ili REJECTED
- Experience postaje **JAVAN** (PUBLIC) tek kada admin **ODOBRI** Visit
- Korisnik ima **14 dana od odobrenja** da kreira Experience (rok počinje od reviewedAt)
- Ako Visit bude odbijen i ne retakean u roku od 48h ILI retakean i opet odbijen → **Visit I Experience se brišu zajedno**
- Ako je restoran bio u Must Visit listi, vraća se natrag u Must Visit

---

## API Endpointi

### Must Visit Endpointi

#### 1. Dohvati Must Visit Listu

```
GET /api/app/must-visit
Headers:
  - X-API-KEY: <app-api-key>
  - Authorization: Bearer <access-token>

Response 200:
[
  {
    "id": "uuid",
    "addedAt": "2025-01-16T10:30:00Z",
    "restaurant": {
      "id": "uuid",
      "name": "Ime Restorana",
      "rating": 4.5,
      "priceLevel": "$$",
      "address": "Ulica 123",
      "place": "Zagreb",
      "thumbnailUrl": "https://cdn.example.com/...",
      "userRatingsTotal": 150
    }
  }
]
```

#### 2. Dodaj u Must Visit

```
POST /api/app/must-visit
Headers:
  - X-API-KEY: <app-api-key>
  - Authorization: Bearer <access-token>
Content-Type: application/json

Body:
{
  "restaurantId": "uuid"
}

Response 201:
{
  "message": "Restaurant added to Must Visit list"
}

Response 400:
{
  "error": "Restaurant already in Must Visit list"
}
```

#### 3. Ukloni iz Must Visit

```
DELETE /api/app/must-visit/:restaurantId
Headers:
  - X-API-KEY: <app-api-key>
  - Authorization: Bearer <access-token>

Response 200:
{
  "message": "Restaurant removed from Must Visit list"
}

Response 404:
{
  "error": "Restaurant not found in Must Visit list"
}
```

#### 4. Provjeri je li u Must Visit

```
GET /api/app/must-visit/:restaurantId/check
Headers:
  - X-API-KEY: <app-api-key>
  - Authorization: Bearer <access-token>

Response 200:
{
  "isMustVisit": true
}
```

---

### Visit Endpointi

#### 1. Dohvati Korisnikove Posjete (Visited Lista)

```
GET /api/app/visits
Query Parameters:
  - status (opcionalno): PENDING | APPROVED | REJECTED | RETAKE_NEEDED

Headers:
  - X-API-KEY: <app-api-key>
  - Authorization: Bearer <access-token>

Response 200:
[
  {
    "id": "uuid",
    "userId": "uuid",
    "restaurantId": "uuid",
    "receiptImageUrl": "https://cdn.example.com/...",
    "status": "PENDING",
    "wasInMustVisit": true,
    "visitDate": null,
    "submittedAt": "2025-01-16T10:30:00Z",
    "reviewedAt": null,
    "reviewedBy": null,
    "rejectionReason": null,
    "retakeDeadline": null,
    "experienceDeadline": null,
    "taggedBuddies": ["uuid1", "uuid2"],
    "createdAt": "2025-01-16T10:30:00Z",
    "updatedAt": "2025-01-16T10:30:00Z",
    "restaurant": {
      "id": "uuid",
      "name": "Ime Restorana",
      "rating": 4.5,
      "priceLevel": "$$",
      "address": "Ulica 123",
      "place": "Zagreb",
      "thumbnailUrl": "https://cdn.example.com/..."
    }
  }
]
```

#### 2. Kreiraj Visit (Skeniraj Račun)

```
POST /api/app/visits
Headers:
  - X-API-KEY: <app-api-key>
  - Authorization: Bearer <access-token>
Content-Type: multipart/form-data

Form Data:
  - restaurantId: uuid (obavezno)
  - receiptImage: file (obavezno, max 10MB, samo slike)
  - taggedBuddies: ["uuid1", "uuid2"] (opcionalno, JSON array)

Response 201:
{
  "message": "Visit created successfully. Waiting for admin approval.",
  "visit": {
    "id": "uuid",
    "userId": "uuid",
    "restaurantId": "uuid",
    "receiptImageUrl": "https://cdn.example.com/...",
    "status": "PENDING",
    "wasInMustVisit": true,
    "submittedAt": "2025-01-16T10:30:00Z",
    "taggedBuddies": ["uuid1", "uuid2"],
    "restaurant": {
      "id": "uuid",
      "name": "Ime Restorana",
      "rating": 4.5,
      ...
    }
  }
}

Response 400:
{
  "error": "Receipt image is required"
}

Response 404:
{
  "error": "Restaurant not found"
}
```

#### 3. Dohvati Pojedinačni Visit

```
GET /api/app/visits/:visitId
Headers:
  - X-API-KEY: <app-api-key>
  - Authorization: Bearer <access-token>

Response 200:
{
  "id": "uuid",
  "userId": "uuid",
  "restaurantId": "uuid",
  "receiptImageUrl": "https://cdn.example.com/...",
  "status": "APPROVED",
  "wasInMustVisit": true,
  "submittedAt": "2025-01-16T10:30:00Z",
  "reviewedAt": "2025-01-16T12:00:00Z",
  "experienceDeadline": "2025-01-30T12:00:00Z",
  ...
}

Response 404:
{
  "error": "Visit not found"
}
```

#### 4. Ponovi Slikanje Računa (Za Odbijene Posjete)

```
PUT /api/app/visits/:visitId/retake
Headers:
  - X-API-KEY: <app-api-key>
  - Authorization: Bearer <access-token>
Content-Type: multipart/form-data

Form Data:
  - receiptImage: file (obavezno, max 10MB, samo slike)

Response 200:
{
  "message": "Receipt updated successfully. Waiting for admin approval.",
  "visit": {
    "id": "uuid",
    "status": "PENDING",
    "receiptImageUrl": "https://cdn.example.com/...",
    ...
  }
}

Response 400:
{
  "error": "Can only retake receipt for rejected visits"
}

Response 400:
{
  "error": "Retake deadline has passed"
}
```

#### 5. Provjeri je li Korisnik Posjetio Restoran

```
GET /api/app/visits/restaurant/:restaurantId/check
Headers:
  - X-API-KEY: <app-api-key>
  - Authorization: Bearer <access-token>

Response 200:
{
  "hasVisited": true
}
```

---

## Vodič za Frontend Implementaciju

### Korisnički Tok

#### 1. Dodavanje u Must Visit

```javascript
// Kada korisnik tapne "Must Visit" / heart ikonu
async function addToMustVisit(restaurantId) {
  const response = await fetch('/api/app/must-visit', {
    method: 'POST',
    headers: {
      'X-API-KEY': API_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ restaurantId }),
  });

  if (response.ok) {
    // Prikaži success poruku
    // Ažuriraj UI da prikaže da je restoran u Must Visit listi
  }
}
```

#### 2. Kreiranje Visita (Skeniranje Računa)

```javascript
// Kada korisnik tapne "+" gumb za dodavanje posjeta
async function createVisit(restaurantId, receiptImage, taggedBuddies = []) {
  const formData = new FormData();
  formData.append('restaurantId', restaurantId);
  formData.append('receiptImage', receiptImage);
  if (taggedBuddies.length > 0) {
    formData.append('taggedBuddies', JSON.stringify(taggedBuddies));
  }

  const response = await fetch('/api/app/visits', {
    method: 'POST',
    headers: {
      'X-API-KEY': API_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (response.ok) {
    const data = await response.json();
    // Prikaži success poruku
    // Navigiraj na Visited listu
    // Prikaži visit kao PENDING (zasivljeno)
  }
}
```

#### 3. Prikaz Visited Liste

```javascript
// Dohvati i prikaži visited listu
async function getVisitedList(status = null) {
  let url = '/api/app/visits';
  if (status) {
    url += `?status=${status}`;
  }

  const response = await fetch(url, {
    headers: {
      'X-API-KEY': API_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const visits = await response.json();

  // Prikaži posjete
  visits.forEach((visit) => {
    // Prikaži info o restoranu
    // Prikaži status badge (PENDING, APPROVED, REJECTED)
    // Zasivi PENDING posjete
    // Prikaži retake gumb za REJECTED posjete
    // Prikaži "Kreiraj Experience" gumb za APPROVED posjete (ako je < 14 dana)
  });
}
```

#### 4. Ponovno Slikanje Računa (Za Odbijene Posjete)

```javascript
// Kada korisnik treba ponovo slikati račun
async function retakeReceipt(visitId, newReceiptImage) {
  const formData = new FormData();
  formData.append('receiptImage', newReceiptImage);

  const response = await fetch(`/api/app/visits/${visitId}/retake`, {
    method: 'PUT',
    headers: {
      'X-API-KEY': API_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (response.ok) {
    // Prikaži success poruku
    // Ažuriraj visit status na PENDING
  }
}
```

---

### Visited Lista

- Prikaži sve posjete sa statusnim indikatorima:
  - **PENDING**: Zasivi, prikaži "Čeka odobrenje" badge
  - **APPROVED**: Prikaži zeleni checkmark, "Kreiraj Experience" gumb (ako je < 14 dana)
  - **REJECTED**: Prikaži crveni X, "Ponovi Slikanje" gumb (ako je < 48 sati)
  - **RETAKE_NEEDED**: Isto kao REJECTED

### Visit Status Badge-ovi

- **PENDING**: Žuta/narančasta boja, sat ikona
- **APPROVED**: Zelena boja, checkmark ikona
- **REJECTED**: Crvena boja, X ikona
- **RETAKE_NEEDED**: Narančasta boja, kamera ikona

### Kreiranje Experience-a

- **Korisnik može kreirati Experience odmah nakon što uploaduje račun** (Visit je PENDING)
- Experience će biti privatan dok Visit nije odobren
- Prikaži status badge:
  - **PENDING/REJECTED**: "Experience je privatan dok račun čeka odobrenje"
  - **APPROVED**: "Experience je sada javan"
- Nakon što Visit bude APPROVED, prikaži:
  - "Još uvijek možeš kreirati Experience" gumb (ako Experience ne postoji)
  - Countdown: "Preostalo X dana za kreiranje experience-a" (14 dana od odobrenja)
- **Važno**: Ako Visit bude odbijen i ne retakean u 48h, Experience će biti obrisan zajedno s Visitom

---

## Visit Status Tok

```
Korisnik skenira račun
    ↓
Visit kreiran (PENDING)
    ↓
Restoran se premješta iz Must Visit u Visited (ako je bio u Must Visit)
    ↓
Korisnik MOŽE odmah kreirati Experience (ostaje PRIVATAN dok Visit nije odobren)
    ↓
Admin pregleda račun
    ↓
    ├─→ ODOBREN (APPROVED)
    │   ├─→ Experience (ako postoji) postaje JAVAN
    │   ├─→ Korisnik ima 14 dana od odobrenja da kreira Experience (ako ga još nema)
    │   └─→ Restoran ostaje u Visited, trajno uklonjen iz Must Visit
    │
    └─→ ODBIJEN (REJECTED)
        ├─→ Experience (ako postoji) ostaje PRIVATAN
        ├─→ Korisnik ima 48 sati da ponovo slika račun
        ├─→ Ako ponovi: Status → PENDING (vraća se adminu na pregled)
        └─→ Ako prođe 48h ILI ponovno odbijen:
            ├─→ Visit se BRIŠE
            ├─→ Experience (ako postoji) se BRIŠE
            └─→ Ako je restoran bio u Must Visit: vraća se u Must Visit (restaurira se)
```

---

## Važne Napomene

1. **Stari Favorites**: Stari `/api/app/favorites` endpointi još uvijek rade privremeno za backward kompatibilnost
2. **Must Visit = Novi Favorites**: Must Visit je novi naziv za favorites
3. **Automatsko Premještanje**: Kada se kreira visit, ako je restoran u Must Visit, automatski se premješta u Visited
4. **Soft Delete**: Sustav prati je li restoran bio u Must Visit, tako da ga može vratiti ako je račun odbijen i iskoristi rok
5. **Experience Link**: Experience može biti kreiran odmah, ali visitId je obavezan za nove Experiencese
6. **Experience Vidljivost**:
   - **PRIVATAN**: Dok je Visit u statusu PENDING ili REJECTED
   - **JAVAN**: Kada Visit bude APPROVED
   - **OBRISAN**: Ako Visit bude odbijen i ne retakean u roku ili ponovno odbijen
7. **Slika Računa**: Prihvaćaju se samo slike, max 10MB
8. **Tagirani Buddyji**: Šalju se kao JSON array UUID-eva korisnika
9. **Rokovi**:
   - **Experience Creation**: 14 dana od odobrenja Visita (reviewedAt) - rok za kreiranje Experiencea
   - **Retake Receipt**: 48 sati od odbijanja (rejectionReason) - rok za ponovno slikanje
10. **Automatsko Brisanje**: Cron job automatski briše Visite i povezane Experiencese nakon što istekne retake rok (48h)

---

## Testing Checklist

- [ ] Dodaj restoran u Must Visit
- [ ] Ukloni restoran iz Must Visit
- [ ] Provjeri je li restoran u Must Visit
- [ ] Kreiraj visit sa slikom računa
- [ ] Kreiraj visit za restoran u Must Visit (trebao bi se premjestiti u Visited)
- [ ] Pregledaj Visited listu (svi statusi)
- [ ] Filtriraj Visited listu po statusu
- [ ] Ponovi slikanje računa za odbijeni visit
- [ ] Provjeri visit rokove (experienceDeadline, retakeDeadline)
- [ ] Tagiraj buddyje prilikom kreiranja visita
- [ ] Pregledaj detalje pojedinog visita

---

## Migracija sa Starih Favorita

Stari favorites podaci su još uvijek u bazi podataka. Za migraciju:

1. Stari favorites → Must Visit (gdje je removedAt NULL)
2. Frontend bi trebao postepeno preći na nove endpointe
3. Stari `/api/app/favorites` endpointi će biti deprecatirani u budućem izdanju
