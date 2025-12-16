# Unclaimed Restorani - Automatski Lazy Load Sistem

## Pregled

Sistem automatski proširuje pokrivenost restorana dohvaćajući unclaimed restorane iz Google Places API-ja kada nema dovoljno claimed restorana u području.

## Kako radi

### Flow Dijagram

```
Korisnik otvori app u Ljubljani
↓
nearYou API poziv (claimed + unclaimed < 10?)
↓
DA → Dohvati 30 restorana iz Google Places
↓
Importaj kao BASIC unclaimed (ime, adresa, rating, lokacija)
↓
Vrati 20 najboljih (hybrid score: rating × blizina)
↓
Korisnik klikne na unclaimed restoran
↓
Frontend poziva /details/:id (kao i uvijek)
↓
Backend provjerava: nema phone/radno vrijeme?
↓
DA → ČEKA Google Places API ($0.017)
↓
Ažurira DB s telefonom, radnim vremenom, web stranom
↓
Vraća kompletan podatke korisniku
```

## Backend Implementacija

### 1. nearYou Endpoint Poboljšanje

**Lokacija:** `src/controllers/restaurantController.js:2575`

**Logika:**
1. Dohvati claimed restorane unutar 60km
2. Dohvati postojeće unclaimed restorane unutar 60km
3. Ako `claimed + unclaimed < 10`:
   - Pozovi Google Places Nearby Search API
   - Importaj 30 restorana kao unclaimed (samo basic podaci)
   - Cache rezultate 24h
4. Vrati oba odvojeno:
   ```json
   {
     "restaurants": [...],        // Claimed partneri
     "unclaimedRestaurants": [...] // Unclaimed community
   }
   ```

**Hybrid Score Formula:**
```javascript
score = (rating / 5) × (1 / (distance + 1)) × 100
```

Primjer:
- 4.8★ na 2km = score 27.4 → 1. mjesto ✅
- 4.6★ na 5km = score 15.3 → 2. mjesto
- 3.8★ na 1km = score 19.0 → 3. mjesto

### 2. Smart Lazy Load (Automatski)

**Endpoint:** `GET /api/app/details/:restaurantId` (postojeći endpoint, poboljšan)

**Svrha:** Automatski dohvaća potpune podatke (telefon, radno vrijeme, website) za unclaimed restorane kada nedostaju kritični podaci

**Kako radi:**
1. Frontend poziva `/details/:restaurantId` (kao i uvijek)
2. Backend provjerava je li restoran unclaimed I nema telefon/radno vrijeme
3. Ako DA: **Čeka** Google Places API fetch (2-3 sekunde)
4. Ako NE: Vraća odmah (instant response)

**Logika:**
```javascript
// Ako unclaimed I nedostaju kritični podaci → ČEKAJ
const needsCriticalData = !restaurant.isClaimed &&
                          restaurant.placeId &&
                          (!restaurant.phone || !restaurant.openingHours);

if (needsCriticalData) {
  // ČEKA Google Places update ($0.017) - blocking
  await updateRestaurantFromGoogle(placeId, id);

  // Ponovno dohvati s kompletnim podacima
  restaurant = await Restaurant.findByPk(id);
}

// Ako unclaimed ALI ima podatke → background refresh (ne blokira)
else if (!restaurant.isClaimed && shouldUpdateFromGoogle(lastUpdate)) {
  updateRestaurantFromGoogle(placeId, id); // Non-blocking
}
```

**Trošak:** $0.017 po prvom učitavanju (poslije cached)

### 3. Caching Strategija

**Google Places Cache:**
- Lokacija: `models/googlePlacesCache.js`
- TTL: 24 sata za uspješne rezultate, 1 sat za prazne rezultate
- Key format: `nearby:restaurants:{lat},{lng}:{radius}`
- Štedi $0.032 po cached requestu

## Frontend Integracija

### NISU POTREBNE PROMJENE! 🎉

Postojeći kod radi automatski - samo pozovi `/details/:restaurantId` kao i obično:

```typescript
// Prije - claimed restorani
const response = await api.get(`/details/${restaurantId}`);

// Sada - claimed I unclaimed (isti poziv!)
const response = await api.get(`/details/${restaurantId}`);
// Backend automatski handla lazy load
```

### Prednosti:

1. ✅ **Zero frontend promjena** - postojeći kod radi
2. ✅ **Nema dodatnih loading stanja** - jedan spinner pokriva sve
3. ✅ **Nema special case-ova** - backend handla claimed vs unclaimed transparentno
4. ✅ **Jednostavniji kod** - ne treba conditional fetching logika

## Trošak Analiza

### Scenario 1: 100 korisnika u Ljubljani (prvi put)

**Početno učitavanje (nearYou):**
- Nearby Search API: $0.032
- Cache 24h ✅

**Korisničke interakcije:**
- 10 korisnika otvori unclaimed restorane
- 10 × $0.017 = **$0.17**

**Ukupno:** $0.032 + $0.17 = **$0.202**

### Scenario 2: 100 korisnika u Ljubljani (cached)

**Početno učitavanje:**
- Cached rezultati: **$0** ✅

**Korisničke interakcije:**
- 5 korisnika otvori nove unclaimed restorane
- 5 već ima details (od prethodnih korisnika)
- 5 × $0.017 = **$0.085**

**Ukupno:** $0.085

### Mjesečna projekcija (1000 korisnika, 20 novih gradova)

- Novi gradovi (20): 20 × $0.032 = $0.64
- Detail dohvati (avg 50): 50 × $0.017 = $0.85
- **Ukupno: ~$1.50/mjesec**

## Značajke

### ✅ Smart Fallback
- Prioritizira claimed restorane
- Dohvaća unclaimed samo kad treba
- Uzima u obzir postojeće unclaimed u DB-u

### ✅ Hybrid Scoring
- Balansira kvalitetu (rating) s udaljenosti (distance)
- Vraća top 20 restorana

### ✅ Duplikat Prevencija
- Provjerava `placeId` prije kreiranja
- Mergea postojeće + nove unclaimed

### ✅ Optimizacija Troškova
- Basic data inicijalno ($0.032)
- Puni detalji on-demand ($0.017)
- 24h caching
- Plaća samo što korisnici stvarno koriste

## Testiranje

### Manualni Test

```bash
# 1. Testiraj nearYou s unclaimed fallback-om
curl -X GET "http://localhost:3000/api/app/restaurants/near-you?latitude=46.0569&longitude=14.5058" \
  -H "x-api-key: YOUR_API_KEY"

# 2. Testiraj automatski lazy load (pozovi details endpoint za unclaimed restoran)
curl -X GET "http://localhost:3000/api/app/details/{uuid}" \
  -H "x-api-key: YOUR_API_KEY"

# Prvi poziv: Čeka 2-3 sekunde ako nema phone/hours
# Drugi poziv: Instant response s punim podacima
```

### Test Skripta

```bash
cd dinver-backend
node scripts/test-near-you.js
```

## Database Schema

### Restaurant Model Promjene

**Dodana polja:**
- `isClaimed` (boolean) - Razlikuje claimed vs unclaimed
- `placeId` (string) - Google Place ID za updejte
- `businessStatus` (string) - Iz Google Places

**Unclaimed restorani imaju:**
- ✅ Basic info: ime, adresa, rating, lokacija
- ❌ Bez telefona inicijalno
- ❌ Bez radnog vremena inicijalno
- ❌ Bez custom slika
- ❌ Bez menija

## Behaviour za Korisnika

### Claimed Restorani (Partneri)
- **Uvijek** instant response
- Svi podaci dostupni odmah
- Premium features (meni, galerija, rezervacija)

### Unclaimed Restorani (Community)

**Prvi otvaranje:**
- Loading 2-3 sekunde
- Dohvaća phone, radno vrijeme, website
- Sprema u DB

**Drugi otvaranje (isti ili drugi korisnik):**
- Instant response ✅
- Svi podaci već tu

**Background refresh (7+ dana staro):**
- Ne blokira response
- Ažurira u pozadini

## Logovi za Monitoring

```bash
# nearYou endpoint
[nearYou] Only 3 total restaurants (0 claimed, 3 unclaimed). Fetching from Google...
[nearYou] Found 30 restaurants from Google Places
[nearYou] Successfully imported 28 new unclaimed restaurants
[nearYou] Total unclaimed restaurants to return: 20 (3 existing + 28 new)

# getFullRestaurantDetails endpoint
[getFullRestaurantDetails] Missing critical data for Gostilna Sokol, fetching from Google...
[Background] Successfully updated restaurant uuid from Google Places
[getFullRestaurantDetails] Successfully loaded full details for Gostilna Sokol

# Google Places cache
[Google Places] Cache MISS - fetching from API
[Google Places] Fetched 30 nearby restaurants
[DB Cache] Cached new query: "nearby:restaurants:46.06,14.51:60000" (30 results)

# Sljedeći korisnik
[Google Places] Cache HIT for nearby search
[DB Cache] HIT for "nearby:restaurants:46.06,14.51:60000" - saved $0.032 (hit #2)
```

## Budući Poboljšanja

### 1. Background Enrichment
Periodično obogati popularne unclaimed restorane s punim podacima.

### 2. User-Contributed Restaurants
Kad korisnik uploada račun za nepoznati restoran:
- Izvuci ime + lokaciju iz OCR-a
- Pretraži Google Places
- Kreiraj unclaimed restoran
- Poveži s visitom

### 3. Pre-populacija za Top Gradove
Background job za pre-populaciju top 20 EU gradova.
