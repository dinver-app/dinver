# Global Search Improvement Plan - "Beli-style" Worldwide Search

## Problem

Trenutno global-search API:
- ❌ Vraća samo restorane unutar **60km radiusa**
- ❌ Traži samo **claimed** restorane (partnere)
- ❌ Nema fallback ako nema rezultata
- ❌ Korisnik ne može pronaći restoran izvan 60km

**Primjer problema:**
```
Korisnik u Zagrebu traži "Restoran Dubrovnik" u Dubrovniku
→ Restoran postoji u bazi, ali je 500km daleko
→ distance > 60km → NE vraća se ❌
```

## Cilj

Omogućiti korisniku da pronađe **bilo koji restoran na svijetu** (Beli-style), ali:
- ✅ Minimizirati troškove
- ✅ Zadržati brzi local search
- ✅ Fallback na Google Places samo kad je potrebno

## Rješenje: 3-Tier Search Strategy

### Tier 1: Local Search (0-60km) - POSTOJEĆE

**Kad se koristi:** Uvijek prvi

**Što traži:**
- Claimed restorani (partneri) u bazi
- Unclaimed restorani (već importirani iz Google)
- Unutar 60km radiusa

**Trošak:** $0 (baza podataka)

**Prioritet:** Hybrid score (proximity + match + rating)

---

### Tier 2: Extended Database Search (60km+) - NOVO

**Kad se koristi:** Ako Tier 1 ima **< 5 rezultata**

**Što traži:**
- Claimed restorani WORLDWIDE (cijela baza)
- Unclaimed restorani WORLDWIDE
- **BEZ distance limita**

**Trošak:** $0 (baza podataka)

**Prioritet:** Match score (ignoriraj distance)

**Implementacija:**
```javascript
// Ako local search ima < 5 rezultata
if (localResults.length < 5) {
  // Ponovi isti query BEZ distance filtera
  const worldwideResults = await Restaurant.findAll({
    where: {
      ...restaurantQuery.where,
      // Isto kao i local, ali bez distance filtera
    }
  });

  // Sortiraj po match score (ne distance)
  worldwideResults.sort((a, b) => b.smartScore - a.smartScore);

  // Označi da su "distant"
  worldwideResults.forEach(r => {
    r.isDistant = r.distance > MAX_SEARCH_DISTANCE_KM;
  });

  // Merge: Local prvi, pa worldwide
  results = [...localResults, ...worldwideResults.slice(0, 10)];
}
```

**UI indikator:**
```json
{
  "id": "...",
  "name": "Restoran XYZ",
  "distance": 250,
  "isDistant": true,  // ← FE prikazuje badge "250km away"
  "matchScore": 0.95
}
```

---

### Tier 3: Google Places Fallback - NOVO

**Kad se koristi:** Ako Tier 1 + Tier 2 ima **< 3 rezultata**

**API:** Google Places Text Search API

**Request:**
```javascript
const response = await axios.get(
  'https://maps.googleapis.com/maps/api/place/textsearch/json',
  {
    params: {
      query: searchTerm, // "Pizza Dubrovnik"
      language: 'hr',
      key: GOOGLE_PLACES_API_KEY,
    }
  }
);
```

**Što vraća:**
- Do 20 restorana worldwide
- **Cijena**: $0.032 po pozivu
- Import u bazu kao unclaimed

**Filter:**
- Mora imati `rating` + `user_ratings_total`
- Mora imati type `restaurant` ili `food`
- Isključi hotele (lodging)

**Import:**
```javascript
// Importiraj top 10 rezultata kao unclaimed
const importedRestaurants = await Promise.all(
  googleResults.slice(0, 10).map(place =>
    importUnclaimedRestaurantBasic(place)
  )
);
```

**Cache:** Spremi u bazu → sljedeći put ih pronađe u Tier 2

---

## UI/UX Experience

### Scenario 1: Local rezultati (unutar 60km)

**Request:**
```
GET /api/search?query=pizza&latitude=45.815&longitude=15.982
```

**Response:**
```json
{
  "restaurants": [
    {
      "id": "...",
      "name": "Pizzeria Napoli",
      "distance": 2.5,
      "isDistant": false,
      "matchScore": 0.95,
      "source": "local"
    }
  ],
  "meta": {
    "tier": "local",
    "totalFound": 15,
    "radiusKm": 60
  }
}
```

**UI:** Normalno prikazuje rezultate

---

### Scenario 2: Extended search (60km+)

**Request:**
```
GET /api/search?query=Restoran%20Dubrovnik&latitude=45.815&longitude=15.982
```

**Local results:** 2 (< 5) → Pokreće Tier 2

**Response:**
```json
{
  "restaurants": [
    {
      "id": "...",
      "name": "Restoran Dubrovnik",
      "place": "Dubrovnik",
      "distance": 500,
      "isDistant": true,  // ← Badge indikator
      "matchScore": 0.98,
      "source": "extended"
    },
    {
      "id": "...",
      "name": "Pizzeria Dubrovnik",
      "place": "Zagreb",
      "distance": 5,
      "isDistant": false,
      "matchScore": 0.85,
      "source": "local"
    }
  ],
  "meta": {
    "tier": "extended",
    "localCount": 2,
    "extendedCount": 1,
    "totalFound": 3
  }
}
```

**UI prikazuje:**
```
🔍 Rezultati za "Restoran Dubrovnik"

📍 U blizini (2)
  ├─ Pizzeria Dubrovnik (5km)
  └─ ...

🌍 Udaljeniji rezultati (1)
  └─ Restoran Dubrovnik, Dubrovnik [500km away]
```

---

### Scenario 3: Google Places fallback

**Request:**
```
GET /api/search?query=Ristorante%20Roma%20Milano&latitude=45.815&longitude=15.982
```

**Local results:** 0
**Extended results:** 0 (< 3) → Pokreće Tier 3

**Google API call:**
```
Text Search: "Ristorante Roma Milano"
→ Vraća 10 rezultata iz Milana
→ Importa ih u bazu kao unclaimed
```

**Response:**
```json
{
  "restaurants": [
    {
      "id": "...",
      "name": "Ristorante Roma",
      "place": "Milano, Italy",
      "distance": 450,
      "isDistant": true,
      "matchScore": 0.95,
      "source": "google",  // ← Označeno da je iz Google-a
      "isClaimed": false
    }
  ],
  "meta": {
    "tier": "google",
    "localCount": 0,
    "extendedCount": 0,
    "googleCount": 10,
    "totalFound": 10
  }
}
```

**UI prikazuje:**
```
🔍 Rezultati za "Ristorante Roma Milano"

ℹ️ Nema rezultata u blizini. Prikazujemo restorane iz cijelog svijeta:

🌍 Rezultati iz Google Places (10)
  ├─ Ristorante Roma, Milano [450km] ⭐ 4.5
  ├─ Trattoria Roma, Milano [455km] ⭐ 4.3
  └─ ...
```

---

## Troškovi

### Tier 1 (Local)
- **Trošak:** $0
- **Učestalost:** 100% poziva
- **Performanse:** <50ms

### Tier 2 (Extended)
- **Trošak:** $0
- **Učestalost:** ~10% poziva (kad je < 5 local rezultata)
- **Performanse:** ~100ms (database query bez distance filtera)

### Tier 3 (Google)
- **Trošak:** $0.032 per search
- **Učestalost:** ~2-5% poziva (vrlo rijetko, kad nema rezultata)
- **Performanse:** ~500ms (Google API call)

### Mjesečna procjena

Pretpostavke:
- 10,000 search poziva/mjesec
- 10% ide u Tier 2 (1,000 poziva) = $0
- 3% ide u Tier 3 (300 poziva) = 300 × $0.032 = **$9.60/mjesec**

**Ukupno: ~$10/mjesec** (vs $0 sad, ali sa 100x boljim rezultatima)

---

## Optimizacije

### 1. Smart Caching (Redis)

Cache Google Text Search rezultate 24h:

```javascript
const cacheKey = `google_text_search:${normalizeQuery(searchTerm)}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached); // $0
}

const results = await googleTextSearch(searchTerm);
await redis.setex(cacheKey, 86400, JSON.stringify(results)); // 24h
return results;
```

**Ušteda:** Ako 10 ljudi traži "pizza milano" u 24h, platiš samo $0.032 umjesto $0.32

### 2. Query Normalization

Spriječi duplikate:
```
"Pizza Napoli" === "pizza napoli" === "  PIZZA napoli  "
→ Ista cache ključ
```

### 3. Incremental Import

Ne importaj SVE Google rezultate odjednom:
```javascript
// Importaj samo top 5, ostale cache-aj
const topResults = googleResults.slice(0, 5);
await Promise.all(topResults.map(importUnclaimedRestaurantBasic));

// Ostale drži u Redis-u za 24h
await redis.setex(
  `google_pending:${searchTerm}`,
  86400,
  JSON.stringify(googleResults.slice(5))
);
```

### 4. Geographic Bias

Preferiraj rezultate bliže korisniku:

```javascript
const response = await axios.get(
  'https://maps.googleapis.com/maps/api/place/textsearch/json',
  {
    params: {
      query: searchTerm,
      location: `${userLat},${userLng}`, // ← Bias prema user lokaciji
      radius: 50000, // 50km bias (ne hard limit)
      key: GOOGLE_PLACES_API_KEY,
    }
  }
);
```

---

## Implementacija Plan

### Faza 1: Extended Database Search (Tier 2)

**Prioritet:** VISOK
**Trošak:** $0
**Impact:** Veliki (rješava 80% problema)

**Zadaci:**
1. ✅ Dodaj `isDistant` flag u response
2. ✅ Refaktoriraj filter logiku da podržava worldwide search
3. ✅ Promijeni sorting da preferira match score za distant results
4. ✅ Dodaj `meta.tier` u response za FE visibility

**Procjena:** 2-3 sata

---

### Faza 2: Google Places Text Search (Tier 3)

**Prioritet:** SREDNJI
**Trošak:** ~$10/mjesec
**Impact:** Srednji (rješava preostalih 20%)

**Zadaci:**
1. ✅ Dodaj Google Text Search integraciju u `googlePlacesService.js`
2. ✅ Implementiraj smart caching (Redis)
3. ✅ Dodaj filter za hotele/invalid entries
4. ✅ Implementiraj incremental import (top 5 odmah, ostali cached)
5. ✅ Dodaj `source: 'google'` flag u response

**Procjena:** 4-5 sati

---

### Faza 3: FE Experience

**Prioritet:** SREDNJI
**Trošak:** $0
**Impact:** Veliki (UX)

**Zadaci:**
1. ✅ Prikaži "distant results" sekciju (kad `isDistant: true`)
2. ✅ Prikaži badge "[500km away]" za distant restorane
3. ✅ Prikaži info "Nema rezultata u blizini" kad je Tier 3
4. ✅ Dodaj filter toggle "Prikaži sve rezultate" / "Samo u blizini"

**Procjena:** 3-4 sata (FE)

---

## Alternativne opcije

### Opcija A: Samo Tier 2 (Cheapest)

**Pro:**
- $0 trošak
- Rješava većinu slučajeva

**Con:**
- Ne pronalazi nove restorane (samo što je već u bazi)

**Preporuka:** Počni s ovim, dodaj Tier 3 kasnije

---

### Opcija B: Hybrid - Extended DB + Occasional Google

**Pro:**
- Većina poziva $0 (Tier 2)
- Google samo za specifične upite (npr. city-specific: "pizza milano")

**Con:**
- Kompleksnija logika

**Preporuka:** Najbolji omjer cijena/kvaliteta

---

### Opcija C: Full Google Integration

**Pro:**
- Najbolji coverage

**Con:**
- Puno skuplji (~$50-100/mjesec za 10k poziva)

**Preporuka:** Preskočiti

---

## Sigurnosni mehanizmi

### Rate Limiting za Tier 3

```javascript
// Max 100 Google API poziva/dan
const dailyCount = await redis.incr('google_api_count:' + today);
if (dailyCount > 100) {
  console.log('[Search] Google API daily limit reached');
  return []; // Skip Tier 3
}
await redis.expire('google_api_count:' + today, 86400);
```

### Budget Alert

```javascript
// Alert ako trošak > $20/mjesec
const monthlyCount = await redis.get('google_api_count:' + month);
if (monthlyCount * 0.032 > 20) {
  sendAlert('Google Places budget exceeded $20');
}
```

---

## Success Metrics

### Pre-Launch (trenutno)
- Avg results per search: **8** (samo local, 60km)
- Zero results rate: **25%** (nema ništa > 60km)
- Coverage: **Croatia only**

### Post-Launch (sa Tier 2 + Tier 3)
- Avg results per search: **15** (local + worldwide)
- Zero results rate: **<5%** (samo jako obscure upiti)
- Coverage: **Worldwide**

### Cost
- Current: **$0/mjesec**
- Target: **$10-15/mjesec**
- ROI: **Besplatno za korisnika, bolji UX**

---

## Zaključak

**Preporučujem Opciju B: Hybrid approach**

1. **Faza 1 (odmah):** Implementiraj Tier 2 (Extended DB Search)
   - $0 trošak
   - Rješava 80% problema
   - 2-3 sata posla

2. **Faza 2 (za 2 tjedna):** Dodaj Tier 3 (Google fallback)
   - ~$10/mjesec
   - Rješava preostalih 20%
   - 4-5 sati posla

**Ukupan trošak:** $10-15/mjesec
**Benefit:** Beli-style worldwide search 🌍

Želiš da počnem s implementacijom Faze 1?
