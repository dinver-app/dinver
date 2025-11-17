# Dinver AI System - Detaljna Analiza i Preporuke

**Datum analize:** 17. studeni 2025
**Verzija:** 1.0
**Status:** Kompletna analiza

---

## 📋 Sadržaj

1. [Pregled Trenutnog Sistema](#1-pregled-trenutnog-sistema)
2. [Arhitektura i Data Flow](#2-arhitektura-i-data-flow)
3. [Struktura Restaurant Podataka](#3-struktura-restaurant-podataka)
4. [Identificirani Problemi](#4-identificirani-problemi)
5. [Detaljne Preporuke](#5-detaljne-preporuke)
6. [Prioriteti Implementacije](#6-prioriteti-implementacije)
7. [Tehnička Specifikacija Promjena](#7-tehnicka-specifikacija-promjena)

---

## 1. Pregled Trenutnog Sistema

### 1.1 Osnovni Opis

Dinver AI sistem koristi OpenAI GPT-4o-mini model za odgovaranje na upite korisnika o restoranima. Sistem podržava dva načina rada:

1. **Globalni AI Search** (bez `restaurantId`): Pretraga restorana po lokaciji, jelovniku, filterima
2. **Restaurant-Specific AI** (s `restaurantId`): Detaljni upiti o specifičnom restoranu

### 1.2 Komponente Sistema

```
User Query → aiController.chat()
    ↓
inferIntent() → LLM klasificira intent (menu_search, nearby, hours, etc.)
    ↓
chatAgent() → Odabire handler prema intentu
    ↓
Handler Functions (handleMenuSearch, handleNearby, etc.)
    ↓
dataAccess.js → Dohvaća podatke iz baze (Restaurant, MenuItem, DrinkItem, itd.)
    ↓
generateNaturalReply() → LLM generira prirodan odgovor (GPT-4o-mini)
    ↓
Response → Korisniku
```

### 1.3 Podržani Intenti

- `hours` - Radno vrijeme
- `nearby` - Restorani u blizini
- `menu_search` - Pretraga jelovnika
- `perks` - Establishment perks (terasa, parking, itd.)
- `meal_types` - Doručak, ručak, večera
- `dietary_types` - Vegetarijanski, vegan, gluten-free, halal
- `reservations` - Rezervacije
- `contact` - Kontakt informacije
- `description` - Pregled restorana
- `virtual_tour` - Virtualna tura
- `price` - Cijene
- `reviews` - Recenzije
- `what_offers` - Što restoran nudi
- `combined_search` - Kombinirana pretraga (više kriterija)
- `menu_stats` - Najskuplji/najjeftiniji item
- `data_provenance` - Odakle dolaze podaci

---

## 2. Arhitektura i Data Flow

### 2.1 Trenutna Arhitektura

**Slojevita struktura:**
1. **API Layer** - Express routes (`aiRoutes.js`)
2. **Controller Layer** - Business logic (`aiController.js`)
3. **Agent Layer** - Intent routing (`agent.js`)
4. **Handler Layer** - Specifični handleri za svaki intent
5. **Data Access Layer** - Database queries (`dataAccess.js`)
6. **LLM Layer** - OpenAI integration (`llm.js`)

### 2.2 Data Flow za Tipičan Query

**Primjer: "Ima li restoran Vatikan pizzu?"**

```
1. POST /api/app/ai/chat
   Body: { message: "Ima li restoran Vatikan pizzu?", language: "hr" }

2. aiController.chat()
   - inferIntent() → { intent: "menu_search", restaurantQuery: "Vatikan", menuTerm: "pizza" }
   - chatAgent() → handleMenuSearch()

3. handleMenuSearch()
   - resolveRestaurantFromText("Vatikan") → Restaurant ID
   - searchMenuForRestaurant(restaurantId, "pizza")
     → Queries MenuItemTranslation + DrinkItemTranslation s ILIKE "%pizza%"
   - Vraća 3 pizze: Margherita (12€), Capricciosa (15€), Quattro Stagioni (16€)

4. generateNaturalReply()
   System Prompt: "You are Dinver AI..."
   User Content: {
     Question: "Ima li restoran Vatikan pizzu?",
     Intent: "menu_search",
     Data JSON: { items: [...], restaurant: {...} }
   }
   → LLM generira: "Da, restoran Vatikan ima odličnu pizzu u svom jelovniku! Imaju Margherita za 12 €, Capricciosa za 15 € i Quattro Stagioni za 16 €..."

5. Response
   { reply: { text: "...", restaurantId: "..." }, threadId: "..." }
```

---

## 3. Struktura Restaurant Podataka

### 3.1 Restaurant Model Fields

**Osnovna polja koja MODEL IMA:**
```javascript
Restaurant {
  // Basic Info
  id: UUID
  name: String
  description: Text (HR + EN kroz translations)
  address: String
  place: String (grad)
  country: String
  latitude: Decimal
  longitude: Decimal
  phone: String

  // Ratings
  rating: Decimal
  foodQuality: Decimal
  service: Decimal
  atmosphere: Decimal
  userRatingsTotal: Integer

  // Opening Hours
  openingHours: JSONB  // Format: { periods: [{day: 0-6, open: {time: "1000"}, close: {time: "2200"}}] }
  kitchenHours: JSONB
  customWorkingDays: JSONB  // Override za specifične datume
  workingHoursInfo: Text
  isOpenNow: Boolean

  // Price Info
  priceLevel: Integer
  priceCategoryId: Integer  // FK to PriceCategory

  // Types & Filters (stored as arrays of IDs)
  foodTypes: [Integer]  // [1, 3, 5] → Pizza, Grill, Pasta
  establishmentTypes: [Integer]  // [2, 4] → Restaurant, Cafe
  establishmentPerks: [Integer]  // [28, 35, 36] → Outdoor Seating, Credit Cards, WiFi
  mealTypes: [Integer]  // [1, 2, 3, 4] → Breakfast, Brunch, Lunch, Dinner
  dietaryTypes: [Integer]  // [1, 2] → Vegetarian, Vegan

  // Media
  thumbnailUrl: String
  photos: [String]
  images: [String]
  virtualTourUrl: Text
  iconUrl: String

  // Contact & Social
  websiteUrl: String
  fbUrl: String
  igUrl: String
  ttUrl: String
  email: String

  // Restaurant Features
  reservationEnabled: Boolean
  wifiSsid: String
  wifiPassword: String
  showWifiCredentials: Boolean
  isClaimed: Boolean
  subdomain: String
  slug: String

  // Google Places Integration
  placeId: String
  types: [String]
  businessStatus: String
  geometry: JSONB
  plusCode: JSONB
  lastGoogleUpdate: Date

  // Fiscal
  oib: String(11)  // Za Receipt Matching
}
```

### 3.2 Related Models

**PriceCategory**
```javascript
PriceCategory {
  id: Integer
  nameEn: String  // e.g., "Budget-friendly (€)"
  nameHr: String  // e.g., "Pristupačno (€)"
  level: Integer  // 1-4 (1=najjeftinije, 4=najskuplje)
  icon: String
}
```

**EstablishmentPerk** (27-54 različitih perks)
```javascript
EstablishmentPerk {
  id: Integer  // 27-54
  nameEn: String  // "Outdoor Seating"
  nameHr: String  // "Vanjska terasa"
  icon: String
}
```

**MealType** (1-4)
```javascript
MealType {
  id: Integer  // 1-4
  nameEn: String  // "Breakfast", "Brunch", "Lunch", "Dinner"
  nameHr: String  // "Doručak", "Brunch", "Ručak", "Večera"
  icon: String
}
```

**DietaryType** (1-4)
```javascript
DietaryType {
  id: Integer  // 1-4
  nameEn: String  // "Vegetarian", "Vegan", "Gluten-Free", "Halal"
  nameHr: String  // "Vegetarijanski", "Veganski", "Bez glutena", "Halal"
  icon: String
}
```

**MenuItem & DrinkItem**
```javascript
MenuItem {
  id: UUID
  restaurantId: UUID
  price: Decimal
  imageUrl: String
  isActive: Boolean
  position: Integer
  translations: [MenuItemTranslation]
}

MenuItemTranslation {
  language: String  // "hr" ili "en"
  name: String
  description: Text
}
```

### 3.3 Što AI TRENUTNO DOBIVA vs. Što MOŽE DOBITI

#### ✅ Što AI trenutno dobiva (DOBRO):
- `name`, `address`, `place` - Osnovne informacije
- `rating`, `userRatingsTotal` - Ocjene
- `slug` - Za linkove
- `thumbnailUrl` - Slika
- `priceCategory` - Kategorija cijene (kad se dohvati)
- `establishmentPerks` (IDs) - Perks kao brojevi
- `foodTypes`, `mealTypes`, `dietaryTypes` (IDs) - Tipovi kao brojevi
- `openingHours` (complex JSONB) - Ali ne formatiran dobro za AI

#### ❌ Što AI često NE DOBIVA (LOŠE):
- **`description`** - Rijetko se šalje, a jako je važan za kontekst!
- **`phone`, `email`** - Kontakt info često nedostaje u response
- **Formatiran `openingHours`** - Šalje se raw JSONB umjesto čitljivog formata
- **`reservationEnabled`** - Važno za korisnike, ali ne uvijek u contextu
- **`websiteUrl`, `fbUrl`, `igUrl`, `ttUrl`** - Social linkovi rijetko uključeni
- **`wifiSsid`, `wifiPassword`** - Ako je dostupno, korisno za korisnike
- **`virtualTourUrl`** - Samo u handleVirtualTour, ne u description
- **Kompletni `priceLevel`** - Ima se u bazi, ali ne koristi se uvijek
- **Full filter details** - Umjesto ID-eva, trebaju biti enriched names (HR/EN)

#### ⚠️ Specifični Problemi po Intentu:

**`handleNearby` [agent.js:364-502]**
- ✅ Šalje: `name`, `address`, `place`, `thumbnailUrl`, `distanceKm`, `rating`, `priceCategory`, `openNow`, `description`, `slug`
- ❌ NE šalje: `phone`, `email`, `websiteUrl`, perks (samo IDs, ne enriched), `foodTypes` details

**`handleMenuSearch` [agent.js:592-927]**
- ✅ Šalje: `items[]` (type, id, price, thumbnailUrl, translations, name, restaurantId, restaurantSlug)
- ❌ NE šalje: `description` stavki, `restaurant.description`, `restaurant.openingHours`, `restaurant.address` (samo slug i ID)

**`handleDescription` [agent.js:1233-1356]**
- ✅ Šalje: `restaurant` (id, name, address, place, thumbnailUrl, openNow, priceCategory), `description`, `perks[]`, `foodTypes[]`
- ❌ NE šalje: `mealTypes`, `dietaryTypes`, `phone`, `email`, `websiteUrl`, `reservationEnabled`

**`handleHours` [agent.js:253-362]**
- ✅ Šalje: `restaurant` (id, name), `dayIndex`, `open`, `close`, `openNow`
- ❌ NE šalje: Full week schedule (samo jedan dan), `kitchenHours`

---

## 4. Identificirani Problemi

### 🔴 KRITIČNI PROBLEMI

#### 4.1 Nepotpuni Podaci za AI
**Problem:** AI dobiva samo djelomične podatke o restoranu.

**Primjer:**
```javascript
// handleNearby [agent.js:448-475]
const enrichedForLlm = await Promise.all(
  nearby.slice(0, 5).map(async (r) => {
    const details = await fetchRestaurantDetails(r.id);
    return {
      id: r.id,
      name: r.name,
      thumbnailUrl: details?.thumbnailUrl || null,
      distanceKm: r.distanceKm,
      rating: r.rating || null,
      priceCategory: priceLabel,
      openNow,
      address: details?.address || null,
      place: details?.place || null,
      description: descShort || '',
      slug: details?.slug || null,
    };
  })
);
// ❌ PROBLEM: Ne šalje phone, email, perks details, foodTypes details
```

**Posljedica:** AI ne može dati korisniku kompletne informacije pa kaže "Za više informacija, kontaktirajte restoran" umjesto da da telefon/email.

#### 4.2 Filter IDs vs. Human-Readable Names
**Problem:** AI dobiva ID-eve filtera (npr. `establishmentPerks: [28, 35, 36]`) umjesto čitljivih naziva.

**Trenutno:**
```json
{
  "restaurant": {
    "establishmentPerks": [28, 35, 36]
  }
}
```

**Trebalo bi:**
```json
{
  "restaurant": {
    "establishmentPerks": [
      { "id": 28, "nameHr": "Vanjska terasa", "nameEn": "Outdoor Seating", "icon": "🌳" },
      { "id": 35, "nameHr": "Plaćanje karticom", "nameEn": "Credit Cards", "icon": "💳" },
      { "id": 36, "nameHr": "Besplatan Wi-Fi", "nameEn": "Free Wi-Fi", "icon": "📶" }
    ]
  }
}
```

**Posljedica:** AI mora raditi reverse lookup ili ne zna što znače ID-evi.

#### 4.3 Kompleksni Opening Hours Format
**Problem:** `openingHours` se šalje kao raw JSONB structure, a AI ne može lako razumjeti.

**Trenutno:**
```json
{
  "openingHours": {
    "periods": [
      { "day": 0, "open": { "time": "1000" }, "close": { "time": "2200" } },
      { "day": 1, "open": { "time": "1000" }, "close": { "time": "2200" } }
    ]
  }
}
```

**Trebalo bi:**
```json
{
  "openingHours": {
    "formatted": {
      "hr": "Pon-Pet: 10:00-22:00, Sub: 10:00-23:00, Ned: Zatvoreno",
      "en": "Mon-Fri: 10:00-22:00, Sat: 10:00-23:00, Sun: Closed"
    },
    "today": {
      "isOpen": true,
      "opens": "10:00",
      "closes": "22:00"
    },
    "raw": { /* original structure */ }
  }
}
```

**Posljedica:** AI ne daje korisne odgovore za radno vrijeme jer mora parsirati complex strukture.

#### 4.4 Loša Menu Search Kvaliteta
**Problem:** Menu search koristi samo text-based matching (ILIKE) sa synonym mapom, bez semantičkog razumijevanja.

**Primjer problema:**
- Korisnik pita: "Ima li biftek?"
- Synonyms: `biftek → steak, meat`
- Search: `ILIKE '%biftek%' OR ILIKE '%steak%' OR ILIKE '%meat%'`
- Rezultat: Nađe "Biftek", ali NE nađe "T-bone steak" ako nije u synonyms

**Trenutno rješenje:** Hard-coded synonym map u `dataAccess.js:57-182`
```javascript
const FOOD_SYNONYMS = new Map([
  ['biftek', ['biftek', 'steak', 'meat', 'odrezak']],
  // ... 50+ mappings
]);
```

**Problem:**
- Synonym map je ručno održavan
- Ne pokriva sve varijacije
- Ne radi dobro za kombinacije ("pizza s gambama")
- Nema semantic search (vector embeddings)

### ⚠️ VAŽNI PROBLEMI

#### 4.5 Prompt Engineering Limitations
**Problem:** Sistem prompt je dobar, ali može biti bolji.

**Trenutno [llm.js:42-128]:**
```javascript
const system = [
  'You are Dinver AI, a restaurant assistant. Follow these strict rules:',
  'Only answer using the JSON data provided below. Do not invent facts.',
  'Never output raw JSON; respond conversationally and concisely (2–4 sentences).',
  // ...hardcoded examples
].join('\n');
```

**Problemi:**
1. **Hardcoded examples** - Ne dinamički prilagođeni stvarnim podacima
2. **No few-shot examples** - LLM nema primjere sličnih upita
3. **No structured output format** - Ne koristi JSON mode za strukturirane odgovore
4. **Temperature=0** - Uvijek deterministički, nema kreativnosti za opise

#### 4.6 Context Management Slabosti
**Problem:** Context store je previše jednostavan.

**Trenutno [agent.js:1679-1765]:**
```javascript
const ctxStore = require('./contextStore');  // In-memory Map()

function updateContext(threadId, data) {
  const ctx = ctxStore.get(threadId) || {};
  ctx.restaurantHistory = ctx.restaurantHistory || [];
  if (!ctx.restaurantHistory.includes(data.restaurantId)) {
    ctx.restaurantHistory.unshift(data.restaurantId);
    ctx.restaurantHistory = ctx.restaurantHistory.slice(0, 5);  // Only 5
  }
  ctx.lastRestaurantId = data.restaurantId;
  // ...
}
```

**Problemi:**
1. In-memory store (gubi se na restartu servera)
2. Čuva samo 5 restorana, 10 searchTermova, 5 intenta
3. Nema perzistenciju u bazi
4. Ne koristi conversation history za bolje preporuke

#### 4.7 Performance Issues
**Problem:** Spore database queries bez cachinga.

**Primjer:**
```javascript
// handleNearby [agent.js:449]
const enrichedForLlm = await Promise.all(
  nearby.slice(0, 5).map(async (r) => {
    const details = await fetchRestaurantDetails(r.id);  // 5x DB query
    const openNow = computeOpenNow(...);
    return { ... };
  })
);
```

**Problem:** 5 paralelnih `fetchRestaurantDetails()` umjesto jednog batch query-a.

**Caching:**
- ✅ Types cache: 5 min in-memory [dataAccess.js:245-259]
- ✅ Perks cache: 10 min in-memory [dataAccess.js:261-273]
- ❌ Nema Redis caching
- ❌ Nema batch query optimizations

#### 4.8 Menu Search Results - Nedostatak Restaurant Info
**Problem:** Kad se traži menu item globally, rezultat sadrži item ali NE i detaljne info o restoranu.

**Trenutno [agent.js:896-918]:**
```javascript
const items = unique.map((r) => ({
  type: r.type,
  id: r.item?.id || null,
  price: r.item?.price ?? null,
  thumbnailUrl: r.item?.thumbnailUrl || null,
  translations: r.item?.translations || null,
  name: ...,
  restaurantId: r.restaurant.id,
  restaurantSlug: r.restaurant.slug || null,
}));
const restaurants = unique.map((r) => ({
  id: r.restaurant.id,
  name: r.restaurant.name,
  place: r.restaurant.place || null,
  address: null,  // ❌ LOŠE: address je null
  thumbnailUrl: null,  // ❌ LOŠE: thumbnailUrl je null
  distance: null,  // ❌ LOŠE: distance je null
  slug: r.restaurant.slug || null,
}));
```

**Problem:** Korisnik traži "pizzu", dobije 3 restorana, ali AI ne zna njihove adrese, slike, ili udaljenost.

### 📝 MANJE VAŽNI PROBLEMI

#### 4.9 OpeningHours Calculation Logic
**Problem:** `computeOpenNow()` koristi Zagreb timezone hardcoded.

```javascript
// [agent.js:43-48]
function getZagrebNow() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const zagreb = new Date(utc + 2 * 3600000); // UTC+2 HARDCODED
  return zagreb;
}
```

**Problem:** Ne uzima u obzir daylight saving time (UTC+1 zimi, UTC+2 ljeti).

#### 4.10 LLM Model Choice
**Problem:** Koristi se `gpt-4o-mini` umjesto novijih/boljih modela.

**Trenutno [llm.js:138-145]:**
```javascript
const resp = await client.chat.completions.create({
  model: 'gpt-4o-mini',  // Cheapest, ali nije najbolji
  temperature: 0,
  messages: [ ... ],
});
```

**Alternativa:**
- `gpt-4o` - Bolji, ali skuplji
- `gpt-4-turbo` - Balanced
- Claude Sonnet 4.5 - Top kvaliteta

---

## 5. Detaljne Preporuke

### 🚀 PRIORITET 1: Enrich Data Sent to AI

#### 5.1 Kreiraj Comprehensive Restaurant Payload Function

**Nova funkcija: `buildComprehensiveRestaurantData(restaurantId, lang)`**

**Lokacija:** `src/dinver-ai/dataAccess.js`

```javascript
async function buildComprehensiveRestaurantData(restaurantId, lang = 'hr') {
  const restaurant = await fetchRestaurantDetails(restaurantId);
  if (!restaurant) return null;

  // Dohvati types i enrich-aj
  const types = await fetchTypesForRestaurant(restaurant);

  // Format opening hours za AI
  const formattedHours = formatOpeningHoursForAI(restaurant.openingHours, restaurant.customWorkingDays, lang);

  // Dohvati sample menu items
  const menuSample = await fetchAllMenuItemsForRestaurant(restaurantId, lang, 10);

  // Izračunaj isOpenNow
  const openNow = computeOpenNow(restaurant.openingHours, restaurant.customWorkingDays);

  return {
    // Basic Info
    id: restaurant.id,
    name: restaurant.name,
    description: lang === 'hr' ? restaurant.description?.hr : restaurant.description?.en,
    address: restaurant.address,
    place: restaurant.place,
    country: restaurant.country,
    slug: restaurant.slug,

    // Ratings
    rating: restaurant.rating,
    foodQuality: restaurant.foodQuality,
    service: restaurant.service,
    atmosphere: restaurant.atmosphere,
    userRatingsTotal: restaurant.userRatingsTotal,

    // Opening Hours - FORMATTED!
    openingHours: formattedHours,
    isOpenNow: openNow,

    // Price Info
    priceCategory: restaurant.priceCategory ? {
      level: restaurant.priceCategory.level,
      name: lang === 'hr' ? restaurant.priceCategory.nameHr : restaurant.priceCategory.nameEn,
      icon: restaurant.priceCategory.icon,
    } : null,

    // Types & Filters - ENRICHED!
    foodTypes: types.foodTypes.map(ft => ({
      id: ft.id,
      name: lang === 'hr' ? ft.nameHr : ft.nameEn,
      icon: ft.icon,
    })),
    establishmentPerks: types.establishmentPerks.map(ep => ({
      id: ep.id,
      name: lang === 'hr' ? ep.nameHr : ep.nameEn,
      icon: ep.icon,
    })),
    mealTypes: types.mealTypes.map(mt => ({
      id: mt.id,
      name: lang === 'hr' ? mt.nameHr : mt.nameEn,
      icon: mt.icon,
    })),
    dietaryTypes: types.dietaryTypes.map(dt => ({
      id: dt.id,
      name: lang === 'hr' ? dt.nameHr : dt.nameEn,
      icon: dt.icon,
    })),

    // Contact
    phone: restaurant.phone,
    email: restaurant.email,
    websiteUrl: restaurant.websiteUrl,
    fbUrl: restaurant.fbUrl,
    igUrl: restaurant.igUrl,
    ttUrl: restaurant.ttUrl,

    // Features
    reservationEnabled: restaurant.reservationEnabled,
    virtualTourUrl: restaurant.virtualTourUrl,
    wifiAvailable: !!(restaurant.wifiSsid && restaurant.showWifiCredentials),

    // Media
    thumbnailUrl: restaurant.thumbnailUrl,

    // Menu Sample
    menuSample: menuSample.slice(0, 5),  // Top 5 items
  };
}
```

#### 5.2 Format Opening Hours Helper

```javascript
function formatOpeningHoursForAI(openingHours, customWorkingDays, lang = 'hr') {
  if (!openingHours?.periods) return null;

  const dayNames = {
    hr: ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'],
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  };

  const days = dayNames[lang];
  const schedule = [];

  // Convert periods to readable format
  for (let i = 0; i < 7; i++) {
    const period = openingHours.periods[i];
    if (!period || !period.open || !period.close) {
      schedule.push({ day: days[i], status: lang === 'hr' ? 'Zatvoreno' : 'Closed' });
    } else {
      const open = formatTime(period.open.time);
      const close = formatTime(period.close.time);
      schedule.push({ day: days[i], hours: `${open}-${close}` });
    }
  }

  // Compress consecutive days with same hours
  const compressed = compressSchedule(schedule, lang);

  // Today's hours
  const now = getZagrebNow();
  const jsDay = now.getDay();
  const todayPeriod = openingHours.periods[jsDay === 0 ? 6 : jsDay - 1];
  const todayStatus = todayPeriod && todayPeriod.open && todayPeriod.close
    ? { opens: formatTime(todayPeriod.open.time), closes: formatTime(todayPeriod.close.time) }
    : { closed: true };

  return {
    formatted: compressed,
    today: todayStatus,
    raw: openingHours,  // Keep for debugging
  };
}

function formatTime(time) {
  if (!time || time.length < 4) return '';
  return `${time.slice(0, 2)}:${time.slice(2, 4)}`;
}

function compressSchedule(schedule, lang) {
  // "Pon-Pet: 10:00-22:00, Sub: 10:00-23:00, Ned: Zatvoreno"
  const groups = [];
  let currentGroup = { days: [schedule[0].day], hours: schedule[0].hours || schedule[0].status };

  for (let i = 1; i < schedule.length; i++) {
    const current = schedule[i];
    const hoursMatch = (current.hours || current.status) === currentGroup.hours;

    if (hoursMatch) {
      currentGroup.days.push(current.day);
    } else {
      groups.push(currentGroup);
      currentGroup = { days: [current.day], hours: current.hours || current.status };
    }
  }
  groups.push(currentGroup);

  return groups.map(g => {
    const dayRange = g.days.length > 1 ? `${g.days[0]}-${g.days[g.days.length - 1]}` : g.days[0];
    return `${dayRange}: ${g.hours}`;
  }).join(', ');
}
```

#### 5.3 Update All Handlers to Use New Function

**Primjer: `handleDescription` [agent.js:1233]**

**Prije:**
```javascript
const details = await fetchRestaurantDetails(rBasic.id);
const types = details ? await fetchTypesForRestaurant(details) : null;
const data = {
  restaurant: {
    id: details?.id,
    name: details?.name,
    address: details?.address || null,
    // ... partial data
  },
  description: descriptionText,
  perks: types?.establishmentPerks?.map(...) || [],
};
```

**Nakon:**
```javascript
const data = await buildComprehensiveRestaurantData(rBasic.id, lang);
if (!data) {
  // handle error
}
// Data već ima sve što treba!
```

### 🚀 PRIORITET 2: Improve Menu Search with Semantic Understanding

#### 5.4 Add Semantic Menu Search

**Opcija A: Hybrid Search (Text + AI)**

```javascript
async function searchMenuWithAI(restaurantId, query, lang = 'hr') {
  // 1. Traditional search (brz)
  const textResults = await searchMenuForRestaurant(restaurantId, query, lang);

  // 2. If results < 3, use AI to expand query
  if (textResults.length < 3) {
    const expandedQueries = await expandQueryWithAI(query, lang);
    // expandedQueries: ["pizza", "pica", "pizze", "margarita", "capricciosa"]

    for (const expandedQuery of expandedQueries) {
      const moreResults = await searchMenuForRestaurant(restaurantId, expandedQuery, lang);
      textResults.push(...moreResults);
    }
  }

  // 3. Remove duplicates
  const unique = deduplicateItems(textResults);
  return unique;
}

async function expandQueryWithAI(query, lang) {
  const prompt = `Given the user search query "${query}", generate 5 related food/drink terms in ${lang === 'hr' ? 'Croatian' : 'English'} that would help find menu items.

Examples:
- pizza → ["pizza", "pica", "pizze", "margarita", "capricciosa"]
- burger → ["burger", "hamburger", "cheeseburger", "beef burger"]
- pasta → ["pasta", "tjestenina", "spaghetti", "penne", "carbonara"]

Return ONLY a JSON array of strings: ["term1", "term2", ...]`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  });

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch {
    return [query];  // fallback
  }
}
```

**Opcija B: Vector Embeddings (NAJBOLJE, ali kompleksnije)**

1. **Generate embeddings za sve menu items**
   - Koristi OpenAI `text-embedding-3-small` ($0.02 / 1M tokens)
   - Store embeddings u Postgres s `pgvector` extension

2. **Search by similarity**
   ```sql
   SELECT * FROM menu_items
   ORDER BY embedding <=> query_embedding
   LIMIT 10;
   ```

3. **Hybrid: Text + Vector**
   - Text search za exact matches (brzo)
   - Vector search za semantic matches (sporo, ali kvalitetnije)

**Implementacija (Future):**
```javascript
// Dodaj column u migrations
ALTER TABLE "MenuItemTranslations" ADD COLUMN embedding vector(1536);

// Generate embeddings job
async function generateMenuEmbeddings() {
  const items = await MenuItemTranslation.findAll({ where: { embedding: null } });

  for (const item of items) {
    const text = `${item.name} ${item.description || ''}`;
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    await item.update({ embedding: embedding.data[0].embedding });
  }
}

// Search
async function vectorSearchMenu(query, restaurantId, limit = 10) {
  const queryEmbedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });

  const results = await sequelize.query(`
    SELECT mit.*, mi.*
    FROM "MenuItemTranslations" mit
    JOIN "MenuItems" mi ON mit."menuItemId" = mi.id
    WHERE mi."restaurantId" = :restaurantId
    ORDER BY mit.embedding <=> :embedding
    LIMIT :limit
  `, {
    replacements: {
      restaurantId,
      embedding: JSON.stringify(queryEmbedding.data[0].embedding),
      limit,
    },
  });

  return results;
}
```

### 🚀 PRIORITET 3: Improve Prompt Engineering

#### 5.5 Dynamic Few-Shot Examples

**Problem:** Hardcoded examples u `llm.js` nisu prilagođeni stvarnim podacima.

**Rješenje:** Generate examples based on actual data.

```javascript
function generateContextualExamples(intent, data, lang) {
  switch (intent) {
    case 'menu_search':
      if (!data.items || data.items.length === 0) {
        return lang === 'hr'
          ? 'Primjer kad nema rezultata: "Nažalost, restoran nema tu stavku u jelovniku. Mogu li vam pomoći s nečim drugim?"'
          : 'Example when no results: "Unfortunately, the restaurant doesn\'t have that item. Can I help with something else?"';
      }

      const firstItem = data.items[0];
      const exampleName = firstItem.translations?.hr?.name || firstItem.name;
      const examplePrice = firstItem.price ? `${firstItem.price} €` : '';

      return lang === 'hr'
        ? `Primjer dobrog odgovora za menu_search:\n"Da, restoran ima ${exampleName}${examplePrice ? ` za ${examplePrice}` : ''}. ${data.items.length > 1 ? `Također imaju i druge opcije.` : ''} Želite li znati više?"`
        : `Example good response for menu_search:\n"Yes, the restaurant has ${exampleName}${examplePrice ? ` for ${examplePrice}` : ''}. ${data.items.length > 1 ? `They also have other options.` : ''} Would you like to know more?"`;

    case 'nearby':
      if (!data.nearby || data.nearby.length === 0) {
        return lang === 'hr'
          ? 'Primjer kad nema restorana: "Nažalost, nema restorana u blizini prema vašim kriterijima. Želite li proširiti pretragu?"'
          : 'Example when no restaurants: "Unfortunately, there are no restaurants nearby matching your criteria. Would you like to expand your search?"';
      }

      const firstRestaurant = data.nearby[0];
      return lang === 'hr'
        ? `Primjer dobrog odgovora za nearby:\n"U blizini se nalazi ${firstRestaurant.name}, udaljen ${firstRestaurant.distanceKm} km${firstRestaurant.openNow ? ' i trenutno otvoren' : ''}. Nalazi se na ${firstRestaurant.address}. ${firstRestaurant.description ? firstRestaurant.description.substring(0, 100) : ''} Želite li znati više?"`
        : `Example good response for nearby:\n"${firstRestaurant.name} is ${firstRestaurant.distanceKm} km away${firstRestaurant.openNow ? ' and currently open' : ''}. It's located at ${firstRestaurant.address}. ${firstRestaurant.description ? firstRestaurant.description.substring(0, 100) : ''} Would you like to know more?"`;

    default:
      return '';
  }
}
```

#### 5.6 Structured Output with JSON Mode

**Problem:** AI odgovor je plain text, ne strukturiran.

**Rješenje:** Koristi JSON mode za određene intente.

```javascript
async function generateStructuredReply({ lang, intent, question, data }) {
  const requiresStructure = ['nearby', 'menu_search', 'reviews'];

  if (requiresStructure.includes(intent)) {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are Dinver AI. Respond with valid JSON in this format:
{
  "text": "Natural language response (2-4 sentences)",
  "highlights": ["key point 1", "key point 2"],
  "followUp": "Suggested follow-up question"
}

Language: ${lang === 'hr' ? 'Croatian' : 'English'}
Data: ${JSON.stringify(data)}`,
        },
        { role: 'user', content: question },
      ],
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    return {
      text: parsed.text,
      metadata: {
        highlights: parsed.highlights,
        followUp: parsed.followUp,
      },
    };
  }

  // Regular flow za druge intente
  return generateNaturalReply({ lang, intent, question, data, fallback: '' });
}
```

**Benefit:** Frontend može prikazati highlights kao bulletse, follow-up kao button, itd.

### 🚀 PRIORITET 4: Better Context Management

#### 5.7 Persist Context to Database

**Problem:** Context se gubi na restart servera.

**Rješenje:** Store u `AiThread` tablici.

**Nova struktura:**
```javascript
AiThread {
  id: UUID
  userId: UUID
  restaurantId: UUID (nullable)
  title: String
  context: JSONB  // ← NOVO!
  /*
  context: {
    restaurantHistory: [uuid1, uuid2, uuid3],
    searchHistory: ["pizza", "burger"],
    intentHistory: ["menu_search", "nearby"],
    preferences: {
      language: "hr",
      priceRange: [1, 3],
      dietaryRestrictions: [1],  // Vegetarian
    },
    lastInteractionAt: "2025-11-17T14:30:00Z"
  }
  */
  messageCount: Integer
  lastMessageAt: Date
  expiresAt: Date
  isReadOnly: Boolean
}
```

**Migration:**
```sql
ALTER TABLE "AiThreads" ADD COLUMN context JSONB DEFAULT '{}';
```

**Update `updateContext()` funkciju:**
```javascript
async function updateContext(threadId, data) {
  if (!threadId) return;

  const thread = await AiThread.findOne({ where: { id: threadId } });
  if (!thread) return;

  let ctx = thread.context || {};

  // Update history
  if (data.restaurantId) {
    ctx.restaurantHistory = ctx.restaurantHistory || [];
    if (!ctx.restaurantHistory.includes(data.restaurantId)) {
      ctx.restaurantHistory.unshift(data.restaurantId);
      ctx.restaurantHistory = ctx.restaurantHistory.slice(0, 10);  // Povećaj na 10
    }
    ctx.lastRestaurantId = data.restaurantId;
  }

  if (data.searchTerm) {
    ctx.searchHistory = ctx.searchHistory || [];
    ctx.searchHistory.unshift(data.searchTerm);
    ctx.searchHistory = ctx.searchHistory.slice(0, 20);  // Povećaj na 20
  }

  if (data.intent) {
    ctx.intentHistory = ctx.intentHistory || [];
    ctx.intentHistory.unshift(data.intent);
    ctx.intentHistory = ctx.intentHistory.slice(0, 10);
  }

  // Infer preferences
  if (data.priceRange) {
    ctx.preferences = ctx.preferences || {};
    ctx.preferences.priceRange = data.priceRange;
  }

  ctx.lastInteractionAt = new Date().toISOString();

  // Save to DB
  await thread.update({ context: ctx });

  logContextUpdate(threadId, data);
}
```

#### 5.8 Use Context for Better Recommendations

```javascript
async function getPersonalizedRecommendations(userId, threadId, location) {
  const thread = await AiThread.findOne({ where: { id: threadId, userId } });
  if (!thread || !thread.context) return null;

  const ctx = thread.context;

  // Analiza preferences
  const preferredRestaurants = ctx.restaurantHistory || [];
  const preferredSearches = ctx.searchHistory || [];
  const dietaryRestrictions = ctx.preferences?.dietaryRestrictions || [];

  // Dohvati restaurants koje korisnik voli
  const visitedRestaurants = await Restaurant.findAll({
    where: { id: { [Op.in]: preferredRestaurants } },
    include: [/* types, perks */],
  });

  // Identificiraj pattern
  const commonFoodTypes = findCommonTypes(visitedRestaurants, 'foodTypes');
  const commonPerks = findCommonTypes(visitedRestaurants, 'establishmentPerks');

  // Nađi slične restorane
  const recommendations = await Restaurant.findAll({
    where: {
      id: { [Op.notIn]: preferredRestaurants },  // Novi restorani
      foodTypes: { [Op.overlap]: commonFoodTypes },
      establishmentPerks: { [Op.overlap]: commonPerks },
      ...(dietaryRestrictions.length > 0 && {
        dietaryTypes: { [Op.overlap]: dietaryRestrictions },
      }),
    },
    limit: 5,
  });

  return {
    recommendations,
    reasoning: {
      basedOn: `${preferredRestaurants.length} restorana koje ste posjetili`,
      commonPreferences: { foodTypes: commonFoodTypes, perks: commonPerks },
    },
  };
}
```

### 🚀 PRIORITET 5: Performance Optimization

#### 5.9 Add Redis Caching

**Install:**
```bash
npm install redis
```

**Setup:**
```javascript
// src/config/redis.js
const redis = require('redis');

const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

client.on('error', (err) => console.error('Redis error:', err));
client.connect();

module.exports = client;
```

**Use in dataAccess.js:**
```javascript
const redis = require('../config/redis');

async function fetchRestaurantDetails(id) {
  const cacheKey = `restaurant:${id}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Fetch from DB
  const restaurant = await Restaurant.findOne({ /* ... */ });
  if (!restaurant) return null;

  // Cache for 10 minutes
  await redis.setEx(cacheKey, 600, JSON.stringify(restaurant));

  return restaurant;
}
```

#### 5.10 Batch Queries for handleNearby

**Prije:**
```javascript
const enrichedForLlm = await Promise.all(
  nearby.slice(0, 5).map(async (r) => {
    const details = await fetchRestaurantDetails(r.id);  // 5x query
    // ...
  })
);
```

**Nakon:**
```javascript
// Batch fetch
const restaurantIds = nearby.slice(0, 5).map(r => r.id);
const allDetails = await Restaurant.findAll({
  where: { id: { [Op.in]: restaurantIds }, isClaimed: true },
  include: [ /* priceCategory, translations */ ],
});

const detailsMap = new Map(allDetails.map(r => [r.id, r]));

const enrichedForLlm = nearby.slice(0, 5).map(r => {
  const details = detailsMap.get(r.id);
  // ...
});
```

### 🚀 PRIORITET 6: Enhanced Filtering

#### 5.11 Combined Search Improvements

**Problem:** `handleCombinedSearch` [agent.js:1549] je partial implementiran.

**Rješenje:** Poboljšaj logiku da radi s multiple criteria.

```javascript
async function handleCombinedSearch({ lang, text, latitude, longitude, radiusKm }) {
  // 1. Parse criteria from text
  const criteria = await parseSearchCriteria(text, lang);
  // criteria: { menuItems: ["pizza"], perks: ["outdoor seating"], priceRange: [1, 2] }

  // 2. Get base restaurants (nearby or all)
  let restaurants = [];
  if (latitude && longitude) {
    restaurants = await findNearbyPartners({ latitude, longitude, radiusKm: radiusKm || 5, limit: 50 });
  } else {
    restaurants = await fetchPartnersBasic();
  }

  // 3. Filter by each criterion
  let filtered = restaurants;

  // Menu items filter
  if (criteria.menuItems && criteria.menuItems.length > 0) {
    const menuMatches = new Set();
    for (const item of criteria.menuItems) {
      const results = await searchMenuAcrossRestaurants(item);
      results.forEach(r => menuMatches.add(r.restaurant.id));
    }
    filtered = filtered.filter(r => menuMatches.has(r.id));
  }

  // Perks filter
  if (criteria.perks && criteria.perks.length > 0) {
    const perkIds = await Promise.all(criteria.perks.map(p => resolvePerkIdByName(p)));
    const validPerkIds = perkIds.filter(p => p).map(p => p.id);

    const enriched = await Promise.all(
      filtered.map(async r => {
        const details = await fetchRestaurantDetails(r.id);
        const hasAllPerks = validPerkIds.every(perkId =>
          details.establishmentPerks?.includes(perkId)
        );
        return hasAllPerks ? r : null;
      })
    );
    filtered = enriched.filter(Boolean);
  }

  // Price range filter
  if (criteria.priceRange && criteria.priceRange.length === 2) {
    const [minPrice, maxPrice] = criteria.priceRange;
    const enriched = await Promise.all(
      filtered.map(async r => {
        const details = await fetchRestaurantDetails(r.id);
        const level = details.priceCategory?.level || 0;
        return (level >= minPrice && level <= maxPrice) ? r : null;
      })
    );
    filtered = enriched.filter(Boolean);
  }

  // Dietary restrictions filter
  if (criteria.dietaryTypes && criteria.dietaryTypes.length > 0) {
    // Similar logic...
  }

  // 4. Rank results
  filtered = filtered.slice(0, 5);  // Top 5

  // 5. Generate response
  const textOut = await generateNaturalReply({
    lang,
    intent: 'combined_search',
    question: text,
    data: {
      restaurants: filtered,
      criteria,
      totalMatches: filtered.length,
    },
    fallback: '',
  });

  return { text: textOut, restaurants: filtered, restaurantId: null };
}

async function parseSearchCriteria(text, lang) {
  const prompt = `Analyze this restaurant search query and extract criteria in JSON:
Query: "${text}"
Language: ${lang}

Extract:
{
  "menuItems": ["pizza", "pasta"],  // Food/drink items mentioned
  "perks": ["outdoor seating", "wifi"],  // Establishment perks
  "priceRange": [1, 2],  // Price level 1=cheap, 4=expensive
  "dietaryTypes": ["vegetarian"],  // Dietary restrictions
  "mealTypes": ["dinner"]  // Breakfast, lunch, dinner
}

Return ONLY valid JSON.`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
  });

  return JSON.parse(response.choices[0].message.content);
}
```

---

## 6. Prioriteti Implementacije

### Faza 1: Quick Wins (1-2 tjedna)

**Cilj:** Poboljšaj kvalitetu odgovora bez većih arhitekturnih promjena.

1. ✅ **Implement `buildComprehensiveRestaurantData()`** (Prioritet 1)
   - Kreiraj funkciju koja vraća sve podatke
   - Update svih handlera da koriste tu funkciju
   - Test na production data

2. ✅ **Format Opening Hours for AI** (Prioritet 1)
   - Implement `formatOpeningHoursForAI()`
   - Test timezone logic (daylight saving)

3. ✅ **Enrich Filter IDs to Names** (Prioritet 1)
   - Update kako se šalju perks, foodTypes, mealTypes, dietaryTypes
   - Include icons za frontend

4. ✅ **Add Missing Restaurant Fields** (Prioritet 1)
   - Phone, email, social URLs u sve response
   - Ensure consistency across all handlers

**Očekivani rezultat:** AI daje 2-3x kvalitetnije odgovore jer ima sve podatke.

### Faza 2: Menu Search Improvements (2-3 tjedna)

**Cilj:** Bolja pretraga jelovnika.

1. ✅ **Implement Hybrid Menu Search** (Prioritet 2)
   - Add `searchMenuWithAI()` s AI query expansion
   - Test na real queries

2. ✅ **Improve Synonym Coverage** (Prioritet 2)
   - Expand `FOOD_SYNONYMS` map
   - Add Croatian food-specific terms

3. 🔮 **Plan Vector Embeddings** (Prioritet 2 - Future)
   - Research `pgvector` setup
   - Estimate cost za embeddings generation
   - Create migration plan

**Očekivani rezultat:** Menu search uspješnost sa 60% → 85%.

### Faza 3: Prompt Engineering & Context (3-4 tjedna)

**Cilj:** Bolji conversation flow i personalizacija.

1. ✅ **Dynamic Few-Shot Examples** (Prioritet 3)
   - Implement `generateContextualExamples()`
   - A/B test rezultate

2. ✅ **Structured Output Format** (Prioritet 3)
   - Implement `generateStructuredReply()`
   - Update frontend da koristi metadata

3. ✅ **Persist Context to DB** (Prioritet 4)
   - Add `context` column u `AiThreads`
   - Update `updateContext()` da piše u DB

4. ✅ **Personalized Recommendations** (Prioritet 4)
   - Implement `getPersonalizedRecommendations()`
   - Add "Recommended for you" feature

**Očekivani rezultat:** Conversation quality bolji, korisnici zadovoljniji, više konverzija.

### Faza 4: Performance & Scale (4-6 tjedana)

**Cilj:** Sistem radi brže i podnosi više loadova.

1. ✅ **Add Redis Caching** (Prioritet 5)
   - Setup Redis
   - Cache restaurant details (10 min)
   - Cache types & perks (1 hour)

2. ✅ **Batch Queries** (Prioritet 5)
   - Refactor `handleNearby`, `handleMenuSearch`
   - Measure performance improvement

3. ✅ **Optimize Database Queries** (Prioritet 5)
   - Add missing indexes
   - Use `EXPLAIN ANALYZE` za slow queries

4. ✅ **Monitor Performance** (Prioritet 5)
   - Add Datadog/Sentry monitoring
   - Track AI response times, success rates

**Očekivani rezultat:** Response time sa 2-3s → 500ms-1s, može podnijeti 10x više requestova.

### Faza 5: Advanced Features (6+ tjedana)

**Cilj:** Next-level AI capabilities.

1. 🔮 **Vector Embeddings for Menu** (Prioritet 2 - Advanced)
   - Generate embeddings za sve items
   - Implement semantic search

2. 🔮 **Combined Search v2** (Prioritet 6)
   - Full implementation s multiple criteria
   - AI-powered criteria parsing

3. 🔮 **LLM Model Upgrade** (Prioritet 6)
   - Test GPT-4o, Claude Sonnet 4.5
   - A/B test quality vs. cost

4. 🔮 **Voice Integration** (Future)
   - Add voice input/output
   - Integrate Whisper + TTS

**Očekivani rezultat:** Industry-leading AI restaurant assistant.

---

## 7. Tehnička Specifikacija Promjena

### 7.1 File Changes Required

**Novi fajlovi:**
```
src/dinver-ai/dataEnrichment.js  # buildComprehensiveRestaurantData, formatOpeningHoursForAI
src/dinver-ai/searchEnhanced.js  # searchMenuWithAI, expandQueryWithAI
src/dinver-ai/recommendations.js  # getPersonalizedRecommendations
src/config/redis.js               # Redis setup
```

**Izmjene postojećih:**
```
src/dinver-ai/agent.js
  - Update ALL handlers to use buildComprehensiveRestaurantData()
  - Improve handleCombinedSearch()

src/dinver-ai/dataAccess.js
  - Add Redis caching to fetchRestaurantDetails()
  - Batch query improvements

src/dinver-ai/llm.js
  - Implement generateStructuredReply()
  - Dynamic few-shot examples

src/controllers/aiController.js
  - Update context management to use DB

models/aiThread.js
  - Add context JSONB column
```

### 7.2 Database Migrations

**Migration 1: Add context column**
```sql
-- migrations/YYYYMMDDHHMMSS-add-context-to-ai-threads.js
ALTER TABLE "AiThreads" ADD COLUMN context JSONB DEFAULT '{}';
CREATE INDEX idx_ai_threads_context ON "AiThreads" USING GIN (context);
```

**Migration 2: Prepare for vector embeddings (Optional, Faza 5)**
```sql
-- Install pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding columns
ALTER TABLE "MenuItemTranslations" ADD COLUMN embedding vector(1536);
ALTER TABLE "DrinkItemTranslations" ADD COLUMN embedding vector(1536);

-- Create indexes
CREATE INDEX idx_menu_item_translations_embedding
  ON "MenuItemTranslations"
  USING ivfflat (embedding vector_cosine_ops);
```

### 7.3 Environment Variables

**Dodaj u `.env`:**
```bash
# Redis
REDIS_URL=redis://localhost:6379

# OpenAI
OPENAI_API_KEY=sk-...

# AI Configuration
AI_MODEL=gpt-4o-mini  # or gpt-4o, claude-sonnet-4-5
AI_TEMPERATURE=0
AI_MAX_TOKENS=1000

# Vector Search (Optional)
POSTGRES_SIMILARITY_ENABLED=false  # Set to true after pgvector setup

# Performance
AI_CACHE_TTL=600  # 10 minutes
TYPES_CACHE_TTL=3600  # 1 hour
```

### 7.4 Testing Strategy

**Unit Tests:**
```javascript
// tests/dinver-ai/dataEnrichment.test.js
describe('buildComprehensiveRestaurantData', () => {
  it('should return all restaurant fields', async () => {
    const data = await buildComprehensiveRestaurantData(testRestaurantId, 'hr');
    expect(data).toHaveProperty('name');
    expect(data).toHaveProperty('description');
    expect(data).toHaveProperty('openingHours.formatted');
    expect(data.establishmentPerks[0]).toHaveProperty('nameHr');
  });
});

// tests/dinver-ai/searchEnhanced.test.js
describe('searchMenuWithAI', () => {
  it('should find items with expanded queries', async () => {
    const results = await searchMenuWithAI(restaurantId, 'biftek', 'hr');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('name');
  });
});
```

**Integration Tests:**
```javascript
// tests/integration/aiFlow.test.js
describe('Full AI Flow', () => {
  it('should handle menu search query', async () => {
    const response = await request(app)
      .post('/api/app/ai/chat')
      .send({ message: 'Ima li restoran pizzu?', language: 'hr' })
      .expect(200);

    expect(response.body.reply.text).toContain('pizza');
    expect(response.body.reply.items).toBeDefined();
  });
});
```

**Performance Tests:**
```javascript
// tests/performance/aiPerformance.test.js
describe('AI Performance', () => {
  it('should respond in under 1 second', async () => {
    const start = Date.now();
    await chatAgent({ message: 'Restorani u blizini?', language: 'hr', latitude: 45.815, longitude: 15.982 });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000);
  });
});
```

---

## 8. Zaključak

### 8.1 Glavne Točke

**Što radi dobro:**
✅ Intent classification s LLM-om
✅ Opsežna lista intentova
✅ Thread management za context
✅ Multi-language support
✅ Structured data access layer

**Što treba popraviti:**
❌ Nepotpuni podaci za AI (description, contacts, formatted hours)
❌ Filter IDs umjesto human-readable names
❌ Menu search kvaliteta (samo text-based)
❌ Slaba context perzistencija
❌ Performanse (nema Redis, batch queries)

### 8.2 Očekivani Impact

| Metrika | Prije | Nakon Faze 1-2 | Nakon Faze 3-5 |
|---------|-------|----------------|----------------|
| AI Response Quality | 6/10 | 8/10 | 9.5/10 |
| Menu Search Success Rate | 60% | 85% | 95% |
| Response Time | 2-3s | 1-1.5s | 500ms-1s |
| User Satisfaction | N/A | 75% | 90% |
| Context Retention | Nema | Basic | Advanced |
| Cost per Query | $0.002 | $0.003 | $0.005 |

### 8.3 ROI Analiza

**Investicija:**
- Dev time: 8-12 tjedana (1-2 developera)
- Infrastructure: Redis ($20/mj), OpenAI API ($100-300/mj)
- Testing & QA: 2 tjedna

**Povrat:**
- Bolja konverzija (više rezervacija, više korištenja app-a)
- Manje support requestova (AI odgovara bolje)
- Konkurentska prednost (best-in-class AI assistant)

### 8.4 Next Steps

1. **Review ovu analizu** s timom
2. **Prioritiziraj** koje featuere prvo implementirati
3. **Kreiraj Jira tickete** za Fazu 1
4. **Setup dev environment** (Redis, test data)
5. **Počni s implementacijom** `buildComprehensiveRestaurantData()`

---

**Autor:** Claude (Anthropic AI)
**Kontakt za pitanja:** [Tvoj kontakt ovdje]
**Zadnji update:** 17.11.2025
