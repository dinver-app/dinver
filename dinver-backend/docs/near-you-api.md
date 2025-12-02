# Near You API - Dokumentacija

## Pregled

`/near-you` endpoint vraća restorane u blizini korisnika (60km radius). Kombinira **claimed** (partnere) i **unclaimed** restorane (iz Google Places API).

## Endpoint

```
GET /api/restaurants/near-you
```

### Query parametri

| Parametar | Tip | Obavezan | Opis |
|-----------|-----|----------|------|
| `latitude` | number | Da | Geografska širina korisnika |
| `longitude` | number | Da | Geografska dužina korisnika |
| `page` | number | Ne | Stranica za paginaciju claimed restorana (default: 1) |

### Primjer poziva

```javascript
fetch('/api/restaurants/near-you?latitude=45.815&longitude=15.9819&page=1')
```

## Logika rada

### 1. Dohvaćanje claimed restorana (partnera)

- Dohvaća SVE claimed restorane iz baze
- Filtrira one unutar **60km radiusa**
- Sortira po udaljenosti (najbliži prvi)

### 2. Odluka o unclaimed restoranima

#### Slučaj A: Ima **≥ 10 claimed** restorana
```
→ NE vraća unclaimed restorane
→ Vraća samo claimed restorane
→ unclaimedRestaurants = []
```

#### Slučaj B: Ima **< 10 claimed** restorana
```
→ Provjerava unclaimed u bazi (60km radius)
→ Ako je claimed + unclaimed < 10:
    ↳ Dohvaća iz Google Places API (max 30)
    ↳ Importa ih u bazu kao unclaimed
→ Vraća unclaimed sortirane po hybrid score
```

### 3. Hybrid Score za unclaimed

Unclaimed restorani se sortiraju po formuli:

```javascript
hybridScore = (rating / 5) × (1 / (distance + 1)) × 100
```

- **Rating**: Viši rating = viši score (normaliziran 0-1)
- **Distance**: Bliže = viši score
- **Top 20** unclaimed restorana po hybrid score-u

### 4. Google Places API poziv

Poziva se samo ako je **claimed + unclaimed < 10**:

```javascript
searchNearbyRestaurants(lat, lng, 60000, 30)
```

- **Radius**: 60km (60000m)
- **Limit**: 30 restorana
- **Pagination**: Prolazi kroz 3 stranice (max 60 rezultata)
- **Filter**: Isključuje hotele i restorane bez ratinga

**Filtriranje:**
- ❌ Nema `rating` ili `user_ratings_total`
- ❌ Ima type `lodging`, `campground`, ili `rv_park`

**Cijena:**
- ~3 Nearby Search poziva = **$0.096** za ~15-20 restorana
- Google API automatski prolazi kroz stranice dok ne dobije dovoljno

## Response format

```json
{
  "restaurants": [
    {
      "id": "uuid",
      "name": "Restoran XYZ",
      "address": "Ulica 123",
      "place": "Zagreb",
      "latitude": 45.815,
      "longitude": 15.9819,
      "rating": 4.5,
      "priceLevel": 2,
      "thumbnailUrl": "https://cdn.dinver.com/...",
      "slug": "restoran-xyz",
      "isClaimed": true,
      "distance": 5.2
    }
  ],
  "unclaimedRestaurants": [
    {
      "id": "uuid",
      "name": "Gostilna ABC",
      "address": "Cesta 456",
      "place": "Ljubljana",
      "latitude": 46.056,
      "longitude": 14.505,
      "rating": 4.2,
      "priceLevel": null,
      "slug": "gostilna-abc",
      "isClaimed": false,
      "distance": 12.8,
      "hybridScore": 45.3
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalRestaurants": 45,
    "unclaimedTotal": 15
  }
}
```

### Polja u responsu

#### Claimed restorani (`restaurants`)
- **Paginirani**: 20 po stranici
- **thumbnailUrl**: CloudFront URL slike
- **isClaimed**: Uvijek `true`
- **distance**: Udaljenost u km

#### Unclaimed restorani (`unclaimedRestaurants`)
- **Nije paginirano**: Vraća max 20
- **thumbnailUrl**: Uvijek `null`
- **isClaimed**: Uvijek `false`
- **hybridScore**: Score za sortiranje (za debug)
- **Prazan array** ako ima ≥10 claimed

## Lazy Loading detalja

Kada korisnik otvori unclaimed restoran, **automatski** se dohvaćaju dodatni podaci:

### U kontroleru `/details/:id`

```javascript
if (!restaurant.isClaimed && !restaurant.phone && restaurant.placeId) {
  // Poziva Google Place Details API u pozadini
  updateRestaurantFromGoogle(restaurant.placeId, restaurant.id);
}
```

### Što se dohvaća:

- ✅ `phone` - Telefonski broj
- ✅ `openingHours` - Radno vrijeme (format: periods + weekday_text)
- ✅ `websiteUrl` - Web stranica
- ✅ `country` - Država (ako nije već postavljena)

**Cijena:** $0.017 po restoranu (Place Details API)

### Opening Hours format

```json
{
  "openingHours": {
    "weekday_text": [
      "Monday: Closed",
      "Tuesday: Closed",
      "Wednesday: 12:00 – 10:00 PM",
      "Thursday: 12:00 – 10:00 PM",
      "Friday: 12:00 – 10:00 PM",
      "Saturday: 12:00 – 10:00 PM",
      "Sunday: Closed"
    ],
    "periods": [
      {
        "open": { "day": 2, "time": "1200" },
        "close": { "day": 2, "time": "2200" }
      }
    ],
    "open_now": false
  }
}
```

**Važno:** Dani su konvertirani u naš format:
- **0 = Ponedjeljak**
- **1 = Utorak**
- **2 = Srijeda**
- **3 = Četvrtak**
- **4 = Petak**
- **5 = Subota**
- **6 = Nedjelja**

(Google koristi 0=Nedjelja, mi konvertiramo u 0=Ponedjeljak)

## Primjeri korištenja

### 1. Korisnik u Zagrebu (40 partnera)

```
claimed = 40 (unutar 60km)
→ claimed ≥ 10
→ unclaimedRestaurants = []
→ Vraća samo partnere (claimed)
```

### 2. Korisnik u Ljubljani (5 partnera, 3 unclaimed u bazi)

```
claimed = 5
unclaimed (baza) = 3
→ claimed < 10
→ claimed + unclaimed = 8 < 10
→ Dohvaća iz Google Places API
→ Importira ~15 novih unclaimed
→ Vraća claimed + 20 top unclaimed (po hybrid score)
```

### 3. Korisnik u malom mjestu (0 partnera, 0 u bazi)

```
claimed = 0
unclaimed (baza) = 0
→ claimed + unclaimed = 0 < 10
→ Dohvaća iz Google Places API
→ Importira ~15-20 unclaimed
→ Vraća claimed (prazno) + 15-20 unclaimed
```

### 4. Korisnik u srednjem gradu (8 partnera, 15 unclaimed u bazi)

```
claimed = 8
unclaimed (baza) = 15
→ claimed < 10
→ claimed + unclaimed = 23 ≥ 10
→ NE dohvaća iz Google Places API
→ Vraća 8 claimed + 20 top unclaimed iz baze
```

## Performance i troškovi

### Optimizacije

1. **Basic Import**: Importira bez Place Details poziva
   - Sprema: name, address, rating, location
   - NE sprema: phone, openingHours, website
   - **Štedi**: $0.017 po restoranu

2. **Lazy Load**: Detalji se dohvaćaju tek kad korisnik otvori restoran
   - Klikne samo ~10% restorana
   - **Trošak**: $0.017 × 10% = $0.0017 po restoranu

3. **Database Cache**: Importirani restorani ostaju u bazi
   - Sljedeći poziv ih nalazi u bazi
   - **Trošak**: $0 za istu lokaciju

### Prosječni troškovi

| Scenarij | Nearby Search | Place Details | Ukupno |
|----------|---------------|---------------|--------|
| **Prvi poziv** (nova lokacija) | 3 × $0.032 = $0.096 | - | **$0.096** |
| **Lazy load** (10% klikova) | - | 2 × $0.017 = $0.034 | **$0.034** |
| **Drugi poziv** (ista lokacija) | - | - | **$0.000** |
| **UKUPNO po lokaciji** | | | **~$0.13** |

### Google Places Free Tier

- **$200/mjesec** besplatno
- To je ~**1,500 novih lokacija/mjesec**
- Ili ~**50 novih lokacija/dan**

## Testiranje

Test skripta: `scripts/test-near-you.js`

```bash
node scripts/test-near-you.js
```

Testira:
- ✅ Dohvaćanje claimed restorana
- ✅ Dohvaćanje unclaimed iz baze
- ✅ Google Places API poziv
- ✅ Import u bazu
- ✅ Lazy load detalja
- ✅ Opening hours konverzija
