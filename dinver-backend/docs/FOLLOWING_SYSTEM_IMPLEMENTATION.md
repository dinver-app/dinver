# Following/Buddies Sistem - Implementacija

## Kako Funkcionira

Dodali smo sistem praćenja korisnika na Dinver. Funkcionira jednostavno:

1. **Praćenje (Following)** - Možeš pratiti bilo kojeg korisnika
2. **Buddies** - Kad se dva korisnika međusobno prate, postaju "Buddies" (kao prijatelji)
3. **Vidljivost** - Kad kreiras "Doživljaj", biraš tko ga može vidjeti:
   - **Svi** - Svi Dinver korisnici mogu vidjeti
   - **Moji followeri** - Samo ljudi koji te prate mogu vidjeti
   - **Samo buddies** - Samo međusobni prijatelji mogu vidjeti

**Primjer:**

- Ivan prati Luku → Ivan vidi Lukina iskustva koja su postavljena na "Moji followeri" ili "Svi"
- Luka prati Ivana natrag → Sad su Buddies i mogu vidjeti međusobna sve međusobne "Doživljaje"

---

## Novi API Endpointi

Svi endpointi zahtijevaju autentifikaciju (JWT token i API key).

### 1. Zaprati Korisnika

```
POST /api/app/users/:userId/follow
```

**Odgovor:**

```json
{
  "success": true,
  "message": "You are now buddies!",
  "data": {
    "isBuddy": true
  }
}
```

---

### 2. Prestani Pratiti

```
DELETE /api/app/users/:userId/follow
```

**Odgovor:**

```json
{
  "success": true,
  "message": "Successfully unfollowed user",
  "data": {
    "wasBuddy": true
  }
}
```

---

### 3. Dohvati Followere

```
GET /api/app/users/:userId/followers?page=1&limit=20&search=ime
```

Možeš napraviti infinite load.

**Parametri:**

- `userId` - ID korisnika (koristi `me` za trenutnog korisnika)
- `page` - Stranica (opciono, default: 1)
- `limit` - Broj rezultata (opciono, default: 20, max: 100)
- `search` - Pretraga po imenu (opcionalno)

**Odgovor:**

```json
{
  "success": true,
  "data": {
    "followers": [
      {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "profileImage": "https://...",
        "city": "Zagreb",
        "isBuddy": true,
        "isFollowingBack": true
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 95
    },
    "summary": {
      "totalFollowers": 95,
      "totalBuddies": 42
    }
  }
}
```

---

### 4. Dohvati Praćene Korisnike

```
GET /api/app/users/:userId/following?page=1&limit=20&search=ime
```

Isti parametri i odgovor kao followers.

---

### 5. Dohvati Buddies

```
GET /api/app/users/:userId/buddies?page=1&limit=20
```

**Odgovor:**

```json
{
  "success": true,
  "data": {
    "buddies": [
      {
        "id": "uuid",
        "firstName": "Mike",
        "lastName": "Johnson",
        "profileImage": "https://...",
        "city": "Zagreb",
        "buddiesSince": "2024-11-10T14:22:00.000Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

### 6. Provjeri Follow Status

```
GET /api/app/users/:userId/follow-status
```

**Odgovor:**

```json
{
  "success": true,
  "data": {
    "isFollowing": true,
    "isFollowedBy": true,
    "isBuddy": true
  }
}
```

---

### 7. Pretraži Korisnike

```
GET /api/app/users/search?q=ime&page=1&limit=20
```

**Parametri:**

- `q` - Tekst za pretraživanje (minimum 2 znaka)
- `page` - Stranica
- `limit` - Broj rezultata
- `excludeFollowing` - `true` za izostavljanje već praćenih (opciono)

**Odgovor:**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Smith",
        "profileImage": "https://...",
        "city": "Zagreb",
        "followStatus": {
          "isFollowing": false,
          "isFollowedBy": true,
          "isBuddy": false
        },
        "stats": {
          "totalExperiences": 24
        }
      }
    ],
    "pagination": { ... }
  }
}
```

---

### 8. Dohvati Profil sa Statistikom

```
GET /api/app/users/:userId/profile
```

**Odgovor:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "profileImage": "https://...",
    "bio": "Food lover",
    "city": "Zagreb",
    "memberSince": "2024-01-15T00:00:00.000Z",
    "followStats": {
      "followersCount": 95,
      "followingCount": 78,
      "buddiesCount": 42
    },
    "experienceStats": {
      "totalExperiences": 56
    },
    "followStatus": {
      "isFollowing": false,
      "isFollowedBy": true,
      "isBuddy": false
    }
  }
}
```

---

## Error Kodovi

Svi errori vraćaju:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Poruka greške"
  }
}
```

### Mogući Errori:

| Kod                 | Status | Što znači                   | Što napraviti                          |
| ------------------- | ------ | --------------------------- | -------------------------------------- |
| `FOLLOW_SELF`       | 400    | Pokušaj praćenja samog sebe | Prikaži poruku "Ne možeš pratiti sebe" |
| `ALREADY_FOLLOWING` | 400    | Već prati tog korisnika     | Osvježi stanje, prikaži "Following"    |
| `NOT_FOLLOWING`     | 400    | Ne prati tog korisnika      | Osvježi stanje, prikaži "Follow"       |
| `USER_NOT_FOUND`    | 404    | Korisnik ne postoji         | Prikaži "Korisnik nije pronađen"       |
| `INVALID_QUERY`     | 400    | Pretraga manja od 2 znaka   | Prikaži "Upiši barem 2 znaka"          |
| `UNAUTHORIZED`      | 401    | Nije logiran                | Preusmjeri na login                    |

---

## Vidljivost Iskustava

Kad korisnik kreira iskustvo, mora odabrati vidljivost:

### Opcije:

1. **`ALL`** - Svi mogu vidjeti
2. **`FOLLOWERS`** - Samo moji followeri mogu vidjeti
3. **`BUDDIES`** - Samo moji buddies mogu vidjeti

### API Poziv:

```
POST /api/app/experiences

{
  "restaurantId": "uuid",
  "title": "...",
  "description": "...",
  "visibility": "FOLLOWERS",  // <- Dodaj ovo
  "mediaKind": "CAROUSEL",
  ...
}
```

## Dodatne Napomene

- Korisnik može pratiti neograničen broj ljudi
- Svi API-ji su paginirani (20 po stranici)
- Pretraživanje radi po imenu i emailu
- Možeš koristiti `me` kao userId za trenutnog korisnika (npr. `/users/me/followers`)
- Follow status se vraća u svim relevantnim endpointima
