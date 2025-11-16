# Following/Buddies Sistem - Implementacija

## Kako Funkcionira

Dodali smo sistem praćenja korisnika na Dinver. Funkcionira jednostavno:

1. **Praćenje (Following)** - Možeš pratiti bilo kojeg korisnika
2. **Buddies** - Kad se dva korisnika međusobno prate, postaju "Buddies" (kao prijatelji)
3. **Vidljivost** - Kad kreiras iskustvo, biraš tko ga može vidjeti:
   - **Svi** - Svi Dinver korisnici mogu vidjeti
   - **Moji followeri** - Samo ljudi koji te prate mogu vidjeti
   - **Samo buddies** - Samo međusobni prijatelji mogu vidjeti

**Primjer:**

- Ivan prati Luku → Ivan vidi Lukina iskustva koja su postavljena na "Moji followeri" ili "Svi"
- Luka prati Ivana natrag → Sad su Buddies i mogu vidjeti međusobna iskustva postavljena na "Samo buddies"

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

---

## Kako Implementirati na Frontendu

### 1. Follow Button Komponenta

Tri stanja gumba:

- **"Prati"** - Kad ne prati korisnika
- **"Praćen"** - Kad prati korisnika
- **"Buddies ✓"** - Kad su međusobni prijatelji

```typescript
function FollowButton({ userId, status }) {
  if (status.isBuddy) {
    return <Button>Buddies ✓</Button>
  }

  if (status.isFollowing) {
    return <Button onClick={unfollow}>Praćen</Button>
  }

  return <Button onClick={follow}>Prati</Button>
}
```

---

### 2. Profil Korisnika

Prikaži:

- Broj followera
- Broj praćenih
- Broj buddies
- Follow button

```typescript
<ProfileStats>
  <Stat label="Followeri" count={95} onClick={openFollowersList} />
  <Stat label="Praćeni" count={78} onClick={openFollowingList} />
  <Stat label="Buddies" count={42} onClick={openBuddiesList} />
</ProfileStats>

<FollowButton userId={user.id} status={user.followStatus} />
```

---

### 3. Kreiranje Iskustva

Dodaj selector za vidljivost:

```typescript
<VisibilitySelector
  options={[
    { value: 'ALL', label: 'Svi', description: 'Svi korisnici' },
    { value: 'FOLLOWERS', label: 'Moji followeri', description: `${followerCount} osoba` },
    { value: 'BUDDIES', label: 'Samo buddies', description: `${buddyCount} osoba` }
  ]}
  value={visibility}
  onChange={setVisibility}
/>
```

---

### 4. Followers/Following/Buddies Liste

Tri odvojena screena:

**Followers Screen:**

```typescript
<FlatList
  data={followers}
  renderItem={({ item }) => (
    <UserListItem
      user={item}
      badge={item.isBuddy ? 'Buddy' : null}
      onPress={() => openProfile(item.id)}
    />
  )}
  onEndReached={loadMore}
/>
```

**Following Screen** - Isti kao followers

**Buddies Screen** - Samo prikaži buddies

---

### 5. Pretraživanje Korisnika

```typescript
<SearchBar
  placeholder="Pretraži korisnike"
  onChangeText={searchUsers}
  minLength={2}
/>

<FlatList
  data={searchResults}
  renderItem={({ item }) => (
    <UserListItem
      user={item}
      rightElement={<FollowButton userId={item.id} status={item.followStatus} />}
    />
  )}
/>
```

---

### 6. Experience Feed

Filtriraj iskustva prema vidljivosti (backend automatski filtrira):

```typescript
// Feed automatski prikazuje samo ono što korisnik smije vidjeti
<FlatList
  data={experiences}
  renderItem={({ item }) => (
    <ExperienceCard experience={item} />
  )}
/>
```

---

## Flow Primjeri

### Follow Flow:

1. Korisnik klikne "Prati" na nekom profilu
2. App pozove `POST /users/:id/follow`
3. Ako odgovor sadrži `isBuddy: true`, prikaži "Sada ste buddies!"
4. Ažuriraj UI na "Buddies ✓" ili "Praćen"

### Unfollow Flow:

1. Korisnik klikne "Praćen" ili "Buddies"
2. Prikaži potvrdu "Prestani pratiti?"
3. App pozove `DELETE /users/:id/follow`
4. Ažuriraj UI na "Prati"

### Create Experience Flow:

1. Korisnik popuni iskustvo
2. Dođe do koraka "Tko može vidjeti?"
3. Odabere vidljivost (default: "Svi")
4. App pošalje s `visibility` poljem
5. Iskustvo se objavi prema odabranoj vidljivosti

---

## Što Možeš Odmah Koristiti

Sve je spremno na backendu:

- ✅ Svi API endpointi rade
- ✅ Baza podataka kreirana
- ✅ Vidljivost iskustava funkcionira
- ✅ Error handling postavljen

Trebaš napraviti:

- 📱 UI komponente (FollowButton, liste, selector)
- 📱 Screene (Followers, Following, Buddies, Search)
- 📱 Integrirati API pozive
- 📱 Dodati vidljivost selector na create experience screen

---

## Dodatne Napomene

- Korisnik može pratiti neograničen broj ljudi
- Svi API-ji su paginirani (20 po stranici)
- Pretraživanje radi po imenu i emailu
- Možeš koristiti `me` kao userId za trenutnog korisnika (npr. `/users/me/followers`)
- Follow status se vraća u svim relevantnim endpointima

---

**Kontakt:** Ivan Kikić (Backend)
**Verzija:** 1.0
