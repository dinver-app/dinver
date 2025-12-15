# Dinver Rating & Notifikacije - Ažuriranje

**Datum:** 25.11.2025.

## Pregled

Ovaj dokument opisuje nedavna ažuriranja Dinver sustava ocjena i poboljšanja push notifikacija.

---

## 1. Dinver Sustav Ocjena

### Nova Polja na Restaurant Modelu

Dva nova polja dodana su na Restaurant model:

| Polje                | Tip          | Opis                                                   |
| -------------------- | ------------ | ------------------------------------------------------ |
| `dinverRating`       | DECIMAL(3,1) | Prosječna ocjena Dinver korisnika (skala 1.0 - 10.0)   |
| `dinverReviewsCount` | INTEGER      | Broj jedinstvenih korisnika koji su ocijenili restoran |

### Algoritam Izračuna Ocjene

Dinver ocjena se računa korištenjem pristupa **po jedinstvenom korisniku** kako bi se spriječio spam:

1. Dohvati sve APPROVED Experience-e za restoran
2. Grupiraj experience-e po `userId`
3. Za svakog korisnika izračunaj prosječni `overallRating`
4. Izračunaj konačnu Dinver ocjenu kao **prosjek svih korisničkih prosjeka**

**Ključni princip:** Svaki korisnik broji se kao JEDNA ocjena, bez obzira koliko puta je posjetio restoran. Ako korisnik posjeti 10 puta i ocijeni 10.0 svaki put, i dalje se broji kao samo JEDNA ocjena od 10.0.

### Lokacija Servisa

Izračun ocjena obrađuje: `src/services/dinverRatingService.js`

Funkcije:

- `updateRestaurantDinverRating(restaurantId)` - Ažuriraj pojedini restoran
- `recalculateAllDinverRatings()` - Bulk ažuriranje svih restorana

### Ažuriranja API Odgovora

`dinverRating` i `dinverReviewsCount` sada se vraćaju u SVIM restaurant API odgovorima:

**Ažurirani kontroleri:**

- `restaurantController.js` - Svi endpointi (getById, getAll, nearby, search, itd.)
- `restaurantSearchController.js` - Search i nearby endpointi
- `visitController.js` - getUserVisits, getOtherUserVisits, getVisitsByRestaurant, getRestaurantVisitors
- `favoriteController.js` - Svi favorite endpointi
- `mustVisitController.js` - Svi must-visit endpointi
- `sysadminVisitController.js` - Admin visit endpointi

**Primjer odgovora:**

```json
{
  "id": "uuid",
  "name": "Naziv Restorana",
  "rating": 4.5,
  "dinverRating": 8.3,
  "dinverReviewsCount": 12,
  "priceLevel": 2,
  "address": "..."
}
```

---

## 2. Notifikacije za Odobrenje Računa

### Pregled

Kada se račun odobri i bodovi dodijele, push notifikacije se sada šalju:

1. Glavnom korisniku koji je poslao račun
2. Svim označenim prijateljima koji su dobili podijeljene bodove

### i18n Podrška

Notifikacije koriste i18n sustav s prijevodima u:

- `locales/en.json` - Engleski
- `locales/hr.json` - Hrvatski

### Tipovi Notifikacija

#### Za Glavnog Korisnika

| Tip                              | Kada se koristi           |
| -------------------------------- | ------------------------- |
| `receipt_approved`               | Nema označenih prijatelja |
| `receipt_approved_shared`        | 1 označeni prijatelj      |
| `receipt_approved_shared_plural` | 2+ označenih prijatelja   |

**Primjer na hrvatskom:**

- "Dobio/la si 10 bodova za račun iz Restaurant X"
- "Dobio/la si 5 bodova za račun iz Restaurant X (podijeljeno s 2 prijatelja)"

**Primjer na engleskom:**

- "You received 10 points for your receipt at Restaurant X"
- "You received 5 points for your receipt at Restaurant X (shared with 2 buddies)"

#### Za Označene Prijatelje

| Tip                      | Opis                                |
| ------------------------ | ----------------------------------- |
| `receipt_approved_buddy` | Prijatelj je označen i dobio bodove |

**Hrvatski:** "Ivan te je označio/la na računu iz Restaurant X - dobio/la si 5 bodova!"

**Engleski:** "Ivan tagged you on a receipt at Restaurant X - you got 5 points!"

### Tehnička Implementacija

Notifikacije koriste `createAndSendNotification()` iz `pushNotificationService.js` koji:

1. Dohvaća korisnikovu jezičnu preferenciju iz `UserSettings`
2. Prevodi naslov i tijelo koristeći i18next
3. Sprema notifikaciju u bazu podataka
4. Šalje push notifikaciju putem Expo-a

### Ključevi Prijevoda

```json
{
  "notifications": {
    "receipt_approved": {
      "title": "Račun odobren! 🎉",
      "body": "Dobio/la si {{points}} bodova za račun iz {{restaurantName}}"
    },
    "receipt_approved_shared": {
      "title": "Račun odobren! 🎉",
      "body": "Dobio/la si {{points}} bodova za račun iz {{restaurantName}} (podijeljeno s {{buddyCount}} prijateljem)"
    },
    "receipt_approved_shared_plural": {
      "title": "Račun odobren! 🎉",
      "body": "Dobio/la si {{points}} bodova za račun iz {{restaurantName}} (podijeljeno s {{buddyCount}} prijatelja)"
    },
    "receipt_approved_buddy": {
      "title": "Dobio/la si bodove! 🎉",
      "body": "{{actorName}} te je označio/la na računu iz {{restaurantName}} - dobio/la si {{points}} bodova!"
    }
  }
}
```

### Data Payload

Push notifikacije uključuju podatke za deep linking:

**Notifikacija glavnog korisnika:**

```json
{
  "points": 5,
  "restaurantName": "Restaurant X",
  "buddyCount": 2,
  "receiptId": "uuid",
  "totalPoints": 15,
  "sharedWith": 2
}
```

**Notifikacija prijatelja:**

```json
{
  "actorName": "Ivan",
  "restaurantName": "Restaurant X",
  "points": 5,
  "receiptId": "uuid"
}
```

Kod buddya kad stisne može odvest ili na profil pa da vidi zadnje bodove koje je dobio ili samo na profil, jer on ne vidi taj račun.

---

## 3. Povezani Fajlovi

| Fajl                                   | Svrha                             |
| -------------------------------------- | --------------------------------- |
| `src/services/dinverRatingService.js`  | Servis za izračun ocjena          |
| `src/controllers/receiptController.js` | Odobrenje računa s notifikacijama |
| `utils/pushNotificationService.js`     | Push notification servis s i18n   |
| `locales/en.json`                      | Engleski prijevodi                |
| `locales/hr.json`                      | Hrvatski prijevodi                |

---

## 4. Promjene Baze Podataka

Nije potrebna nova migracija - `dinverRating` i `dinverReviewsCount` polja su već dodana na Restaurant model.
