Ovaj dokument objašnjava kako funkcioniraju dva glavna search sistema u Dinver aplikaciji: **Near-You** (homepage) i **Global Search** (user search).

---

## 🎯 Strategija: HYBRID (Immediate Basic Import + Lazy Full Details)

Oba sistema koriste **HYBRID pristup** koji kombinira:
1. **Immediate Basic Import** - Google rezultati se ODMAH importaju u bazu (basic info)
2. **Lazy Full Details** - Phone, openingHours se dohvaćaju tek kad user klikne

### Zašto HYBRID?

| Metrika | Stara strategija (Cache) | Nova strategija (Hybrid) |
|---------|--------------------------|--------------------------|
| **Prvi user cost** | $0.032 | $0.032 |
| **Sljedeći useri cost** | $0.032 (svaki put!) | **$0** (iz baze!) |
| **100 usera cost** | $3.20 | **~$0.40** |
| **Persistence** | ❌ Gubi se | ✅ U bazi |
| **Speed sljedeći useri** | API call | **Instant (DB)** |

### Kako prepoznati Basic vs Full Import?

| Polje | Basic Import | Full Import |
|-------|--------------|-------------|
| `openingHours` | `null` | `{...}` |
| `phone` | `null` | `"+385..."` |
| `hasFullDetails` | `false` | `true` |
| `source` | `"google_basic_import"` | `"database"` |

---

## 1. Near-You API

**Endpoint:** `GET /api/restaurants/near-you`
**Svrha:** Prikazuje restorane na homepage-u na temelju lokacije korisnika

### Request

```bash
GET /api/restaurants/near-you?latitude=45.815&longitude=15.982
```

### Logika Rada

Near-You koristi **3-razinski sistem** za popunjavanje homepage-a sa ~20 restorana:

### Razina 1: Claimed restorani (0-60km)

- Traži claimed restorane u radijusu od 60km
- Ako ima ≥20 claimed → GOTOVO, vraća samo claimed
- Ako ima <20 claimed → prelazi na Razinu 2

### Razina 2: Unclaimed restorani iz baze (0-60km)

- Dohvaća unclaimed restorane koji su već u bazi
- Računa ukupan broj: `claimed + unclaimed`
- Ako ukupno ≥20 → GOTOVO, vraća bez Google API poziva
- Ako ukupno <20 → prelazi na Razinu 3

### Razina 3: Google Nearby Search API + IMMEDIATE BASIC IMPORT

- Poziva Google Places Nearby Search ($0.032)
- Filtrira rezultate u 2 kategorije:
    - **High-quality:** rating ≥4.0 ★ AND reviews ≥10
    - **Low-quality:** svi ostali
- Provjerava duplikate po `placeId` (PRIJE bilo kakvog procesiranja)
- **ODMAH IMPORTA u bazu** (basic info, BEZ Place Details API poziva)
- Vraća high-quality restorane
- Ako još uvijek nema 20 ukupno → dodaje i low-quality

### Response Format

```json
{
  "restaurants": [
    {
      "id": "uuid-123",
      "name": "Restoran Dubrovnik",
      "isClaimed": true,
      "slug": "restoran-dubrovnik",
      "distance": 5.2,
      "rating": 4.7,
      "thumbnailUrl": "...",
      "address": "...",
      "... svi ostali podaci ..."
    }
  ],
  "unclaimedRestaurants": [
    {
      "id": "uuid-456",
      "slug": "pizzeria-napoli",
      "name": "Pizzeria Napoli",
      "address": "Via Roma 123",
      "distance": 8.3,
      "rating": 4.3,
      "isClaimed": false
    }
  ],
  "pagination": {...}
}
```

**VAŽNO:** Svi restorani sada imaju pravi UUID i slug! Nema više `google:` prefixa.

### Pojednostavljeni Format za Unclaimed (UX)

Za bolji UX, unclaimed restorani vraćaju **samo esencijalna polja**:

| Polje | Opis |
|-------|------|
| `id` | UUID restorana |
| `slug` | URL-friendly ime |
| `name` | Ime restorana |
| `address` | Adresa |
| `distance` | Udaljenost u km |
| `rating` | Google rating |
| `isClaimed` | Uvijek `false` |

**Zašto?** Unclaimed restorani nemaju thumbnail, opis, menu itd. - prikazujemo samo ono što imamo.

### Sortiranje

**Claimed restorani:** Po udaljenosti (nearest first)

**Unclaimed restorani:** Po hybrid score (kombinacija ratinga i udaljenosti):
- High-quality + blizu = TOP
- High-quality + daleko = SREDINA
- Low-quality + blizu = DOLJE
- Low-quality + daleko = NAJDOLJE

### Basic Import vs Full Details

| Polje | Basic Import | Full Details |
| --- | --- | --- |
| `id` | `"uuid-123"` | `"uuid-123"` |
| `slug` | `"pizzeria-napoli"` | `"pizzeria-napoli"` |
| `isImported` | `true` | `true` |
| `hasFullDetails` | `false` | `true` |
| `source` | `"google_basic_import"` | `"database"` |
| `openingHours` | `null` | `{...}` |
| `phone` | `null` | `"+385..."` |

### Lazy Full Details

Svi restorani su **ODMAH u bazi** (basic info). Full details se dohvaćaju **tek kad korisnik klikne**:

1. **User klikne na restoran za detalje:**
    - `restaurantController.js` provjerava `openingHours === null`
    - Ako nema → Poziva `updateRestaurantFromGoogle()` ($0.017)
    - Update-a restoran sa full details
    - Vraća kompletne podatke

2. **Sljedeći korisnici:**
    - Full details već u bazi
    - Nema Google API poziva
    - Instant response

### Primjeri Scenarija

### Scenarij 1: Zagreb (veliki grad)

```
Input: 25 claimed u 60km radijusu
Output:
  - restaurants: [25 claimed]
  - unclaimedRestaurants: []
  - Google API: NE
```

### Scenarij 2: Split (srednji grad)

```
Input: 10 claimed, 15 unclaimed u bazi
Output:
  - restaurants: [10 claimed]
  - unclaimedRestaurants: [15 iz baze]
  - Google API: NE (već ima 25 ukupno)
```

### Scenarij 3: Zadar (manji grad)

```
Input: 5 claimed, 3 unclaimed u bazi
Google vraća: 12 high-quality
Output:
  - restaurants: [5 claimed]
  - unclaimedRestaurants: [3 existing DB + 12 newly imported]
  - Google API: DA ($0.032)
  - DB imports: 12 novih restorana (basic info)
  - Total: 20 restorana
  - Sljedeći user: $0 (sve iz baze!)
```

### Scenarij 4: Pag (vrlo mali grad)

```
Input: 2 claimed, 1 unclaimed u bazi
Google vraća: 3 high-quality, 20 low-quality
Need: 20 - (2 + 1 + 3) = 14 more
Output:
  - restaurants: [2 claimed]
  - unclaimedRestaurants: [1 DB + 3 high-quality + 14 low-quality imported]
  - Google API: DA ($0.032)
  - DB imports: 17 novih restorana (basic info)
  - Total: 20 restorana
  - Sljedeći user: $0 (sve iz baze!)
```

### Cost Analiza (HYBRID Strategija)

| Scenarij | % slučajeva | Google API cost | Sljedeći useri |
| --- | --- | --- | --- |
| Veliki grad (≥20 claimed) | ~60% | $0 | $0 |
| Srednji grad (≥20 ukupno u DB) | ~30% | $0 | $0 |
| Mali grad (Google API) | ~10% | $0.032 (prvi put!) | **$0** (iz baze!) |

**Mjesečni cost (10,000 homepage loadova):**
- Stara strategija (cache): ~$32
- **Nova strategija (hybrid): ~$3.20** (10x jeftinije!)

**Lazy full details cost:** $0.017 po restoranu (samo kad user klikne za detalje)

---

## 2. Global Search API

**Endpoint:** `GET /api/global-search`**Svrha:** Pretraga restorana po imenu ili jelu, globalno (cijeli svijet)

### Request

```bash
GET /api/global-search?query=pizzeria&latitude=45.815&longitude=15.982
```

### Načini Rada (Search Modes)

Global Search automatski detektira 3 različita načina rada:

### Način A: Menu Search (pretraga jela)

**Trigger:** Query sadrži zarez

```
query=pizza, carbonara, tiramisu
```

**Ponašanje:**
- Traži SAMO claimed restorane (unclaimed nemaju jelovnik)
- Maksimalni radijus: 60km
- Sortira po menu coverage (koliko stavki iz upita ima)
- NE koristi Google API
- NE koristi Extended DB search

**Response:**

```json
{
  "restaurants": [
    {
      "id": "uuid-123",
      "isClaimed": true,
      "source": "local",
      "distance": 5.2,
      "menuCoverage": 3,
      "menuItems": [
        "Pizza Margherita",
        "Carbonara",
        "Tiramisu"
      ]
    }
  ],
  "meta": {
    "mode": "menu_search",
    "tier": "local",
    "localCount": 12,
    "extendedCount": 0,
    "googleCount": 0
  }
}
```

### Način B: Filtered Search (filteri aktivni)

**Trigger:** Bilo koji filter je aktivan

```
query=pizza&dietaryTypeIds=1,2&minRating=4
```

**Filteri:**
- `dietaryTypeIds` (vegetarian, vegan, etc.)
- `priceCategoryIds`
- `minRating`
- `cuisineTypeIds`
- itd.

**Ponašanje:**
- Traži SAMO claimed restorane
- Maksimalni radijus: 60km
- Primjenjuje filtere
- NE koristi Google API
- NE koristi Extended DB search

**Response:**

```json
{
  "restaurants": [...filtered claimed...],
  "meta": {
    "mode": "filtered_search",
    "tier": "local",
    "localCount": 8,
    "extendedCount": 0,
    "googleCount": 0
  }
}
```

### Način C: Global Search (ime restorana)

**Trigger:**
- Query bez zareza
- NEMA aktivnih filtera

```
query=pizzeria milano
```

**Ponašanje:** 3-razinski sistem

### Razina 1: Local Search (0-60km)

- Traži claimed + unclaimed u lokalnom radijusu
- Ako pronađe ≥5 rezultata → GOTOVO
- Ako pronađe <5 → prelazi na Razinu 2

### Razina 2: Extended Database Search (cijeli svijet)

- Traži claimed + unclaimed širom svijeta (ignoring distance)
- Dodaje `isDistant: true` flag za restorane >60km
- Ako ukupno ≥5 → GOTOVO
- Ako ukupno <5 → prelazi na Razinu 3

### Razina 3: Google Places Text Search + IMMEDIATE BASIC IMPORT

- Poziva Google Places Text Search API ($0.032)
- Filtrira po kvaliteti:
    - rating ≥4.0 ★
    - reviews ≥10
    - match score ≥0.8 (relevantnost prema upitu)
- Provjerava duplikate po `placeId`
- **ODMAH IMPORTA u bazu** (basic info, BEZ Place Details API poziva)
- Dodaje importane rezultate

**Match Score Calculation:**

```jsx
// Bodovanje koliko dobro Google rezultat odgovara upituconst calculateMatchScore = (place, query) => {
  let score = 0;  const queryLower = query.toLowerCase();  const nameLower = place.name.toLowerCase();  // Exact match = 1.0  if (nameLower === queryLower) return 1.0;  // Starts with query = 0.9  if (nameLower.startsWith(queryLower)) score += 0.9;  // Contains all words from query = 0.8  const queryWords = queryLower.split(' ');  if (queryWords.every(word => nameLower.includes(word))) score += 0.8;  // Partial match = 0.5  if (nameLower.includes(queryLower)) score += 0.5;  return Math.min(score, 1.0);};
```

**Response:**

```json
{
  "restaurants": [
    {
      "id": "uuid-123",
      "name": "Restoran Zagreb",
      "isClaimed": true,
      "slug": "restoran-zagreb",
      "distance": 5.2,
      "rating": 4.7,
      "thumbnailUrl": "...",
      "address": "...",
      "... svi ostali podaci za claimed ..."
    },
    {
      "id": "uuid-456",
      "slug": "trattoria-roma",
      "name": "Trattoria Roma",
      "address": "Via Milano 45",
      "distance": 523.1,
      "rating": 4.3,
      "isClaimed": false
    }
  ],
  "meta": {
    "mode": "global_search",
    "tier": "google",
    "localCount": 2,
    "extendedCount": 3,
    "googleCount": 5
  }
}
```

**VAŽNO:** Svi restorani sada imaju pravi UUID i slug! Nema više `google:` prefixa.

**Unclaimed restorani:** Vraćaju se u pojednostavljenom formatu (samo: id, slug, name, address, distance, rating, isClaimed) - vidi Near-You sekciju za detalje.

### Sortiranje - KRITIČNO PRAVILO

**CLAIMED restorani UVIJEK dolaze prvi**, bez obzira na:
- Udaljenost
- Rating
- Match score

```
Primjer:
1. Pizzeria A (claimed, Zagreb, 5km)           ← CLAIMED
2. Restoran B (claimed, Split, 250km)          ← CLAIMED
3. Bistro C (claimed, Dubrovnik, 500km)        ← CLAIMED
4. ──────────────────────────────────────────
5. Gostilna D (unclaimed, Zagreb, 3km)         ← UNCLAIMED (bliže, ali nakon svih claimed)
6. Trattoria E (unclaimed, Milano, 450km)      ← UNCLAIMED
```

Unutar svake grupe:
- **Claimed:** sortira po `smartScore` (kombinacija distance, rating, popularity)
- **Unclaimed:** sortira po `matchScore` (za Google), zatim `distance`

### Response Fields Reference

| Field | Description | Example |
| --- | --- | --- |
| `source` | Odakle dolazi rezultat | `"local"`, `"extended"`, `"google"`, `"google_cache"` |
| `isDistant` | >60km udaljenost | `true` / `false` |
| `isImported` | Je li u bazi | `true` / `false` |
| `placeId` | Google Place ID | `"ChIJ123..."` |
| `matchScore` | Relevantnost (Google) | `0.85` |
| `distance` | Udaljenost u km | `5.2` |
| `rating` | Ocjena | `4.5` |
| `userRatingsTotal` | Broj recenzija | `234` |

### Primjeri Scenarija

### Scenarij 1: Menu search

```
Input: query=pizza, pasta, salad
Mode: menu_search
Tier: local
Output:
  - Samo claimed (0-60km)
  - Sorted by menu coverage
  - Google API: NE
```

### Scenarij 2: Filtered search

```
Input: query=italian&dietaryTypeIds=1&minRating=4.5
Mode: filtered_search
Tier: local
Output:
  - Samo claimed (0-60km) koji zadovoljavaju filtere
  - Google API: NE
```

### Scenarij 3: Global search - local only

```
Input: query=pizzeria dubrovnik
Local: 8 claimed + 3 unclaimed
Mode: global_search
Tier: local
Output:
  - 8 claimed first, 3 unclaimed after
  - Google API: NE (već ima ≥5)
```

### Scenarij 4: Global search - extended DB

```
Input: query=pizzeria milano
Local: 2 claimed
Extended: +3 claimed (Milano, Italy)
Mode: global_search
Tier: extended
Output:
  - 5 claimed (2 local + 3 distant)
  - distant ima isDistant: true
  - Google API: NE (već ima ≥5)
```

### Scenarij 5: Global search - full tier 3

```
Input: query=very specific restaurant name
Local: 1 claimed
Extended: +1 claimed
Google: 8 results (5 high-quality cached)
Mode: global_search
Tier: google
Output:
  - 2 claimed first (1 local + 1 distant)
  - 5 unclaimed cached after
  - Total: 7 results
  - Google API: DA
```

### Cost Analiza

| Scenarij | % slučajeva | Google API cost |
| --- | --- | --- |
| Menu search | 15% | $0 |
| Filtered search | 25% | $0 |
| Global - local only | 50% | $0 |
| Global - extended DB | 8% | $0 |
| Global - Google API | 2% | $0.032 |

**Mjesečni cost (10,000 searcheva):** ~$6-7

---

## 3. HYBRID Import Mehanizam

Oba sistema koriste **HYBRID pristup** za Google rezultate.

### Što je HYBRID import?

Kombinira najbolje od oba pristupa:
1. **Immediate Basic Import** - Google rezultati se ODMAH importaju u bazu (basic info)
2. **Lazy Full Details** - Phone, openingHours se dohvaćaju tek kad user klikne

### Zašto HYBRID?

**Stari pristup (cache):**

```
- 40 Google rezultata → samo cache u memoriji
- Cache se gubi nakon restart
- Svaki user plaća Google API ($0.032)
- ID format: google:ChIJ123 (problematično za FE)
```

**Novi pristup (HYBRID):**

```
- 40 Google rezultata → ODMAH importa basic info u bazu
- Persistence - podaci ostaju u bazi zauvijek
- Samo PRVI user plaća Google API ($0.032)
- Pravi UUID i slug odmah
- Full details se lazy load-aju na klik ($0.017)
```

### Import Flow

### 1. Immediate Basic Import (Near-You / Global Search)

```jsx
// Kad Google API vrati rezultate
for (const place of googleResults) {
  // ODMAH importa u bazu (basic info, NO Place Details call)
  const restaurant = await importUnclaimedRestaurantBasic(place);
  // restaurant ima: UUID, slug, name, address, rating
  // restaurant NEMA: openingHours, phone (null)
}
```

### 2. Lazy Full Details (View Details)

```jsx
// restaurantController.js - getFullRestaurantDetails
const restaurant = await Restaurant.findByPk(id);

// Check if needs full details
if (!restaurant.openingHours && restaurant.placeId) {
  // Fetch from Google Place Details API ($0.017)
  await updateRestaurantFromGoogle(restaurant.placeId, restaurant.id);
  // Now restaurant has: openingHours, phone, website
}

return restaurant; // Full details
```

### Duplicate Prevention

**Problem:** Google može vratiti restoran koji je već u bazi

**Rješenje:** Provjera po `placeId` PRIJE importa

```jsx
// Build set of existing placeIds
const existingPlaceIds = new Set(
  existingRestaurants
    .filter(r => r.placeId)
    .map(r => r.placeId)
);

// Filter duplicates BEFORE import
for (const place of googleResults) {
  if (existingPlaceIds.has(place.placeId)) {
    console.log(`Skipping duplicate: ${place.name}`);
    continue;
  }
  // Import only new restaurants
  await importUnclaimedRestaurantBasic(place);
}
```

---

## 5. Google Places API Costs (HYBRID Strategija)

### API Calls

| API | Koristi | Cost per call |
| --- | --- | --- |
| Nearby Search | Near-You Tier 3 | $0.032 |
| Text Search | Global Search Tier 3 | $0.032 |
| Place Details | Lazy full details | $0.017 |

### Mjesečna Procjena (HYBRID vs Cache)

**Pretpostavke:**
- 10,000 homepage loadova/mjesec
- 10,000 searcheva/mjesec
- Prosječno 100 različitih lokacija
- 20% korisnika klikne za full details

**STARA STRATEGIJA (Cache) - svaki user plaća:**

```
Near-You:
  - 10% poziva ide na Google API = 1,000 × $0.032 = $32.00

Global Search:
  - 2% poziva ide na Google API = 200 × $0.032 = $6.40

TOTAL: ~$40/mjesec
```

**NOVA STRATEGIJA (HYBRID) - samo prvi user po lokaciji plaća:**

```
Near-You:
  - 100 lokacija × $0.032 = $3.20 (10x manje!)

Global Search:
  - 50 unique queries × $0.032 = $1.60 (4x manje!)

Lazy Full Details:
  - 20% od 150 importanih = 30 × $0.017 = $0.51

TOTAL: ~$5.31/mjesec (8x jeftinije!)
```

### Cost Comparison Summary

| Metrika | Stara (Cache) | Nova (HYBRID) | Ušteda |
|---------|---------------|---------------|--------|
| Near-You | $32.00 | $3.20 | **90%** |
| Global Search | $6.40 | $1.60 | **75%** |
| Lazy Details | $1.02 | $0.51 | **50%** |
| **TOTAL** | **$39.42** | **$5.31** | **87%** |

**Best case (veliki grad):** ~$0.50/mjesec (samo lazy details)
**Worst case (100% mali gradovi):** ~$15/mjesec (sve lokacije + details)

---

## 6. Performance Expectations

### Near-You Latency

| Scenarij | Latency |
| --- | --- |
| Tier 1 only (≥20 claimed) | 50-100ms |
| Tier 2 (DB unclaimed) | 100-150ms |
| Tier 3 (Google API) | 500-800ms |

### Global Search Latency

| Scenarij | Latency |
| --- | --- |
| Menu/Filtered search | 100-200ms |
| Tier 1 (local) | 100-200ms |
| Tier 2 (extended DB) | 200-300ms |
| Tier 3 (Google API) | 600-900ms |

---