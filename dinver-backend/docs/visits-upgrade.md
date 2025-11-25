# Visits API Upgrade - Grupiranje po restoranu

## Što je promijenjeno?

Visits API sada **grupira visite po restoranu**. Ako korisnik posjeti isti restoran 3 puta, to se prikazuje kao 1 restoran s 3 visita, a ne kao 3 zasebna itema u listi.

---

## Endpoints

### `GET /api/app/visits` (vlastiti profil)

### `GET /api/app/users/:userId/visits` (tuđi profil)

Oba endpointa imaju istu strukturu response-a.

---

## Response struktura

**PRIJE (flat lista):**

```json
[
  { "id": "visit-1", "restaurant": { "name": "Restaurant A" } },
  { "id": "visit-2", "restaurant": { "name": "Restaurant A" } },
  { "id": "visit-3", "restaurant": { "name": "Restaurant B" } }
]
```

**SADA (grupirano po restoranu):**

```json
{
  "visitedRestaurants": [
    {
      "restaurant": {
        "id": "uuid",
        "name": "Restaurant A",
        "rating": 4.5,
        "priceLevel": 2,
        "address": "Ulica 123",
        "place": "Zagreb",
        "isClaimed": true,
        "thumbnailUrl": "https://...",
        "userRatingsTotal": 150
      },
      "visitCount": 2,
      "lastVisitDate": "2025-11-20T12:00:00Z",
      "firstVisitDate": "2025-06-15T14:30:00Z",
      "visits": [
        {
          "id": "visit-1",
          "submittedAt": "2025-11-20T12:00:00Z",
          "reviewedAt": "2025-11-20T14:00:00Z",
          "visitDate": "2025-11-20",
          "wasInMustVisit": false,
          "totalAmount": 45.50,
          "pointsAwarded": 4.55
        },
        {
          "id": "visit-2",
          "submittedAt": "2025-06-15T14:30:00Z",
          "reviewedAt": "2025-06-15T16:00:00Z",
          "visitDate": "2025-06-15",
          "wasInMustVisit": true,
          "totalAmount": 32.00,
          "pointsAwarded": 3.20
        }
      ]
    },
    {
      "restaurant": {
        "id": "uuid",
        "name": "Restaurant B",
        ...
      },
      "visitCount": 1,
      "lastVisitDate": "2025-10-05T18:00:00Z",
      "firstVisitDate": "2025-10-05T18:00:00Z",
      "visits": [
        { ... }
      ]
    }
  ],
  "totalRestaurantsVisited": 2,
  "totalVisits": 3
}
```

---

## Polja

### Root level

| Polje                     | Tip    | Opis                       |
| ------------------------- | ------ | -------------------------- |
| `visitedRestaurants`      | array  | Lista restorana s visitima |
| `totalRestaurantsVisited` | number | Broj različitih restorana  |
| `totalVisits`             | number | Ukupan broj visita         |

### visitedRestaurants[]

| Polje            | Tip      | Opis                               |
| ---------------- | -------- | ---------------------------------- |
| `restaurant`     | object   | Podaci o restoranu                 |
| `visitCount`     | number   | Broj visita u taj restoran         |
| `lastVisitDate`  | datetime | Datum zadnjeg visita               |
| `firstVisitDate` | datetime | Datum prvog visita                 |
| `visits`         | array    | Lista svih visita (najnoviji prvi) |

### visits[]

| Polje            | Tip      | Opis                         |
| ---------------- | -------- | ---------------------------- |
| `id`             | uuid     | ID visita                    |
| `submittedAt`    | datetime | Kad je poslan račun          |
| `reviewedAt`     | datetime | Kad je odobren               |
| `visitDate`      | date     | Datum posjeta                |
| `wasInMustVisit` | boolean  | Je li bio u must-visit listi |
| `totalAmount`    | number   | Iznos računa (EUR)           |
| `pointsAwarded`  | number   | Dodijeljeni bodovi           |

---

## Razlike između endpointa

|                 | `/visits` (vlastiti) | `/users/:userId/visits` (tuđi) |
| --------------- | -------------------- | ------------------------------ |
| `totalAmount`   | ✅                   | ❌ (privacy)                   |
| `pointsAwarded` | ✅                   | ❌ (privacy)                   |

---

## Frontend primjer

```typescript
// Prikaz liste restorana
{response.visitedRestaurants.map(item => (
  <RestaurantCard
    restaurant={item.restaurant}
    visitCount={item.visitCount}
    lastVisit={item.lastVisitDate}
  />
))}

// Statistika
<Text>Visited {response.totalRestaurantsVisited} restaurants</Text>
<Text>{response.totalVisits} total visits</Text>

// Detalji kad se klikne na restoran
{selectedRestaurant.visits.map(visit => (
  <VisitItem
    date={visit.visitDate}
    amount={visit.totalAmount}
    points={visit.pointsAwarded}
  />
))}
```
