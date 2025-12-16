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

Near-You koristi **3-razinski sistem** + **Proximity Check** za popunjavanje homepage-a:

**Konstante:**
- `TARGET_TOTAL_RESTAURANTS = 100` - Cilj ukupno restorana
- `NEARBY_RADIUS_KM = 3` - Radius za provjeru gustoće (realistična "blizina")
- `MIN_NEARBY_RESTAURANTS = 5` - Minimum restorana unutar 3km

### Razina 1: Claimed restorani (0-60km)

- Traži claimed restorane u radijusu od 60km
- Broji koliko ih je unutar 5km (`claimedNearby`)
- Ako ima ≥100 claimed → prelazi na proximity check
- Ako ima <100 claimed → prelazi na Razinu 2

### Razina 2: Unclaimed restorani iz baze (0-60km)

- Dohvaća unclaimed restorane koji su već u bazi
- Broji koliko ih je unutar 5km (`unclaimedNearby`)
- Računa ukupan broj: `claimed + unclaimed`
- Ako ukupno ≥100 → prelazi na proximity check
- Ako ukupno <100 → prelazi na Razinu 3

### Proximity Check

**Problem koji rješava:** User 1 u Istoku Berlina importa 100 restorana. User 2 u Zapadu Berlina vidi samo restorane daleko od sebe (svi su na Istoku).

**Rješenje:** Čak i ako ima 100+ restorana u bazi unutar 60km, provjeriti ima li user dovoljno restorana BLIZU sebe (unutar 3km).

```
totalNearbyClose = claimedNearby + unclaimedNearby (unutar 3km)

if (totalNearbyClose < 5):
  → ZOVI Google API (čak i ako ima 100+ u 60km!)
  → Koristi EXPANDING RADIUS strategiju
```

### Razina 3: Google Nearby Search API + EXPANDING RADIUS + IMMEDIATE BASIC IMPORT

**EXPANDING RADIUS strategija:**

Umjesto jednog fiksnog radiusa, koristi se postupno širenje dok se ne pronađe dovoljno restorana:

1. **Proximity fetch** (totalNearbyClose < 5):
   - Koraci: **10km → 20km → 40km**
   - Cilj: Dobiti restorane BLIZU usera
   - Zaustavlja se kad pronađe ≥20 restorana

2. **Total count fetch** (totalNearby < 100):
   - Koraci: **30km → 45km → 60km**
   - Cilj: Popuniti do 100 restorana
   - Zaustavlja se kad pronađe ≥20 restorana

```javascript
const RADIUS_STEPS = needsProximityFetch
  ? [10000, 20000, 40000]  // 10km → 20km → 40km za proximity
  : [30000, 45000, 60000]; // 30km → 45km → 60km za total count

for (const searchRadius of RADIUS_STEPS) {
  googleResults = await searchNearbyRestaurants(..., searchRadius);
  if (googleResults.length >= 20) break; // Dovoljno!
}
```

**Zašto expanding radius?**
- Manji grad: Počinje s 10km, širi se dok ne nađe restorane
- Veliki grad: Već na 10km ima 20+, ne širi dalje
- Garantira da user uvijek dobije smislene rezultate

**Import proces:**
- Poziva Google Places Nearby Search ($0.032)
- Filtrira rezultate u 2 kategorije:
    - **High-quality:** rating ≥4.0 ★ AND reviews ≥10
    - **Low-quality:** svi ostali
- Provjerava duplikate po `placeId` (PRIJE bilo kakvog procesiranja)
- **ODMAH IMPORTA u bazu** (basic info, BEZ Place Details API poziva)
- Vraća high-quality restorane
- Ako još uvijek nema dovoljno → dodaje i low-quality

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
      "place": "Zadar",
      "country": "Croatia",
      "distance": 8.3,
      "rating": 4.3,
      "reviewsCount": 12,
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
| `place` | Grad/mjesto |
| `country` | Država |
| `distance` | Udaljenost u km |
| `rating` | **SAMO Dinver rating** (null ako nema recenzija) |
| `reviewsCount` | **SAMO Dinver recenzije** (0 ako nema recenzija) |
| `isClaimed` | Uvijek `false` |

**VAŽNO:**
- `rating` i `reviewsCount` su **UVIJEK** iz Dinver baze (`dinverRating` i `dinverReviewsCount`)
- **NE koristi se Google rating kao fallback** - ako nema Dinver recenzija, vraća `null`/`0`
- Ovo osigurava konzistentnost - svi restorani pokazuju SAMO Dinver ratings

**Zašto?**
1. Unclaimed restorani nemaju thumbnail, opis, menu itd. - prikazujemo samo ono što imamo
2. Google ratings nisu relevantni za Dinver platformu - želimo prikazati samo naše recenzije

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

**Thresholds (DYNAMIC):**
- **Name Search** (baš ime restorana):
  - `TIER2_THRESHOLD = 3` - Idi na Extended DB ako ima < 3 lokalna rezultata
  - `TIER3_THRESHOLD = 5` - Idi na Google ako ima < 5 ukupnih rezultata
- **Fallback** (ako nije name search):
  - `TIER2_THRESHOLD = 10`
  - `TIER3_THRESHOLD = 20`

**TIER 3 Smart Trigger - Balance Quality & Cost (NOVO!):**

Google API se poziva ako **BILO KOJI** od sljedećih uvjeta:
1. **Premalo rezultata**: Ukupno < 5 rezultata
2. **Nema exact match NEARBY**: Nema exact/starts-with match u **blizini (< 5km)** + ima **< 3 nearby** rezultata

**Logika:**
```javascript
shouldCallGoogle =
  allResults.length < 5 ||                          // Scenario 1
  (!hasExactMatchNearby && nearbyResults < 3);     // Scenario 2
```

**Primjeri:**

**✅ Scenario 1: "Pizzeria 14" (specifičan restoran)**
```
DB: 100 pizzerija
Nearby (< 5km): 5 pizzerija ("Pizzeria Napoli", "Pizzeria Roma", ...)
Exact match nearby? NE ❌
nearbyResults < 3? NE (5 > 3)
→ NE zovi Google ❌ (ima dovoljno nearby opcija)
```

**✅ Scenario 2: "Marabu" (distant exact match)**
```
DB: 1 restoran ("Marabu Caffe" - 227km distant)
Nearby (< 5km): 0
Exact match nearby? NE ❌
nearbyResults < 3? DA (0 < 3)
→ Zovi Google! ✅ (može biti Marabu u blizini)
```

**✅ Scenario 3: "Pizza" (generic, many results)**
```
DB: 200 restorana
Nearby (< 5km): 15 restorana
Exact match nearby? NE, ali ima starts-with
nearbyResults < 3? NE (15 > 3)
→ NE zovi Google ❌ (previše troškova za generic query)
```

**✅ Scenario 4: "Pizzeria XYZ" (novi restoran)**
```
DB: 100 pizzerija
Nearby (< 5km): 2 pizzerije
Exact match nearby? NE ❌
nearbyResults < 3? DA (2 < 3)
→ Zovi Google! ✅ (možda je "Pizzeria XYZ" u blizini)
```

**Zašto ovako?**
- **Balansira kvalitetu i trošak** - ne zove Google za svaki generic query
- User traži specifičan restoran - 3-5 nearby opcija je dovoljno
- Ako user ne nađe što traži, može refinati query
- Slično kako Google Maps/BELI rade
- **Šteđenje troškova**: Ne zove Google za "pizza", "italian" itd. kad već ima 10+ nearby

### Razina 1: Local Search (0-60km) + **FUZZY MATCHING**

- Traži claimed + unclaimed u lokalnom radijusu
- **PostgreSQL Trigram Search** (pg_trgm extension):
  - Fuzzy matching: "basc" → "Baščaršija" ✅
  - Typo tolerance: "bascr" → "Baschiera" ✅, "pizzria" → "Pizzeria" ✅
  - Fallback na exact substring match (LIKE)
- Ako pronađe ≥3 rezultata → GOTOVO (name search)
- Ako pronađe <3 → prelazi na Razinu 2

### Razina 2: Extended Database Search (cijeli svijet) + **SMART FILTERING**

- Traži claimed + unclaimed širom svijeta (ignoring distance)
- **SMART FILTERING** (NOVO!):
  - Ako pronađe > 100 rezultata → filtrira na max ~60:
    - **Exact matches** (bilo gdje)
    - **Top 50 nearby** (< 50km) po distance
    - **Top 10 distant exact matches** (> 50km)
  - Sprečava performance probleme (500+ pizzerija u bazi)
- Dodaje `isDistant: true` flag za restorane >60km
- Ako ukupno (Local + Extended) ≥5 → GOTOVO (name search)
- Ako ukupno <5 → prelazi na Razinu 3

### Razina 3: Google Places Text Search + **STRICT NAME FILTERING** + DUPLICATE CHECK

- Poziva Google Places Text Search API ($0.032)
- **STRICT NAME FILTERING** (NEW!):
    - `matchScore ≥ 0.5` - Ime mora sadržavati dio query-ja
    - Eliminira irelevantne rezultate ("River pub" za "basc" ❌)
    - Primjer: "basc" → samo restorani s "basc" u imenu
- **BULK DUPLICATE CHECK** (NEW!):
    - Provjerava SVE placeId-ove odjednom PRIJE importa
    - Vraća postojeće restorane iz baze umjesto poziva `importUnclaimedRestaurantBasic`
    - Importa samo nove restorane
    - **Sprečava duplikate + drugi API poziv za iste rezultate**
- Filtrira po kvaliteti:
    - rating ≥4.0 ★
    - reviews ≥10
    - match score ≥0.8 (high-quality)
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
      "place": "Milano",
      "country": "Italy",
      "distance": 523.1,
      "rating": 4.3,
      "reviewsCount": 45,
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

**Unclaimed restorani:** Vraćaju se u pojednostavljenom formatu (samo: id, slug, name, address, place, country, distance, rating, reviewsCount, isClaimed) - vidi Near-You sekciju za detalje.

### Sortiranje - EXACT MATCH PRIORITY + Claimed First

**SmartScore Calculation (NOVO!):**

Svi restorani dobivaju `smartScore` za sortiranje:

```javascript
// Exact match detection
const nameMatchType = getNameMatchType(query, restaurant.name);
const exactMatchBoost = nameMatchType === 'exact' ? 500 : 0;      // "Pizzeria 14" === "Pizzeria 14"
const startsWithBoost = nameMatchType === 'startsWith' ? 200 : 0;  // "Pizzeria" starts with "Pizzeria 14"

// Distance & rating
const distanceWeight = 1 / (1 + distance); // Bliže = bolje
const ratingBoost = (rating / 5) * 3;      // Viši rating = bolje

smartScore = exactMatchBoost + startsWithBoost + distanceWeight * 12 + ratingBoost;
```

**Primjeri:**
- "Pizzeria 14" exact match: **~505** (500 + 2.28 + 2.7)
- "Pizzeria Stara Sava" starts with: **~202** (200 + 2.28 + 0)
- Random pizzeria: **~5** (0 + 2.28 + 2.7)

**Sortiranje:**

**CLAIMED restorani UVIJEK dolaze prvi**, ALI sortirani po `smartScore`:

```
Primjer 1 (Exact match u claimed):
1. Pizzeria 14 (claimed, exact match, smartScore: 505)     ← EXACT MATCH PRVO!
2. Pizzeria A (claimed, Zagreb, smartScore: 202)           ← STARTS WITH
3. Restoran B (claimed, Split, smartScore: 5)              ← CLAIMED
4. ──────────────────────────────────────────
5. Gostilna D (unclaimed, Zagreb, smartScore: 202)         ← UNCLAIMED (bliže, ali nakon svih claimed)

Primjer 2 (Exact match u unclaimed):
1. Pizzeria A (claimed, Zagreb, smartScore: 202)           ← CLAIMED PRVO (čak i bez exact matcha)
2. Restoran B (claimed, Split, smartScore: 5)              ← CLAIMED
3. ──────────────────────────────────────────
4. Pizzeria 14 (unclaimed, exact match, smartScore: 505)   ← UNCLAIMED (exact match, ali poslije claimed)
5. Gostilna D (unclaimed, Zagreb, smartScore: 202)         ← UNCLAIMED
```

Unutar svake grupe:
- **Claimed:** sortira po `smartScore` (exact match → starts with → distance → rating)
- **Unclaimed:** sortira po `smartScore` (exact match → starts with → distance → rating)

### Pagination - BELI Style (NOVO!)

**Page Limit:**
- **Global Search** (ime restorana): **5 rezultata po stranici** + Load more
- **Menu/Filter Search**: 20 rezultata po stranici

**Zašto 5 za Global Search?**
- User traži specifičan restoran - top 5 je dovoljno
- Slično BELI, Google Maps - prikazuju top rezultate prvo
- Ako nema što traži, user će refinati query
- Bolja UX - fokusirani top rezultati umjesto scrollanja 20+

**Response:**
```json
{
  "restaurants": [...5 top results...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 12,
    "totalRestaurants": 59
  }
}
```

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
Local: 15 claimed + 8 unclaimed = 23 total
Mode: global_search
Tier: local
Output:
  - 15 claimed first, 8 unclaimed after
  - Google API: NE (već ima ≥10 local, ≥20 total)
```

### Scenarij 4: Global search - extended DB

```
Input: query=pizzeria milano
Local: 7 claimed (< 10 → ide na Tier 2)
Extended: +15 claimed (Milano, Italy) = 22 total
Mode: global_search
Tier: extended
Output:
  - 22 claimed (7 local + 15 distant)
  - distant ima isDistant: true
  - Google API: NE (ukupno ≥20)
```

### Scenarij 5: Global search - full tier 3

```
Input: query=very specific restaurant name
Local: 3 claimed (< 10 → Tier 2)
Extended: +5 claimed = 8 total (< 20 → Tier 3)
Google: 18 results → 12 importano u bazu
Mode: global_search
Tier: google
Output:
  - 8 claimed first (3 local + 5 distant)
  - 12 unclaimed imported after
  - Total: 20 results
  - Google API: DA ($0.032)
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

## 7. PostgreSQL Trigram Fuzzy Search

**Problem:**
- PostgreSQL `ILIKE '%basc%'` traži **exact substring** - mora biti "basc" u imenu
- ❌ "bascr" → NE match-a "Baščaršija"
- ❌ "pizzria" (typo) → NE match-a "Pizzeria"
- ❌ Nema typo tolerance

**Rješenje: pg_trgm Extension**
- PostgreSQL built-in extension (besplatno, ne treba Elasticsearch!)
- **Fuzzy matching** sa similarity scoring (0-1)
- **Typo tolerance**: "pizzria" → "Pizzeria" (0.7 similarity)
- **Fast GIN indexes** za brze upite

### Primjeri

```sql
-- Stari način (ILIKE) - samo exact substring
SELECT * FROM Restaurants WHERE name ILIKE '%basc%';
-- Rezultat: "Baščaršija" ✅, "Baschiera" ❌ (nema "basc")

-- Novi način (Trigram) - fuzzy matching
SELECT *, similarity(name, 'basc') as score
FROM Restaurants
WHERE similarity(name, 'basc') > 0.3
ORDER BY score DESC;
-- Rezultat:
--   "Baščaršija" (0.6) ✅
--   "Baschiera" (0.5) ✅
--   "Fast food Tabasco" (0.4) ✅
```

### Implementacija

**Migration:**
```javascript
// Enable extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

// Create GIN trigram indexes
CREATE INDEX restaurants_name_trigram_idx
  ON "Restaurants" USING gin (name gin_trgm_ops);
```

**Search Query:**
```javascript
// Kombinacija fuzzy + exact
const nameConditions = searchTerms.flatMap((term) => [
  createTrigramSimilarityCondition('name', term, 'Restaurant', 0.3), // Fuzzy
  createNormalizedLikeCondition('name', term, 'Restaurant'),         // Exact fallback
]);
```

### Performance

| Search Type | Latency | Index |
|-------------|---------|-------|
| ILIKE without index | 500-1000ms | None |
| ILIKE with btree | 200-300ms | B-tree |
| **Trigram with GIN** | **50-100ms** | **GIN** |

---

## 8. Google API Logs (Monitoring & Cost Tracking)

Svi Google Places API pozivi se logiraju u `GoogleApiLogs` tablicu za monitoring i cost tracking.

### Tablica Struktura

```sql
GoogleApiLogs:
  id              UUID PRIMARY KEY
  apiType         VARCHAR(50)    -- 'nearby_search', 'text_search', 'place_details'
  latitude        DECIMAL(10,8)
  longitude       DECIMAL(11,8)
  place           VARCHAR(255)   -- Grad (ako znamo)
  country         VARCHAR(100)   -- Država (ako znamo)
  query           VARCHAR(500)   -- Search query (za text_search)
  radiusMeters    INTEGER        -- Search radius
  resultsCount    INTEGER        -- Koliko je Google vratio
  importedCount   INTEGER        -- Koliko smo importali
  costUsd         DECIMAL(10,6)  -- Cost tog poziva
  triggeredBy     VARCHAR(50)    -- 'near_you', 'global_search', 'view_details'
  triggerReason   VARCHAR(255)   -- Zašto je pozvan API
  userId          UUID           -- Koji user je triggerao (opcionalno)
  success         BOOLEAN        -- Je li poziv uspio
  errorMessage    TEXT           -- Error poruka ako nije uspio
  createdAt       TIMESTAMP
```

### Cost po API tipu

| API Type | Cost per call |
|----------|---------------|
| `nearby_search` | $0.032 |
| `text_search` | $0.032 |
| `place_details` | $0.017 |

### Primjeri Query-ja za Dashboard

```sql
-- Dnevni trošak
SELECT DATE(createdAt) as date, SUM(costUsd) as daily_cost
FROM GoogleApiLogs
GROUP BY DATE(createdAt)
ORDER BY date DESC;

-- Po državi
SELECT country, COUNT(*) as calls, SUM(costUsd) as total_cost
FROM GoogleApiLogs
WHERE country IS NOT NULL
GROUP BY country
ORDER BY total_cost DESC;

-- Po API tipu
SELECT apiType, COUNT(*) as calls, SUM(costUsd) as total_cost
FROM GoogleApiLogs
GROUP BY apiType;

-- Po triggeru (near_you vs global_search)
SELECT triggeredBy, COUNT(*) as calls, SUM(costUsd) as total_cost
FROM GoogleApiLogs
GROUP BY triggeredBy;

-- Failed calls
SELECT * FROM GoogleApiLogs
WHERE success = false
ORDER BY createdAt DESC;
```

### Model Helper Metode

```javascript
// Ukupni trošak za period
const cost = await GoogleApiLog.getTotalCost(startDate, endDate);

// Trošak po API tipu
const byType = await GoogleApiLog.getCostByApiType(startDate, endDate);
// Returns: [{ apiType: 'nearby_search', callCount: 150, totalCost: 4.80 }, ...]

// Trošak po državi
const byCountry = await GoogleApiLog.getCostByCountry(startDate, endDate);
// Returns: [{ country: 'Germany', callCount: 50, totalCost: 1.60 }, ...]
```

---

---

## 9. Sažetak Najnovijih Izmjena (Prosinac 2025)

### 1. **Rating System - SAMO Dinver Ratings**

**Promjena:** Svi restorani (claimed i unclaimed) vraćaju SAMO Dinver ratings u API response-u.

**Prije:**
```json
{
  "rating": 4.3,              // Google rating (fallback)
  "reviewsCount": 80,         // Google reviews
  "dinverRating": null,
  "dinverReviewsCount": 0
}
```

**Poslije:**
```json
{
  "rating": null,             // SAMO Dinver rating (null ako nema)
  "reviewsCount": 0           // SAMO Dinver reviews (0 ako nema)
}
```

**Razlog:** Konzistentnost - prikazujemo samo Dinver recenzije, ne Google ratings.

---

### 2. **Exact Match Priority Scoring**

**Promjena:** SmartScore sada prioritizira exact i starts-with matcheve.

**Scoring:**
- Exact match: **+500 boost** ("Pizzeria 14" === "Pizzeria 14")
- Starts with: **+200 boost** ("Pizzeria 14" starts with "Pizzeria")
- Distance: **+12 max**
- Rating: **+3 max**

**Rezultat:**
- "Pizzeria 14" exact: smartScore ~505
- "Pizzeria Stara Sava" starts: smartScore ~202
- Random pizzeria: smartScore ~5

---

### 3. **Smart Google Trigger - Quality + Cost Balance**

**Promjena:** Google se poziva pametnije - balansira kvalitetu i trošak.

**Stara logika (SKUPO!):**
```
Query: "Pizza"
DB: 200 restorana
Exact match? NE ❌
→ Zovi Google! ✅ ($0.032) - za SVAKI generic query!
Cost: 60-80% upita = $224/mjesec 💸
```

**Nova logika (PAMETNO!):**
```
Query: "Pizza"
DB: 200 restorana
Nearby (< 5km): 15 restorana
Exact match nearby? NE, ali ima starts-with
nearbyResults < 3? NE (15 > 3)
→ NE zovi Google ❌ (ima dovoljno opcija)
Cost: ~5-10% upita = $16-32/mjesec ✅
```

**Kada poziva Google:**
- Ima < 5 ukupno rezultata, ILI
- Nema exact match u blizini (< 5km) + ima < 3 nearby rezultata

**Kada NE poziva:**
- Generic queries ("pizza", "italian") sa 10+ nearby opcija
- Dovoljno rezultata (5+) sa dobrim matchevima

---

### 4. **Smart Filtering Tier 2**

**Promjena:** Tier 2 filtrira 500+ rezultata na ~60 najrelevantnijih.

**Rezultat:** Response time 20s → 300ms (60x brže!)

---

### 5. **Pagination - BELI Style**

**Promjena:** Global Search vraća 5 rezultata umjesto 20.

**Razlog:** User traži specifičan restoran - top 5 je dovoljno (kao BELI, Google Maps).

---

