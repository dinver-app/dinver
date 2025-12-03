# Near-You API - Improvements Complete ✅

## Status: IMPLEMENTIRANO I READY ZA TESTIRANJE

Sve promjene su implementirane u `nearYou` endpointu da budu konzistentne sa global-search logikom.

---

## 🔧 Što je promijenjeno?

### **1. Threshold: <10 → <20** ✅

**PRIJE:**
```javascript
if (withUrls.length < 10) // claimed threshold
if (totalNearby < 10)     // google threshold
```

**SADA:**
```javascript
if (withUrls.length < 20) // claimed threshold
if (totalNearby < 20)     // google threshold
```

**Razlog:** Homepage treba ~20 restorana za dobar UX. Ako ima 0 claimed ali 21 unclaimed u bazi → nema potrebe za Google API.

---

### **2. Duplicate Check PRIJE Importa** ✅

**PRIJE:**
```javascript
// Import SVE restorane
const importPromises = googleResults.map(async (place) => {
  const restaurant = await importUnclaimedRestaurantBasic(place);
  // ...
});

// Provjera duplicates NAKON importa (po ID)
const uniqueUnclaimed = allUnclaimed.reduce((acc, curr) => {
  if (!acc.find(r => r.id === curr.id)) {
    acc.push(curr);
  }
  return acc;
}, []);
```

**SADA:**
```javascript
// Build set of existing placeIds
const existingPlaceIds = new Set(
  existingUnclaimedWithDistance
    .filter(r => r.placeId)
    .map(r => r.placeId)
);

// Filter duplicates PRIJE bilo čega
for (const place of googleResults) {
  if (existingPlaceIds.has(place.placeId)) {
    console.log(`[nearYou] Skipping duplicate: ${place.name}`);
    continue;
  }
  // Process only new restaurants
}
```

**Razlog:** Sprječava pokušaj dupliciranog importa koji bi crashao na `slug` unique constraint.

---

### **3. High-Quality Filter** ✅

**PRIJE:**
```javascript
// SVE restorane tretira jednako, sve importa odmah
```

**SADA:**
```javascript
const isHighQuality =
  place.rating >= 4.0 &&
  place.userRatingsTotal >= 10;

if (isHighQuality) {
  highQuality.push(place);
} else {
  lowQuality.push(place);
}
```

**Razlog:** Homepage prikazuje samo kvalitetne restorane, osim ako nemamo dovoljno da dosegnemo 20.

---

### **4. Lazy Import umjesto Immediate** ✅

**PRIJE:**
```javascript
// Import ODMAH u bazu
const restaurant = await importUnclaimedRestaurantBasic(place);

return {
  id: restaurant.id,        // ← UUID iz baze
  slug: restaurant.slug,    // ← slug kreiran
  // ...
};
```

**SADA:**
```javascript
// NE importa, samo cache format
return {
  id: `google:${place.placeId}`,  // ← Special ID format
  slug: null,                      // ← No slug yet
  isImported: false,               // ← Flag: not in DB
  source: 'google_cache',          // ← Source type
  placeId: place.placeId,          // ← Za lazy import
  // ...
};
```

**Razlog:**
- Brže (ne čekamo 40 import operacija)
- Jeftinije (samo importamo što korisnik klikne)
- Konzistentno sa global-search

**Lazy import trigeri:**
- User klikne Save → `favoriteController.js` detektira `google:` i importa
- User klikne na restoran → `restaurantController.js` detektira `google:` i importa

---

### **5. Fallback na Low-Quality** ✅

**PRIJE:**
```javascript
// Vraća samo high-quality
```

**SADA:**
```javascript
// Check if we still need low-quality to reach 20
const currentTotal = withUrls.length + existingUnclaimedWithDistance.length + cachedHighQuality.length;
const needed = Math.max(0, 20 - currentTotal);

let cachedLowQuality = [];
if (needed > 0) {
  console.log(`[nearYou] Need ${needed} more to reach 20. Adding low-quality.`);
  cachedLowQuality = lowQuality.slice(0, needed).map(...);
}
```

**Razlog:** U manjim mjestima može biti < 20 high-quality restorana. Bolje prikazati low-quality nego prazan homepage.

**Hybrid sort će staviti:**
- High-quality + blizu = TOP
- High-quality + daleko = SREDINA
- Low-quality + blizu = DOLJE
- Low-quality + daleko = NAJDOLJE

---

### **6. Mixed Array (DB + Cached)** ✅

**Response format:**
```json
{
  "restaurants": [ ...claimed... ],
  "unclaimedRestaurants": [
    {
      "id": "uuid-1",
      "isImported": true,
      "source": "database",
      "rating": 4.5,
      "userRatingsTotal": 234,
      "hybridScore": 42.3,
      ...
    },
    {
      "id": "uuid-2",
      "isImported": true,
      "source": "database",
      "rating": 4.2,
      "userRatingsTotal": 89,
      "hybridScore": 38.1,
      ...
    },
    {
      "id": "google:ChIJ123",
      "isImported": false,
      "source": "google_cache",
      "placeId": "ChIJ123",
      "slug": null,
      "rating": 4.0,
      "userRatingsTotal": 45,
      "hybridScore": 35.7,
      ...
    },
    {
      "id": "google:ChIJ456",
      "isImported": false,
      "source": "google_cache",
      "placeId": "ChIJ456",
      "slug": null,
      "rating": 3.7,
      "userRatingsTotal": 12,
      "hybridScore": 28.2,
      ...
    }
  ],
  "pagination": { ... }
}
```

**Kako FE razlikuje:**
- `isImported: true` → U bazi, može odmah navigate na `/restaurant/${slug}`
- `isImported: false` → Cached, lazy import na Save ili View

---

## 📊 Logika - Detaljno

### **Scenarij 1: Ima ≥20 claimed**
```
Input: 25 claimed restorana
Output:
  restaurants: [25 claimed]
  unclaimedRestaurants: []
```

**Razlog:** Homepage je pun, ne treba unclaimed.

---

### **Scenarij 2: <20 claimed, ali claimed + unclaimed DB ≥20**
```
Input: 10 claimed, 15 unclaimed u bazi
Output:
  restaurants: [10 claimed]
  unclaimedRestaurants: [15 unclaimed iz baze, sortirano po hybrid score]

NO Google API call
```

**Razlog:** Već ima 25 ukupno u bazi, ne treba Google.

---

### **Scenarij 3: <20 ukupno → Google API + High-quality only**
```
Input: 8 claimed, 5 unclaimed u bazi
Total: 13 < 20

Google API finds:
  - 10 high-quality (rating ≥4.0, reviews ≥10)
  - 12 low-quality

High-quality fills us to 23 total → Don't need low-quality

Output:
  restaurants: [8 claimed]
  unclaimedRestaurants: [
    5 iz baze (isImported: true),
    10 high-quality cached (isImported: false)
  ]

Total: 23 (15 unclaimed)
```

---

### **Scenarij 4: <20 ukupno → Google API + Low-quality fallback**
```
Input: 5 claimed, 2 unclaimed u bazi
Total: 7 < 20

Google API finds:
  - 3 high-quality
  - 20 low-quality

After high-quality: 5 + 2 + 3 = 10 < 20
Need: 20 - 10 = 10 more

Output:
  restaurants: [5 claimed]
  unclaimedRestaurants: [
    2 iz baze (isImported: true),
    3 high-quality cached (isImported: false),
    10 low-quality cached (isImported: false)  ← Fallback
  ]

Total: 20 (15 unclaimed)
```

**Hybrid sort će sortirati:**
```
1. DB restoran (4.5★, 2km) → hybrid: 45.0
2. DB restoran (4.3★, 5km) → hybrid: 14.3
3. High-quality cached (4.6★, 8km) → hybrid: 10.2
4. High-quality cached (4.2★, 12km) → hybrid: 6.5
5. High-quality cached (4.0★, 15km) → hybrid: 5.0
...
11. Low-quality cached (3.8★, 3km) → hybrid: 19.0  ← Ovo je OK
12. Low-quality cached (3.5★, 10km) → hybrid: 6.4
13. Low-quality cached (3.2★, 20km) → hybrid: 3.0  ← Bottom
```

---

## 💰 Cost Analiza

### Prije (Immediate Import):
```
< 10 claimed → Google API call ($0.032)
                + 30 import operacija (FREE, samo DB writes)
                + Potencijalni slug duplicates (CRASH)
```

### Sada (Lazy Import):
```
< 20 claimed → Google API call ($0.032)
                + Cache format (FREE, samo memory)
                + Lazy import samo kad korisnik klikne ($0.017 per restaurant viewed)
```

**Primjer - 100 korisnika u malom mjestu:**
```
Prije:
  - 100 × $0.032 = $3.20 (Google Nearby Search)
  - 100 × 30 imports = 3000 importa u bazu (većina nikad neće biti kliknuti)
  - Total: $3.20 + storage costs

Sada:
  - 100 × $0.032 = $3.20 (Google Nearby Search)
  - ~10% korisnika klikne na cached restoran = 10 × $0.017 = $0.17
  - Total: $3.37 (ali samo 10 importa umjesto 3000!)
```

---

## 🧪 Testing Checklist

### **Test 1: Veliki grad (≥20 claimed)**
```bash
curl "http://localhost:3000/api/restaurants/near-you?latitude=45.815&longitude=15.982"
```

**Expected:**
- ✅ `restaurants`: 20 claimed
- ✅ `unclaimedRestaurants`: [] (prazan array)
- ✅ NO Google API call

---

### **Test 2: Srednji grad (<20 claimed, ali ≥20 ukupno u bazi)**
```bash
# Simuliraj: 10 claimed, 15 unclaimed u bazi
curl "http://localhost:3000/api/restaurants/near-you?latitude=44.12&longitude=15.23"
```

**Expected:**
- ✅ `restaurants`: 10 claimed
- ✅ `unclaimedRestaurants`: 15 iz baze (`isImported: true`)
- ✅ NO Google API call (već ima 25 u bazi)
- ✅ Svi sorted by hybrid score

---

### **Test 3: Mali grad (<20 ukupno → Google API, high-quality dovoljno)**
```bash
# Simuliraj: 5 claimed, 3 unclaimed u bazi
curl "http://localhost:3000/api/restaurants/near-you?latitude=43.51&longitude=16.44"
```

**Expected:**
- ✅ `restaurants`: 5 claimed
- ✅ `unclaimedRestaurants`:
  - 3 iz baze (`isImported: true`)
  - ~12 high-quality cached (`isImported: false`, `id` starts with "google:")
- ✅ Google API called
- ✅ NO low-quality (dovoljno high-quality)
- ✅ Total: ~15 unclaimed

---

### **Test 4: Vrlo mali grad (Google API + low-quality fallback)**
```bash
# Simuliraj: 2 claimed, 1 unclaimed u bazi, samo 3 high-quality na Google
curl "http://localhost:3000/api/restaurants/near-you?latitude=42.65&longitude=18.09"
```

**Expected:**
- ✅ `restaurants`: 2 claimed
- ✅ `unclaimedRestaurants`:
  - 1 iz baze (`isImported: true`)
  - 3 high-quality cached
  - 14 low-quality cached (da dosegne 20 total)
- ✅ Google API called
- ✅ Total: 18 unclaimed (ukupno 20 sa claimed)
- ✅ Hybrid sort: high-quality TOP, low-quality BOTTOM

---

### **Test 5: Lazy Import - Save**
```bash
curl -X POST "http://localhost:3000/api/favorites" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"restaurantId": "google:ChIJ123456789"}'
```

**Expected:**
- ✅ `favoriteController.js` detektira `google:` prefix
- ✅ Pozove `getPlaceDetails()` ($0.017)
- ✅ Importa u bazu sa `importUnclaimedRestaurant()`
- ✅ Response: `{ success: true, restaurant: { id: "uuid", slug: "..." } }`
- ✅ Sljedeći near-you call: restoran ima pravi UUID i `isImported: true`

---

### **Test 6: Lazy Import - View Details**
```bash
curl "http://localhost:3000/api/restaurants/google:ChIJ123456789" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:**
- ✅ `restaurantController.js` detektira `google:` prefix
- ✅ Pozove `getPlaceDetails()` ($0.017)
- ✅ Importa u bazu
- ✅ Response: Full restaurant details
- ✅ Sljedeći near-you call: restoran u bazi

---

### **Test 7: Duplicate Check**
```bash
# Prvo: Pozovi near-you (dobije cached restorane)
# Drugo: Jedan restoran se importa (Save ili View)
# Treće: Pozovi near-you opet
```

**Expected:**
- ✅ Prvi call: `google:ChIJ123` u `unclaimedRestaurants` (`isImported: false`)
- ✅ Lazy import: Restoran u bazi sa UUID
- ✅ Drugi call: Isti restoran sa UUID (`isImported: true`), NIJE duplicate!
- ✅ Google API ne vidi duplikat jer provjeravamo `existingPlaceIds`

---

## 📋 Log Messages - Što očekivati

### Normalan flow (veliki grad):
```
[nearYou] Found 25 claimed restaurants (>= 20). Not returning unclaimed.
```

### Mali grad flow:
```
[nearYou] Only 5 claimed restaurants. Checking unclaimed...
[nearYou] Only 8 total restaurants (5 claimed, 3 unclaimed). Fetching from Google...
[nearYou] Found 23 restaurants from Google Places
[nearYou] Already have 3 unclaimed in DB (checking duplicates)
[nearYou] Skipping duplicate: Pizzeria Milano (ChIJ123...)
[nearYou] After filtering: 15 high-quality, 7 low-quality (filtered 1 duplicates)
[nearYou] Need 0 more restaurants to reach 20. Skipping low-quality.
[nearYou] Final unclaimed: 18 total (3 DB + 15 high-quality cached + 0 low-quality cached)
```

### Vrlo mali grad flow:
```
[nearYou] Only 2 claimed restaurants. Checking unclaimed...
[nearYou] Only 3 total restaurants (2 claimed, 1 unclaimed). Fetching from Google...
[nearYou] Found 20 restaurants from Google Places
[nearYou] Already have 1 unclaimed in DB (checking duplicates)
[nearYou] After filtering: 3 high-quality, 16 low-quality (filtered 1 duplicates)
[nearYou] Need 14 more restaurants to reach 20. Adding low-quality restaurants.
[nearYou] Final unclaimed: 18 total (1 DB + 3 high-quality cached + 14 low-quality cached)
```

---

## 🔍 Response Field Reference

### Claimed Restaurant:
```json
{
  "id": "uuid-123",
  "name": "Restoran Dubrovnik",
  "isClaimed": true,
  "thumbnailUrl": "https://cdn.dinver.com/...",
  "slug": "restoran-dubrovnik",
  "distance": 5.2,
  "rating": 4.7,
  ...
}
```

### Unclaimed (DB):
```json
{
  "id": "uuid-456",
  "name": "Pizzeria Napoli",
  "isClaimed": false,
  "isImported": true,
  "source": "database",
  "slug": "pizzeria-napoli",
  "placeId": "ChIJxxx",
  "distance": 8.3,
  "rating": 4.3,
  "userRatingsTotal": 156,
  "hybridScore": 18.2,
  ...
}
```

### Unclaimed (Cached - High-Quality):
```json
{
  "id": "google:ChIJ789",
  "name": "Trattoria Roma",
  "isClaimed": false,
  "isImported": false,
  "source": "google_cache",
  "slug": null,
  "placeId": "ChIJ789",
  "distance": 12.5,
  "rating": 4.5,
  "userRatingsTotal": 234,
  "hybridScore": 7.2,
  ...
}
```

### Unclaimed (Cached - Low-Quality):
```json
{
  "id": "google:ChIJ999",
  "name": "Fast Food XYZ",
  "isClaimed": false,
  "isImported": false,
  "source": "google_cache",
  "slug": null,
  "placeId": "ChIJ999",
  "distance": 15.0,
  "rating": 3.2,
  "userRatingsTotal": 8,
  "hybridScore": 4.0,
  ...
}
```

---

## 🎯 Ključne Razlike: Near-You vs Global-Search

| Feature | Near-You | Global-Search |
|---------|----------|---------------|
| **Trigger** | Homepage load | User search query |
| **Claimed threshold** | <20 | N/A |
| **Google threshold** | <20 total | <3-5 results |
| **Google API** | Nearby Search | Text Search |
| **Import strategy** | Lazy (cache) | Lazy (cache) |
| **Quality filter** | ≥4.0★, ≥10 reviews | ≥4.0★, ≥10 reviews, ≥0.8 match |
| **Low-quality fallback** | YES (if <20) | NO |
| **Duplicate check** | BEFORE (by placeId) | BEFORE (by placeId) |
| **Response format** | Separate arrays | Single array |
| **Sorting claimed** | Distance | Claimed first, then criteria |
| **Sorting unclaimed** | Hybrid score | Claimed first, then criteria |

---

## ✅ Sve implementirano

1. ✅ Threshold <10 → <20
2. ✅ Duplicate check PRIJE importa
3. ✅ High-quality filter
4. ✅ Low-quality fallback za male gradove
5. ✅ Lazy import (Google cache format)
6. ✅ Mixed array (DB + cached)
7. ✅ Hybrid sort (quality first, low-quality last)
8. ✅ Removed unused import (`importUnclaimedRestaurantBasic`)

---

## 🚀 Next Steps

1. **Test** sve scenarije gore navedene
2. **Monitor logs** - provjerite console output tijekom testova
3. **Verify lazy import** - test Save i View details sa `google:` ID
4. **Check costs** - monitor Google API usage first week
5. **Deploy** na staging prije productiona

---

**Implementirano:** 2025-12-03
**Ready za testiranje:** YES ✅
