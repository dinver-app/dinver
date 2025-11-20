# Profile Privacy i Must-Visit/Visited Public Viewing - Dokumentacija

## Pregled

Sustav omogućava korisnicima da kontroliraju tko može vidjeti njihov profil (must-visit listu, visited listu, i ostale podatke profila) kroz tri razine privatnosti:

- **`public`** - Svi mogu vidjeti (uključujući nelogirane korisnike)
- **`followers`** - Samo ljudi koji te prate mogu vidjeti
- **`buddies`** - Samo "buddies" (ljudi s kojima se međusobno pratite) mogu vidjeti

## Quick Start za Frontend

### 3 Ključne Stvari:

1. **Privacy postavka** - Korisnik može promijeniti `profileVisibility` u postavkama
2. **Public viewing** - Možeš vidjeti must-visit/visited liste drugih korisnika (ako imaju dopuštenje)
3. **Error handling** - Ako korisnik nema dopuštenje, API vraća `403` s porukom zašto

---

## 1. Privacy Razine - Detaljno Objašnjenje

### `public` (Javno)
- **Tko može vidjeti:** Svi, uključujući nelogirane korisnike
- **Use case:** Korisnik želi da bilo tko vidi njegove restorane
- **Primjer:** Instagram javni profil

### `followers` (Samo Followeri)
- **Tko može vidjeti:** Samo ljudi koji te prate
- **Provjera:** Da li viewer prati target user-a?
- **Use case:** Želiš da samo ljudi koji te prate vide tvoju must-visit listu
- **Primjer:** Privatni Instagram profil (ali followeri mogu vidjeti)

### `buddies` (Samo Buddies - Međusobni Followeri)
- **Tko može vidjeti:** Samo ljudi s kojima se međusobno pratite
- **Provjera:** Da li se viewer i target user međusobno prate?
- **Use case:** Najstroža privatnost - samo bliski prijatelji
- **Primjer:** Samo najbliži prijatelji mogu vidjeti

---

## 2. API Endpoints

### 2.1 Dohvati Must-Visit Listu Drugog Korisnika

**Endpoint:**
```
GET /api/app/users/:userId/must-visit
```

**Headers:**
```
x-api-key: your-api-key
Authorization: Bearer <token>  // OPCIONO - ako je korisnik logiran
```

**Parametri:**
- `userId` (u URL-u) - UUID korisnika čiju must-visit listu želiš vidjeti

**Response (200 OK) - Uspješno:**
```json
[
  {
    "id": "fav-uuid-1",
    "addedAt": "2025-11-15T10:00:00.000Z",
    "restaurant": {
      "id": "restaurant-uuid-1",
      "name": "Pizzeria Bella",
      "rating": 4.5,
      "priceLevel": 2,
      "address": "Trg bana Jelačića 5",
      "place": "Zagreb",
      "isClaimed": true,
      "thumbnailUrl": "https://cdn.dinverapp.com/images/abc123.jpg",
      "userRatingsTotal": 150
    }
  },
  {
    "id": "fav-uuid-2",
    "addedAt": "2025-11-10T14:30:00.000Z",
    "restaurant": {
      "id": "restaurant-uuid-2",
      "name": "Konoba Dalmatino",
      "rating": 4.8,
      "priceLevel": 3,
      "address": "Obala hrvatskog narodnog preporoda 10",
      "place": "Split",
      "isClaimed": true,
      "thumbnailUrl": "https://cdn.dinverapp.com/images/def456.jpg",
      "userRatingsTotal": 89
    }
  }
]
```

**Response (403 Forbidden) - Nema Dopuštenje:**
```json
{
  "error": "You must follow this user to view their profile"
}
```

**Mogući Error Razlozi:**
- `"Authentication required for non-public profile"` - Profil nije public, a korisnik nije logiran
- `"You must follow this user to view their profile"` - Profil je `followers`, a viewer ne prati target user-a
- `"You must be buddies (mutual follow) to view this profile"` - Profil je `buddies`, a nisu međusobni followeri

**Response (404 Not Found) - Korisnik Ne Postoji:**
```json
{
  "error": "User not found"
}
```

---

### 2.2 Dohvati Visited Listu Drugog Korisnika

**Endpoint:**
```
GET /api/app/users/:userId/visited
```

**Headers:**
```
x-api-key: your-api-key
Authorization: Bearer <token>  // OPCIONO
```

**Response (200 OK) - Uspješno:**
```json
[
  {
    "id": "fav-uuid-3",
    "addedAt": "2025-10-01T09:00:00.000Z",
    "visitedAt": "2025-11-20T19:30:00.000Z",
    "visitId": "visit-uuid-1",
    "restaurant": {
      "id": "restaurant-uuid-3",
      "name": "Restaurant Dubravkin Put",
      "rating": 4.7,
      "priceLevel": 3,
      "address": "Dubravkin put 2",
      "place": "Zagreb",
      "isClaimed": true,
      "thumbnailUrl": "https://cdn.dinverapp.com/images/ghi789.jpg",
      "userRatingsTotal": 200
    }
  }
]
```

**Response (403/404) - Isti kao za must-visit endpoint**

---

### 2.3 Dohvati Korisničke Postavke (Uključujući Privacy)

**Endpoint:**
```
GET /api/app/settings
```

**Headers:**
```
x-api-key: your-api-key
Authorization: Bearer <token>  // OBAVEZNO
```

**Response (200 OK):**
```json
{
  "settings": {
    "language": "hr",
    "notifications": {
      "push": true,
      "email": true,
      "sms": false
    },
    "verification": {
      "isEmailVerified": true,
      "isPhoneVerified": false
    },
    "profileVisibility": "public"
  }
}
```

---

### 2.4 Ažuriraj Profile Privacy Postavku

**Endpoint:**
```
PUT /api/app/settings
```

**Headers:**
```
x-api-key: your-api-key
Authorization: Bearer <token>  // OBAVEZNO
Content-Type: application/json
```

**Body:**
```json
{
  "settings": {
    "profileVisibility": "followers"
  }
}
```

**Moguće Vrijednosti:**
- `"public"` - Javno
- `"followers"` - Samo followeri
- `"buddies"` - Samo buddies

**Response (200 OK):**
```json
{
  "settings": {
    "language": "hr",
    "notifications": {
      "push": true,
      "email": true,
      "sms": false
    },
    "verification": {
      "isEmailVerified": true,
      "isPhoneVerified": false
    },
    "profileVisibility": "followers"
  }
}
```

**Response (400 Bad Request) - Neispravna Vrijednost:**
```json
{
  "error": "Invalid profileVisibility value. Must be: public, followers, or buddies"
}
```

---

## 3. Privacy Matrica - Tko Može Vidjeti Što?

| Target User Privacy | Viewer Status | Može Vidjeti? | Error Poruka (ako ne može) |
|---------------------|---------------|---------------|----------------------------|
| `public` | Nelogiran korisnik | ✅ DA | - |
| `public` | Logiran (bilo tko) | ✅ DA | - |
| `public` | Follower | ✅ DA | - |
| `public` | Buddy | ✅ DA | - |
| `followers` | Nelogiran korisnik | ❌ NE | "Authentication required for non-public profile" |
| `followers` | Logiran (ne prati) | ❌ NE | "You must follow this user to view their profile" |
| `followers` | Follower (prati target usera) | ✅ DA | - |
| `followers` | Buddy | ✅ DA | - |
| `buddies` | Nelogiran korisnik | ❌ NE | "Authentication required for non-public profile" |
| `buddies` | Logiran (ne prati) | ❌ NE | "You must be buddies (mutual follow) to view this profile" |
| `buddies` | Follower (samo jedan prati) | ❌ NE | "You must be buddies (mutual follow) to view this profile" |
| `buddies` | Buddy (međusobno se prate) | ✅ DA | - |
| **BILO KOJI** | **Sam vlasnik profila** | ✅ UVIJEK | - |

---

## 4. Frontend Implementacija

### 4.1 Prikaz Must-Visit Liste Drugog Korisnika

```typescript
const fetchUserMustVisit = async (userId: string) => {
  try {
    // Opciono: provjeri je li korisnik logiran i posalji token
    const token = await getAuthToken(); // može biti null

    const headers: any = {
      'x-api-key': API_KEY,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/app/users/${userId}/must-visit`,
      { headers }
    );

    if (response.status === 200) {
      const mustVisitList = await response.json();
      // Prikaži must-visit listu
      return { success: true, data: mustVisitList };
    }

    if (response.status === 403) {
      const error = await response.json();
      // Prikaži poruku korisniku
      return {
        success: false,
        error: error.error,
        needsAuth: error.error.includes('Authentication required'),
        needsFollow: error.error.includes('follow'),
      };
    }

    if (response.status === 404) {
      return { success: false, error: 'Korisnik nije pronađen' };
    }

  } catch (error) {
    console.error('Error fetching must-visit list:', error);
    return { success: false, error: 'Greška pri dohvaćanju liste' };
  }
};
```

### 4.2 Prikaz Visited Liste Drugog Korisnika

```typescript
const fetchUserVisited = async (userId: string) => {
  try {
    const token = await getAuthToken();

    const headers: any = {
      'x-api-key': API_KEY,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/app/users/${userId}/visited`,
      { headers }
    );

    if (response.status === 200) {
      const visitedList = await response.json();
      // Prikaži visited listu s dodatnim podacima (visitedAt, visitId)
      return { success: true, data: visitedList };
    }

    // Isti error handling kao za must-visit
    // ...

  } catch (error) {
    console.error('Error fetching visited list:', error);
    return { success: false, error: 'Greška pri dohvaćanju liste' };
  }
};
```

### 4.3 Privacy Settings - Postavke Profila

```typescript
const updateProfilePrivacy = async (visibility: 'public' | 'followers' | 'buddies') => {
  try {
    const token = await getAuthToken(); // OBAVEZNO

    const response = await fetch(
      `${API_BASE_URL}/api/app/settings`,
      {
        method: 'PUT',
        headers: {
          'x-api-key': API_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: {
            profileVisibility: visibility,
          },
        }),
      }
    );

    if (response.status === 200) {
      const updatedSettings = await response.json();
      // Spremi u state i prikaži success poruku
      return { success: true, data: updatedSettings };
    }

    if (response.status === 400) {
      const error = await response.json();
      return { success: false, error: error.error };
    }

  } catch (error) {
    console.error('Error updating privacy settings:', error);
    return { success: false, error: 'Greška pri ažuriranju postavki' };
  }
};
```

---

## 5. UI/UX Preporuke

### 5.1 Prikaz Must-Visit/Visited Liste (Viewer Perspektiva)

**Scenario 1: Uspješno Dohvaćanje**
```
┌─────────────────────────────────────┐
│  @marko's Must-Visit List           │
├─────────────────────────────────────┤
│  📍 Pizzeria Bella                  │
│     Zagreb · €€                     │
│     ⭐ 4.5 (150 reviews)            │
├─────────────────────────────────────┤
│  📍 Konoba Dalmatino                │
│     Split · €€€                     │
│     ⭐ 4.8 (89 reviews)             │
└─────────────────────────────────────┘
```

**Scenario 2: Nema Dopuštenja - Treba Follow**
```
┌─────────────────────────────────────┐
│  @marko's Must-Visit List           │
├─────────────────────────────────────┤
│                                     │
│     🔒                              │
│  This profile is private            │
│                                     │
│  Follow @marko to see their         │
│  must-visit restaurants             │
│                                     │
│  [ Follow ]                         │
│                                     │
└─────────────────────────────────────┘
```

**Scenario 3: Nema Dopuštenja - Treba Buddy**
```
┌─────────────────────────────────────┐
│  @marko's Must-Visit List           │
├─────────────────────────────────────┤
│                                     │
│     🔒                              │
│  This profile is for buddies only   │
│                                     │
│  You and @marko need to follow      │
│  each other to see this content     │
│                                     │
└─────────────────────────────────────┘
```

**Scenario 4: Nema Dopuštenja - Nije Logiran**
```
┌─────────────────────────────────────┐
│  @marko's Must-Visit List           │
├─────────────────────────────────────┤
│                                     │
│     🔒                              │
│  This profile is private            │
│                                     │
│  Log in to view this content        │
│                                     │
│  [ Log In ]                         │
│                                     │
└─────────────────────────────────────┘
```

### 5.2 Privacy Settings Screen (Vlasnik Profila)

```
┌─────────────────────────────────────┐
│  Privacy Settings                   │
├─────────────────────────────────────┤
│                                     │
│  Profile Visibility                 │
│                                     │
│  ○ Public                           │
│    Everyone can see your profile    │
│                                     │
│  ● Followers Only                   │
│    Only your followers can see      │
│                                     │
│  ○ Buddies Only                     │
│    Only mutual followers can see    │
│                                     │
│  [ Save Changes ]                   │
│                                     │
└─────────────────────────────────────┘
```

---

## 6. Helper Functions za Frontend

### 6.1 Privacy Icon Mapper

```typescript
const getPrivacyIcon = (visibility: string) => {
  switch (visibility) {
    case 'public':
      return '🌍'; // Globus - javno
    case 'followers':
      return '👥'; // Ljudi - followeri
    case 'buddies':
      return '🤝'; // Rukovanje - buddies
    default:
      return '🔒'; // Lokot - nepoznato
  }
};
```

### 6.2 Privacy Label Mapper

```typescript
const getPrivacyLabel = (visibility: string) => {
  switch (visibility) {
    case 'public':
      return 'Javno';
    case 'followers':
      return 'Samo followeri';
    case 'buddies':
      return 'Samo buddies';
    default:
      return 'Privatno';
  }
};
```

### 6.3 Privacy Description Mapper

```typescript
const getPrivacyDescription = (visibility: string) => {
  switch (visibility) {
    case 'public':
      return 'Bilo tko može vidjeti tvoj profil i liste';
    case 'followers':
      return 'Samo ljudi koji te prate mogu vidjeti tvoj profil';
    case 'buddies':
      return 'Samo ljudi s kojima se međusobno pratite mogu vidjeti';
    default:
      return '';
  }
};
```

### 6.4 Error Handler za Privacy Errors

```typescript
const handlePrivacyError = (errorMessage: string, targetUsername: string) => {
  if (errorMessage.includes('Authentication required')) {
    return {
      title: 'Prijava potrebna',
      message: 'Prijavite se kako biste vidjeli ovaj profil',
      action: 'LOG_IN',
      actionLabel: 'Prijavi se',
    };
  }

  if (errorMessage.includes('must follow')) {
    return {
      title: 'Privatni profil',
      message: `Zapratite @${targetUsername} kako biste vidjeli njihove restorane`,
      action: 'FOLLOW',
      actionLabel: 'Zaprati',
    };
  }

  if (errorMessage.includes('buddies')) {
    return {
      title: 'Samo za buddies',
      message: `Vi i @${targetUsername} morate se međusobno pratiti`,
      action: 'NONE',
      actionLabel: null,
    };
  }

  return {
    title: 'Nema pristupa',
    message: 'Ne možete vidjeti ovaj profil',
    action: 'NONE',
    actionLabel: null,
  };
};
```

---

## 7. Napredna Implementacija - Optimizacija

### 7.1 Provjera Prije Poziva API-ja

Ako znaš status follow odnosa između viewer-a i target user-a, možeš preventivno prikazati privacy poruku:

```typescript
const canViewProfile = (
  targetPrivacy: 'public' | 'followers' | 'buddies',
  isLoggedIn: boolean,
  isFollowing: boolean,
  isBuddy: boolean
) => {
  // Public - svi mogu vidjeti
  if (targetPrivacy === 'public') {
    return { canView: true };
  }

  // Followers - mora biti logiran i pratiti
  if (targetPrivacy === 'followers') {
    if (!isLoggedIn) {
      return {
        canView: false,
        reason: 'Morate biti prijavljeni'
      };
    }
    if (!isFollowing) {
      return {
        canView: false,
        reason: 'Morate pratiti ovog korisnika'
      };
    }
    return { canView: true };
  }

  // Buddies - mora biti buddy
  if (targetPrivacy === 'buddies') {
    if (!isLoggedIn) {
      return {
        canView: false,
        reason: 'Morate biti prijavljeni'
      };
    }
    if (!isBuddy) {
      return {
        canView: false,
        reason: 'Morate biti buddies'
      };
    }
    return { canView: true };
  }

  return { canView: false, reason: 'Nepoznata greška' };
};
```

### 7.2 Caching Strategija

Cache privacy settings da ne moraš uvijek pozivati API:

```typescript
// Spremi u cache nakon dohvaćanja
const cacheUserPrivacy = (userId: string, privacy: string) => {
  const cacheKey = `user_privacy_${userId}`;
  const cacheData = {
    privacy,
    timestamp: Date.now(),
  };
  localStorage.setItem(cacheKey, JSON.stringify(cacheData));
};

// Provjeri cache prije poziva
const getCachedUserPrivacy = (userId: string) => {
  const cacheKey = `user_privacy_${userId}`;
  const cached = localStorage.getItem(cacheKey);

  if (!cached) return null;

  const { privacy, timestamp } = JSON.parse(cached);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minuta

  if (Date.now() - timestamp > CACHE_DURATION) {
    localStorage.removeItem(cacheKey);
    return null;
  }

  return privacy;
};
```

---

## 8. Testing Checklist

### Backend Testing

- [ ] Public profil - nelogiran korisnik može vidjeti must-visit
- [ ] Public profil - nelogiran korisnik može vidjeti visited
- [ ] Public profil - logiran korisnik može vidjeti must-visit
- [ ] Public profil - logiran korisnik može vidjeti visited
- [ ] Followers profil - nelogiran korisnik dobiva 403
- [ ] Followers profil - logiran korisnik (ne prati) dobiva 403
- [ ] Followers profil - logiran korisnik (prati) može vidjeti
- [ ] Buddies profil - nelogiran korisnik dobiva 403
- [ ] Buddies profil - logiran korisnik (nije buddy) dobiva 403
- [ ] Buddies profil - logiran korisnik (buddy) može vidjeti
- [ ] Vlasnik profila uvijek može vidjeti svoju listu
- [ ] Ažuriranje privacy postavki - uspješno
- [ ] Ažuriranje privacy postavki - neispravna vrijednost vraća 400
- [ ] GET /api/app/settings vraća profileVisibility
- [ ] Nepostojeći userId vraća 404

### Frontend Testing

- [ ] Prikaz must-visit liste za public profil
- [ ] Prikaz visited liste za public profil
- [ ] Prikaz privacy error poruke (followers)
- [ ] Prikaz privacy error poruke (buddies)
- [ ] Prikaz privacy error poruke (nije logiran)
- [ ] Privacy settings screen - prikaz trenutne postavke
- [ ] Privacy settings screen - promjena postavke
- [ ] Privacy settings screen - validacija
- [ ] Error handling za network errors
- [ ] Loading states za async pozive

---

## 9. Česta Pitanja (FAQ)

**Q: Što ako korisnik promijeni privacy settings dok netko gleda njihovu listu?**
A: Sljedeći API poziv će respektirati novu postavku. Za real-time update možeš implementirati polling ili WebSocket.

**Q: Da li owner profila vidi svoj profil uvijek?**
A: Da, vlasnik profila UVIJEK može vidjeti svoj must-visit/visited listu, neovisno o privacy postavci.

**Q: Što ako korisnik nema UserSettings zapis?**
A: Backend vraća error "User settings not found" i 403 status. Idealno, UserSettings treba biti kreiran automatski kod registracije.

**Q: Može li se privacy postavka primjenjivati samo na must-visit, a ne na visited?**
A: Trenutno ne - profileVisibility se primjenjuje na cijeli profil (i must-visit i visited). Ako želiš granularnu kontrolu, dodaj odvojene flagove.

**Q: Da li nelogirani korisnici mogu vidjeti javne profile?**
A: Da, public profili su dostupni svima, čak i bez autentikacije.

**Q: Kako backend razlikuje logged-in i non-logged-in korisnika?**
A: Koristi `appOptionalAuth` middleware koji postavlja `req.user` ako je token prisutan, ili ga ostavlja `undefined` ako nije.

---

## 10. Mogući Budući Feature-i

- **Granularna kontrola**: Odvojene privacy postavke za must-visit, visited, reviews, itd.
- **Privremeni pristup**: "Share link" koji omogućava privremeni pristup privatnom profilu
- **Blocked users**: Lista blokiranih korisnika koji ne mogu vidjeti profil čak ni kao buddies
- **Privacy analytics**: Prikaz koliko ljudi je pogledalo tvoju must-visit listu
- **Custom lists**: Kreiraj više lista s različitim privacy postavkama

---

**Kraj dokumentacije** - Za dodatna pitanja kontaktirajte backend tim! 🚀
