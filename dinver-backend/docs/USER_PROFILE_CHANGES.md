# User Profile Changes - Frontend Dokumentacija

## 📋 Što je promijenjeno?

### Uklonjeno iz upotrebe:
- ❌ `firstName` - više se ne koristi (ali postoji u bazi za legacy support)
- ❌ `lastName` - više se ne koristi (ali postoji u bazi za legacy support)

### Novo dodano:
- ✅ `name` - **Obavezno polje** za puno ime i prezime (min. 2 znaka)
- ✅ `username` - **Obavezno polje**, jedinstveno, min. 3 znaka (samo a-z i 0-9, automatski se pretvara u lowercase)
- ✅ `gender` - Opciono polje (ENUM: 'male', 'female', 'other', 'undefined')
- ✅ `bio` - Opciono polje (max. 150 znakova)
- ✅ `instagramUrl` - Opciono polje
- ✅ `tiktokUrl` - Opciono polje

---

## 🔐 Registracija (Sign Up)

### API Endpoint:
```
POST /api/app/auth/register
```

### Obavezna polja:
```json
{
  "name": "Ivan Kikić",           // min. 2 znaka
  "username": "ivank",             // min. 3 znaka, unique, samo a-z i 0-9
  "email": "ivan@example.com",     // unique
  "password": "password123",       // min. 8 znakova
  "phone": "+385991234567",        // opciono
  "referralCode": "ABC123"         // opciono
}
```

### Validacija na frontendu:
```typescript
// Validacija name
if (name.trim().length < 2) {
  error = "Ime mora imati barem 2 znaka"
}

// Validacija username
if (username.trim().length < 3) {
  error = "Username mora imati barem 3 znaka"
}

// Username može sadržavati samo slova i brojeve
const usernameRegex = /^[a-z0-9]+$/i
if (!usernameRegex.test(username)) {
  error = "Username može sadržavati samo slova i brojeve"
}
```

### Real-time provjera username-a:

**VAŽNO:** Pozovi ovaj endpoint dok korisnik upisuje username (debounce 500ms):

```
GET /api/app/auth/check-username?username=ivank
```

**Odgovor ako je dostupan:**
```json
{
  "available": true,
  "username": "ivank"
}
```

**Odgovor ako je zauzet:**
```json
{
  "available": false,
  "username": "ivank"
}
```

**Odgovor ako je prekratak:**
```json
{
  "available": false,
  "username": "iv",
  "error": "Username must be at least 3 characters long"
}
```

**Odgovor ako ima nedozvoljene znakove:**
```json
{
  "available": false,
  "username": "ivan_k",
  "error": "Username can only contain lowercase letters and numbers"
}
```

### UI Flow za registraciju:

1. Korisnik upisuje **name** (obavezno)
   - Label: "Puno ime i prezime"
   - Placeholder: "npr. Ivan Kikić"
   - Min. 2 znaka

2. Korisnik upisuje **username** (obavezno)
   - Label: "Korisničko ime"
   - Placeholder: "npr. ivank"
   - Min. 3 znaka
   - **Real-time provjera dostupnosti** (debounce 500ms)
   - Prikaz ✅ ili ❌ ikone ovisno o dostupnosti
   - Automatski pretvara u lowercase
   - Dozvoljava samo a-z i 0-9

3. Korisnik upisuje **email** (obavezno)
   - Mora biti unique

4. Korisnik upisuje **password** (obavezno)
   - Min. 8 znakova

5. Opciono: **phone** i **referralCode**

### Response nakon uspješne registracije:
```json
{
  "message": "User registered successfully",
  "user": {
    "userId": "uuid",
    "name": "Ivan Kikić",
    "username": "ivank",
    "email": "ivan@example.com",
    "phone": "+385991234567",
    "gender": "undefined",
    "bio": null,
    "instagramUrl": null,
    "tiktokUrl": null,
    "role": "USER",
    "language": "en",
    "banned": false
  },
  "token": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

---

## 🔓 Login

### API Endpoint:
```
POST /api/app/auth/login
```

### VAŽNA PROMJENA:
Korisnik se sad može **logirati s emailom ILI username-om**!

### Request:
```json
{
  "email": "ivank",              // može biti email ILI username
  "password": "password123"
}
```

ili

```json
{
  "username": "ivank",           // može biti email ILI username
  "password": "password123"
}
```

**Backend automatski prepoznaje je li upisao email ili username.**

### UI Flow za login:

1. Input field:
   - Label: "Email ili username"
   - Placeholder: "Upiši email ili korisničko ime"
   - Korisnik može upisati bilo što (email ili username)

2. Password field:
   - Standardno password polje

3. Pošalji request s tim što je korisnik upisao

### Response nakon uspješnog logina:
```json
{
  "message": "Login successful",
  "user": {
    "userId": "uuid",
    "name": "Ivan Kikić",
    "username": "ivank",
    "email": "ivan@example.com",
    "phone": "+385991234567",
    "gender": "undefined",
    "bio": null,
    "instagramUrl": null,
    "tiktokUrl": null,
    "role": "USER",
    "language": "en",
    "banned": false
  },
  "token": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

### Error Response:
```json
{
  "error": "Invalid email/username or password"
}
```

---

## 🔵 Google Sign In

### API Endpoint:
```
POST /api/app/auth/google-signin
```

### VAŽNA PROMJENA:
Kad se korisnik registrira preko Googlea, **dobiva privremeni username** koji MORA promijeniti.

**Privremeni username format:** `user_XXXXXX` (npr. `user_847392`)

### Request:
```json
{
  "idToken": "google_id_token"
}
```

### Response za **novog** korisnika (prvi put se logira):
```json
{
  "message": "Google sign up successful",
  "isNewUser": true,
  "needsUsernameSetup": true,      // ⚠️ VAŽNO: Frontend MORA prikazati screen za odabir username-a!
  "user": {
    "userId": "uuid",
    "name": "Ivan Kikić",
    "username": "user_847392",     // Privremeni username koji korisnik MORA promijeniti
    "email": "ivan@gmail.com",
    "phone": null,
    "gender": "undefined",
    "bio": null,
    "instagramUrl": null,
    "tiktokUrl": null,
    "role": "USER",
    "language": "en",
    "banned": false,
    "profileImage": "https://google-profile-pic.jpg"
  },
  "token": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

### Response za **postojećeg** korisnika:
```json
{
  "message": "Google sign in successful",
  "isNewUser": false,
  "needsUsernameSetup": false,     // Korisnik već ima username
  "user": { ... },
  "token": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

### UI Flow - OBAVEZNO IMPLEMENTIRATI:

**Kad korisnik koristi Google Sign In:**

1. Pošalji Google ID token na backend
2. Provjeri response:
   ```typescript
   if (response.needsUsernameSetup === true) {
     // Korisnik je nov i MORA odabrati username
     navigateTo('ChooseUsernameScreen', {
       user: response.user,
       token: response.token,
       refreshToken: response.refreshToken
     })
   } else {
     // Postojeći korisnik, sve OK
     navigateTo('HomeScreen')
   }
   ```

3. **"Choose Username" Screen** (obavezan screen za nove Google korisnike):
   - Prikaži welcome poruku: "Dobrodošao, [name]!"
   - Input za username:
     - Label: "Odaberi svoje korisničko ime"
     - Placeholder: "npr. ivank"
     - Min. 3 znaka, samo a-z i 0-9
     - **Real-time provjera dostupnosti** (koristi `/api/app/auth/check-username`)
     - Prikaz ✅ ili ❌ ikone
   - "Nastavi" gumb (disabled dok username nije valjan i dostupan)
   - Informacija: "Username ne možeš promijeniti kasnije"

4. Kad korisnik odabere username:
   ```typescript
   // Update username
   const response = await fetch('/api/app/users/profile', {
     method: 'PUT',
     headers: {
       'Authorization': `Bearer ${token}`,
       'x-api-key': API_KEY,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       username: newUsername
     })
   })

   if (response.ok) {
     // Username updated, nastavi na home screen
     navigateTo('HomeScreen')
   }
   ```

---

## 👤 User Profile (Prikaz)

### API Endpoint:
```
GET /api/app/users/profile
```

### Response:
```json
{
  "id": "uuid",
  "name": "Ivan Kikić",
  "username": "ivank",
  "email": "ivan@example.com",
  "phone": "+385991234567",
  "gender": "male",
  "bio": "Food lover 🍕",
  "instagramUrl": "https://instagram.com/ivank",
  "tiktokUrl": "https://tiktok.com/@ivank",
  "birthDate": "1990-01-15",
  "profileImage": "https://...",
  "location": {
    "street": "Ilica 123",
    "city": "Zagreb",
    "country": "Croatia"
  },
  "stats": {
    "points": 1250,
    "level": 5,
    "experiencesCount": 24,
    "favoritesCount": 15,
    "completedReservations": 8
  }
}
```

### Prikaz na profilu:

**Osnovno:**
- Prikaz: `name` (ne `firstName` i `lastName` odvojeno!)
- Prikaz: `@username` (npr. "@ivank")
- Prikaz: `bio` ako postoji
- Instagram/TikTok linkovi kao ikone/gumbi
- Opcija za edit profile

**Dodatno:**
- `gender` - radio buttons: Muško / Žensko / Ostalo / Ne želim reći
- `bio` - textarea (max 150 znakova)
- `instagramUrl` i `tiktokUrl` - text inputi

---

## ✏️ Edit Profile

### API Endpoint:
```
PUT /api/app/users/profile
```

### Request Body (sve opciono, šalji samo što se mjenja):
```json
{
  "name": "Ivan Kikić",
  "username": "newusername",         // provjerava se uniqueness
  "gender": "male",
  "bio": "Food lover 🍕",
  "instagramUrl": "https://instagram.com/ivank",
  "tiktokUrl": "https://tiktok.com/@ivank",
  "phone": "+385991234567",
  "birthDate": "1990-01-15",
  "streetAddress": "Ilica 123",
  "city": "Zagreb",
  "country": "Croatia"
}
```

### Validacija:
```typescript
// Name validation
if (name && name.trim().length < 2) {
  error = "Ime mora imati barem 2 znaka"
}

// Username validation
if (username && username.trim().length < 3) {
  error = "Username mora imati barem 3 znaka"
}

// Username availability check (prije save-a)
const response = await fetch(`/api/app/auth/check-username?username=${username}`)
const { available } = await response.json()
if (!available) {
  error = "Username je već zauzet"
}

// Bio validation
if (bio && bio.length > 150) {
  error = "Bio može imati max 150 znakova"
}
```

### Response:
```json
{
  "id": "uuid",
  "name": "Ivan Kikić",
  "username": "ivank",
  "gender": "male",
  "bio": "Food lover 🍕",
  "instagramUrl": "https://instagram.com/ivank",
  "tiktokUrl": "https://tiktok.com/@ivank",
  "location": {
    "street": "Ilica 123",
    "city": "Zagreb",
    "country": "Croatia"
  },
  "contact": {
    "phone": "+385991234567",
    "email": "ivan@example.com"
  },
  "birthDate": "1990-01-15",
  "verificationStatus": {
    "isEmailVerified": true,
    "isPhoneVerified": false
  }
}
```

### UI za Edit Profile:

```typescript
<Form>
  <TextInput
    label="Ime i prezime"
    value={name}
    onChange={setName}
    minLength={2}
    required
  />

  <TextInput
    label="Korisničko ime"
    value={username}
    onChange={setUsername}
    onBlur={checkUsernameAvailability}  // real-time provjera
    minLength={3}
    required
  />

  <RadioGroup
    label="Spol"
    options={[
      { value: 'male', label: 'Muško' },
      { value: 'female', label: 'Žensko' },
      { value: 'other', label: 'Ostalo' },
      { value: 'undefined', label: 'Ne želim reći' }
    ]}
    value={gender}
    onChange={setGender}
  />

  <TextArea
    label="Bio"
    value={bio}
    onChange={setBio}
    maxLength={150}
    placeholder="Napiši nešto o sebi..."
  />

  <TextInput
    label="Instagram"
    value={instagramUrl}
    onChange={setInstagramUrl}
    placeholder="https://instagram.com/username"
  />

  <TextInput
    label="TikTok"
    value={tiktokUrl}
    onChange={setTiktokUrl}
    placeholder="https://tiktok.com/@username"
  />

  <SaveButton />
</Form>
```

---

## 🔄 Migracija postojećih podataka

Svi postojeći korisnici u bazi **automatski su dobili**:
- `name` - popunjeno iz `firstName + " " + lastName`
- `username` - auto-generirano iz `firstName + prvoSlovoLastName` (npr. "ivank")
- `gender` - postavljen na `'undefined'`

**Za frontend:** Ne trebaš ništa raditi, backend je sve spremio.

---

## 📊 Svi API Endpointi koji vraćaju `user` objekt

Svi niže navedeni endpointi **sad vraćaju nova polja** (`name`, `username`, `gender`, `bio`, `instagramUrl`, `tiktokUrl`):

### Auth:
- ✅ `POST /api/app/auth/register`
- ✅ `POST /api/app/auth/login`
- ✅ `POST /api/app/auth/refresh`
- ✅ `POST /api/app/auth/social-login`
- ✅ `POST /api/app/auth/google-signin`

### User:
- ✅ `GET /api/app/users/profile`
- ✅ `PUT /api/app/users/profile`

### Follow System:
- ✅ `GET /api/app/users/:userId/followers`
- ✅ `GET /api/app/users/:userId/following`
- ✅ `GET /api/app/users/:userId/buddies`
- ✅ `GET /api/app/users/search`
- ✅ `GET /api/app/users/:userId/profile`

---

## 🚨 Error Response-i

### Username nije dostupan:
```json
{
  "error": "Username already exists"
}
```

### Prekratak name:
```json
{
  "error": "Name is required and must be at least 2 characters long"
}
```

### Prekratak username:
```json
{
  "error": "Username is required and must be at least 3 characters long"
}
```

### Nedozvoljeni znakovi u username:
```json
{
  "available": false,
  "error": "Username can only contain lowercase letters and numbers"
}
```

---

## ✅ Checklist za Frontend

### Registracija:
- [ ] Dodaj `name` input field (min 2 znaka)
- [ ] Dodaj `username` input field (min 3 znaka)
- [ ] Implementiraj real-time provjeru username-a (debounce 500ms)
- [ ] Prikaži zelenu ✅ ili crvenu ❌ ikonu za username availability
- [ ] Makni `firstName` i `lastName` inpute
- [ ] Updateaj validaciju
- [ ] Testiraj registraciju

### Login:
- [ ] Promijeni label input fielda u "Email ili username"
- [ ] Updateaj placeholder text
- [ ] Testiraj login s emailom
- [ ] Testiraj login s username-om

### Google Sign In:
- [ ] **OBAVEZNO**: Kreiraj "Choose Username" screen za nove Google korisnike
- [ ] Implementiraj check za `needsUsernameSetup` flag
- [ ] Implementiraj navigaciju na "Choose Username" screen kad je `needsUsernameSetup === true`
- [ ] Dodaj real-time provjeru username dostupnosti na "Choose Username" screenu
- [ ] Implementiraj API call za update username-a nakon odabira
- [ ] Testiraj Google sign in flow s novim korisnikom
- [ ] Testiraj Google sign in flow s postojećim korisnikom

### Profile Screen:
- [ ] Prikaži `name` umjesto `firstName` i `lastName`
- [ ] Prikaži `@username`
- [ ] Dodaj prikaz za `gender` (ako nije undefined)
- [ ] Dodaj prikaz za `bio`
- [ ] Dodaj Instagram ikonu/link (ako postoji)
- [ ] Dodaj TikTok ikonu/link (ako postoji)

### Edit Profile Screen:
- [ ] Dodaj `name` input (min 2 znaka)
- [ ] Dodaj `username` input (min 3 znaka) s real-time provjerom
- [ ] Dodaj `gender` radio buttons
- [ ] Dodaj `bio` textarea (max 150 znakova)
- [ ] Dodaj `instagramUrl` input
- [ ] Dodaj `tiktokUrl` input
- [ ] Makni `firstName` i `lastName` inpute
- [ ] Updateaj validaciju

### Ostali Screenovi:
- [ ] Svugdje gdje prikazuješ user info, koristi `name` i `username`
- [ ] User search results
- [ ] Followers/Following/Buddies lists
- [ ] Comments
- [ ] Experience author info

---

## 📞 Kontakt

**Backend developer:** Ivan Kikić
**Verzija:** 2.0
**Datum:** 16.11.2024

Sva pitanja i nedoumice javi na Slack ili direktno.
