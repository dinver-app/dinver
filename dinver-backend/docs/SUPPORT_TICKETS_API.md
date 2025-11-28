# Support Tickets API Documentation

Dokumentacija za Support Tickets feature - omogućuje korisnicima da šalju upite, prijave i sugestije, a administratorima da odgovaraju na tickete.

## Sadržaj

- [Overview](#overview)
- [Mobile App API Routes](#mobile-app-api-routes)
- [Kategorije ticketa](#kategorije-ticketa)
- [Status ticketa](#status-ticketa)
- [Primjeri korištenja](#primjeri-korištenja)

---

## Overview

Support Tickets sustav omogućuje:
- Korisnici mogu kreirati tickete s pitanjima, prijavama grešaka, prijavama korisnika/restorana
- Korisnici mogu referencirati prethodne tickete (follow-up)
- Admin odgovara na **dva jezika** (HR i EN)
- Korisnik vidi odgovor na jeziku svoje aplikacije

**Važno:** Svaki ticket ima jedinstveni `ticketNumber` (npr. #1, #2, #1001...) koji korisnik može koristiti za referenciranje.

---

## Mobile App API Routes

Base URL: `/api/app`

### 1. Kreiranje ticketa

**POST** `/api/app/support/tickets`

**Headers:**
```
Authorization: Bearer <token>
X-API-Key: <app_api_key>
```

**Request Body:**
```json
{
  "category": "question",
  "subject": "Nedostaju mi bodovi",
  "message": "Poslao sam račun prije 3 dana i još uvijek nisam dobio bodove. Račun je bio za restoran XY.",
  "relatedRestaurantId": "uuid-restorana",
  "relatedUserId": "uuid-korisnika-kojeg-prijavljujem",
  "relatedTicketNumber": 42,
  "metadata": {
    "appVersion": "2.1.0",
    "platform": "ios",
    "deviceModel": "iPhone 14"
  }
}
```

**Polja:**
| Polje | Tip | Obavezno | Opis |
|-------|-----|----------|------|
| `category` | string | Ne (default: "question") | Kategorija ticketa |
| `subject` | string | **Da** | Kratki naslov (max 200 znakova) |
| `message` | string | **Da** | Detaljna poruka korisnika |
| `relatedRestaurantId` | UUID | Ne | ID restorana ako se ticket odnosi na restoran |
| `relatedUserId` | UUID | Ne | ID korisnika ako prijavljuje drugog korisnika |
| `relatedTicketNumber` | number | Ne | Broj prethodnog ticketa ako je follow-up |
| `metadata` | object | Ne | Dodatni podaci (verzija appa, device info) |

**Response (201 Created):**
```json
{
  "message": "Ticket uspješno kreiran",
  "ticket": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "ticketNumber": 101,
    "formattedNumber": "#101",
    "category": "question",
    "subject": "Nedostaju mi bodovi",
    "status": "open",
    "createdAt": "2024-11-28T15:30:00.000Z"
  }
}
```

**Errors:**
- `400` - Validacijska greška (npr. naslov predug, ticket #XYZ ne postoji)
- `401` - Unauthorized
- `500` - Server error

---

### 2. Dohvati moje tickete

**GET** `/api/app/support/tickets`

**Headers:**
```
Authorization: Bearer <token>
X-API-Key: <app_api_key>
```

**Query Parameters:**
| Parametar | Tip | Default | Opis |
|-----------|-----|---------|------|
| `status` | string | - | Filter po statusu: `open`, `in_progress`, `resolved`, `closed` |
| `page` | number | 1 | Stranica za paginaciju |
| `limit` | number | 20 | Broj ticketa po stranici |
| `lang` | string | "hr" | Jezik odgovora: `hr` ili `en` |

**Primjer:**
```
GET /api/app/support/tickets?status=open&page=1&limit=10&lang=hr
```

**Response (200 OK):**
```json
{
  "tickets": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "ticketNumber": 101,
      "formattedNumber": "#101",
      "category": "question",
      "subject": "Nedostaju mi bodovi",
      "message": "Poslao sam račun prije 3 dana...",
      "status": "resolved",
      "adminResponse": "Poštovani, provjerili smo i bodovi su dodani na vaš račun. Hvala na strpljenju!",
      "respondedAt": "2024-11-28T16:00:00.000Z",
      "relatedRestaurant": {
        "id": "restaurant-uuid",
        "name": "Restoran XY"
      },
      "relatedTicketNumber": null,
      "createdAt": "2024-11-28T15:30:00.000Z",
      "updatedAt": "2024-11-28T16:00:00.000Z"
    }
  ],
  "totalCount": 5,
  "totalPages": 1,
  "currentPage": 1
}
```

**Napomena:** `adminResponse` vraća odgovor na jeziku definiranom u `lang` parametru. Ako je `lang=en`, vraća engleski odgovor, inače hrvatski.

---

### 3. Dohvati pojedini ticket

**GET** `/api/app/support/tickets/:id`

**Headers:**
```
Authorization: Bearer <token>
X-API-Key: <app_api_key>
```

**Query Parameters:**
| Parametar | Tip | Default | Opis |
|-----------|-----|---------|------|
| `lang` | string | "hr" | Jezik odgovora: `hr` ili `en` |

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "ticketNumber": 101,
  "formattedNumber": "#101",
  "category": "question",
  "subject": "Nedostaju mi bodovi",
  "message": "Poslao sam račun prije 3 dana i još uvijek nisam dobio bodove.",
  "status": "resolved",
  "adminResponse": "Poštovani, provjerili smo i bodovi su dodani na vaš račun.",
  "respondedAt": "2024-11-28T16:00:00.000Z",
  "relatedRestaurant": {
    "id": "restaurant-uuid",
    "name": "Restoran XY"
  },
  "relatedTicketNumber": null,
  "createdAt": "2024-11-28T15:30:00.000Z",
  "updatedAt": "2024-11-28T16:00:00.000Z"
}
```

**Errors:**
- `404` - Ticket nije pronađen (ili ne pripada korisniku)

---

## Kategorije ticketa

Koristiti ove vrijednosti za `category` polje:

| Vrijednost | Hrvatski | Engleski | Kada koristiti |
|------------|----------|----------|----------------|
| `question` | Pitanje | Question | Opća pitanja o aplikaciji |
| `bug_report` | Prijava greške | Bug Report | Tehnički problemi u aplikaciji |
| `report_user` | Prijava korisnika | Report User | Prijava neprimjerenog ponašanja korisnika |
| `report_restaurant` | Prijava restorana | Report Restaurant | Prijava problema s restoranom |
| `account_issue` | Problem s računom | Account Issue | Problemi s korisničkim računom |
| `points_issue` | Problem s bodovima | Points Issue | Nedostaju bodovi, krivi bodovi |
| `feature_request` | Prijedlog | Feature Request | Prijedlozi za nove značajke |
| `other` | Ostalo | Other | Sve ostalo |

---

## Status ticketa

| Status | Hrvatski | Engleski | Opis |
|--------|----------|----------|------|
| `open` | Otvoren | Open | Novi ticket, čeka odgovor |
| `in_progress` | U obradi | In Progress | Admin radi na ticketu |
| `resolved` | Riješen | Resolved | Ticket je riješen s odgovorom |
| `closed` | Zatvoren | Closed | Ticket je zatvoren |

---

## Primjeri korištenja

### Primjer 1: Prijava greške

```json
POST /api/app/support/tickets
{
  "category": "bug_report",
  "subject": "Aplikacija se ruši pri otvaranju mape",
  "message": "Svaki put kad otvorim mapu restorana, aplikacija se sruši. Korišteni iPhone 14, iOS 17.1.",
  "metadata": {
    "appVersion": "2.1.0",
    "platform": "ios",
    "osVersion": "17.1",
    "deviceModel": "iPhone 14"
  }
}
```

### Primjer 2: Prijava korisnika

```json
POST /api/app/support/tickets
{
  "category": "report_user",
  "subject": "Neprimjereni komentari korisnika",
  "message": "Korisnik @username ostavlja uvredljive komentare na recenzijama.",
  "relatedUserId": "user-uuid-kojeg-prijavljujem"
}
```

### Primjer 3: Follow-up na prethodni ticket

```json
POST /api/app/support/tickets
{
  "category": "points_issue",
  "subject": "Nastavak na ticket #42",
  "message": "Vezano uz moj prethodni ticket, problem i dalje postoji. Bodovi nisu dodani.",
  "relatedTicketNumber": 42
}
```

### Primjer 4: Prijava restorana

```json
POST /api/app/support/tickets
{
  "category": "report_restaurant",
  "subject": "Restoran je trajno zatvoren",
  "message": "Restoran XY je zatvoren već 2 mjeseca ali je još uvijek prikazan kao aktivan.",
  "relatedRestaurantId": "restaurant-uuid"
}
```

---

## UI Preporuke

### Lista ticketa
- Prikazati status badge s bojom:
  - `open` - žuta
  - `in_progress` - plava
  - `resolved` - zelena
  - `closed` - siva
- Prikazati `formattedNumber` (#101) prominentno
- Prikazati vrijeme kreiranja relativno ("prije 2 sata")
- Ako ima `adminResponse`, prikazati indikator "Odgovoreno"

### Kreiranje ticketa
- Dropdown za odabir kategorije s lokaliziranim labelima
- Subject input s max 200 znakova
- Message textarea za detaljnu poruku
- Opcionalno: polje za unos `relatedTicketNumber` ako je follow-up

### Detalji ticketa
- Prikazati korisnikovu poruku
- Prikazati `adminResponse` ako postoji (bit će na jeziku korisnika)
- Prikazati vrijeme odgovora
- Ako je ticket `open`, možda prikazati "Čeka odgovor"

---

## Error Handling

Svi error responsei imaju format:
```json
{
  "error": "Opis greške na hrvatskom"
}
```

Moguće greške:
- `"Naslov je obavezan"` - subject nije poslan
- `"Poruka je obavezna"` - message nije poslan
- `"Naslov može imati maksimalno 200 znakova"` - subject predugačak
- `"Ticket #42 ne postoji"` - relatedTicketNumber ne postoji
- `"Ticket nije pronađen"` - ticket ID ne postoji ili ne pripada korisniku
