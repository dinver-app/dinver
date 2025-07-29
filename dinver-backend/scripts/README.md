# Restaurant Data Management Scripts

Ove skripte omogućavaju dohvaćanje i upravljanje podacima o restoranima iz Google Places API-ja.

## Prerequisites

1. **Google Places API Key** - postavite `GOOGLE_PLACES_API_KEY` u `.env` datoteku u `dinver-backend` direktoriju
2. **Axios** - instalirajte ako nije instaliran: `npm install axios`

### Environment Setup

Skripte automatski učitavaju `.env` datoteku iz `dinver-backend` direktorija:

```
dinver-backend/
├── .env                    # Ovdje treba biti GOOGLE_PLACES_API_KEY
├── scripts/
│   ├── searchRestaurants.js
│   ├── fetchSingleRestaurant.js
│   └── populateRestaurants.js
└── ...
```

## Skripte

### 1. `searchRestaurants.js` - Pretraživanje restorana

Pretražuje restorane po imenu ili adresi i prikazuje rezultate s Place ID-jevima.

```bash
# Pretraži restorane
node searchRestaurants.js "Pizza Zagreb"
node searchRestaurants.js "Restaurant Split" 10
node searchRestaurants.js "Cafe Dubrovnik" 3

# Za produkcijsku bazu (za buduće funkcionalnosti)
node searchRestaurants.js "Pizza Zagreb" --prod
```

**Output:**

```
=== Search Results ===
Found 3 restaurant(s):

1. Pizza Bar Zagreb
   Place ID: ChIJN1t_tDeuEmsRUsoyG83frY4
   Address: Ilica 123, Zagreb
   Rating: 4.2 (156 reviews)
   Price Level: 💰💰
   Status: OPERATIONAL
   Phone: +385 1 234 5678
   Website: https://pizzabar.hr
   Types: restaurant, food, establishment
```

### 2. `fetchSingleRestaurant.js` - Dohvaćanje pojedinačnog restorana

Dohvaća detaljne podatke o restoranu na temelju Place ID-ja.

```bash
# Samo dohvati podatke i spremi u JSON
node fetchSingleRestaurant.js ChIJN1t_tDeuEmsRUsoyG83frY4

# Dohvati i ubaci u lokalnu bazu
node fetchSingleRestaurant.js ChIJN1t_tDeuEmsRUsoyG83frY4 --insert-db

# Dohvati i ubaci u produkcijsku bazu
node fetchSingleRestaurant.js ChIJN1t_tDeuEmsRUsoyG83frY4 --insert-db --prod

# Dohvati, ubaci u bazu i ažuriraj ako postoji
node fetchSingleRestaurant.js ChIJN1t_tDeuEmsRUsoyG83frY4 --insert-db --update

# Samo ubaci u bazu bez spremanja JSON-a
node fetchSingleRestaurant.js ChIJN1t_tDeuEmsRUsoyG83frY4 --no-json --insert-db
```

**Opcije:**

- `--no-json` - Ne sprema u JSON file
- `--insert-db` - Ubaci u bazu podataka
- `--update` - Ažuriraj ako restoran već postoji
- `--prod` - Koristi produkcijsku bazu podataka

### 3. `populateRestaurants.js` - Populacija baze iz JSON datoteke

Ubacuje restorane iz `data/restaurants.json` datoteke u bazu.

```bash
# Ubaci sve restorane iz JSON-a u lokalnu bazu
node populateRestaurants.js

# Ubaci sve restorane iz JSON-a u produkcijsku bazu
node populateRestaurants.js --prod

# Ažuriraj postojeće restorane
node populateRestaurants.js --update

# Ažuriraj postojeće restorane u produkcijskoj bazi
node populateRestaurants.js --update --prod
```

**Opcije:**

- `--update` - Ažuriraj ako restoran već postoji
- `--prod` - Koristi produkcijsku bazu podataka

## Workflow

### Korak 1: Pronađi restoran

```bash
node searchRestaurants.js "Ime restorana"
```

### Korak 2: Kopiraj Place ID

Iz rezultata kopiraj Place ID (npr. `ChIJN1t_tDeuEmsRUsoyG83frY4`)

### Korak 3: Dohvati detaljne podatke

```bash
# Prvo samo dohvati i pogledaj podatke
node fetchSingleRestaurant.js ChIJN1t_tDeuEmsRUsoyG83frY4

# Ako su podaci dobro, ubaci u lokalnu bazu
node fetchSingleRestaurant.js ChIJN1t_tDeuEmsRUsoyG83frY4 --insert-db

# Ili ubaci u produkcijsku bazu
node fetchSingleRestaurant.js ChIJN1t_tDeuEmsRUsoyG83frY4 --insert-db --prod
```

## Database Connections

### Lokalna baza (development)

- Automatski koristi lokalne postavke iz `config/config.json`
- Koristi se kada nije postavljen `--prod` flag

### Produkcijska baza (production)

- Koristi `DATABASE_URL` environment varijablu
- Automatski postavlja `NODE_ENV=production`
- Aktivira se s `--prod` flagom

## JSON Output

Skripta sprema podatke u `data/restaurants_YYYY-MM-DDTHH-MM-SS.json` s timestamp-om:

```json
[
  {
    "place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
    "name": "Pizza Bar Zagreb",
    "vicinity": "Ilica 123, Zagreb",
    "geometry": {
      "location": {
        "lat": 45.8150,
        "lng": 15.9819
      }
    },
    "rating": 4.2,
    "user_ratings_total": 156,
    "price_level": 2,
    "opening_hours": { ... },
    "types": ["restaurant", "food", "establishment"],
    "business_status": "OPERATIONAL",
    "phone": "+385 1 234 5678",
    "website": "https://pizzabar.hr"
  }
]
```

## Database Schema

Podaci se mapiraju na postojeću `Restaurants` tablicu:

| Google Field             | Database Field     |
| ------------------------ | ------------------ |
| `place_id`               | `placeId`          |
| `name`                   | `name`             |
| `vicinity`               | `address`          |
| `geometry.location.lat`  | `latitude`         |
| `geometry.location.lng`  | `longitude`        |
| `rating`                 | `rating`           |
| `user_ratings_total`     | `userRatingsTotal` |
| `price_level`            | `priceLevel`       |
| `opening_hours`          | `openingHours`     |
| `types`                  | `types`            |
| `business_status`        | `businessStatus`   |
| `formatted_phone_number` | `phone`            |
| `website`                | `websiteUrl`       |

## Error Handling

- **API Key missing**: Provjeri `GOOGLE_PLACES_API_KEY` environment varijablu
- **Database connection**: Provjeri `DATABASE_URL` za produkcijsku bazu
- **JSON parsing**: Provjeri format `data/restaurants.json` datoteke

## Production Usage

Za korištenje s produkcijskom bazom, dodaj `--prod` flag:

```bash
# Pretraži restorane
node searchRestaurants.js "Pizza Zagreb" --prod

# Dohvati i ubaci u produkcijsku bazu
node fetchSingleRestaurant.js ChIJN1t_tDeuEmsRUsoyG83frY4 --insert-db --prod

# Populiraj produkcijsku bazu
node populateRestaurants.js --prod
```

Skripte automatski postavljaju produkcijsku `DATABASE_URL` i `NODE_ENV=production` kada se koristi `--prod` flag.
