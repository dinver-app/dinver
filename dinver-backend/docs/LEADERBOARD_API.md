# Leaderboard API Documentation

## Overview

Leaderboard sustav ima dva tipa:

1. **Points Leaderboard** - Natjecanja s bodovima (cycles)
2. **Visits Leaderboard** - Globalni rank po unikatnim posjetima restorana

---

## Visits Leaderboard (Glavni rank)

Prikazuje korisnike rangirane po broju **unikatnih** restoran posjeta. Ako korisnik posjeti isti restoran 10 puta, računa se kao 1 unikatni posjet.

### Endpoints

#### 1. Dohvati listu dostupnih mjesta (gradova)

```
GET /api/app/leaderboard/places
```

**Auth:** Optional (radi i bez tokena)

**Response:**
```json
{
  "places": [
    {
      "name": "Zagreb",
      "totalVisits": 245,
      "totalUsers": 87,
      "totalRestaurants": 156
    },
    {
      "name": "Osijek",
      "totalVisits": 128,
      "totalUsers": 43,
      "totalRestaurants": 72
    },
    {
      "name": "Split",
      "totalVisits": 89,
      "totalUsers": 31,
      "totalRestaurants": 45
    }
  ]
}
```

**Korištenje:** Za popunjavanje dropdown/picker filtera za odabir grada.

---

#### 2. Dohvati visits leaderboard

```
GET /api/app/leaderboard/visits
```

**Auth:** Optional (ali potreban za `members=buddies` filter)

**Query parametri:**

| Parametar | Tip | Default | Vrijednosti | Opis |
|-----------|-----|---------|-------------|------|
| `members` | string | `all` | `all`, `buddies` | Filtrira po tipu korisnika |
| `place` | string | `all` | `all`, `<ime_grada>` | Filtrira po gradu |
| `page` | number | `1` | 1+ | Stranica za paginaciju |
| `limit` | number | `50` | 1-100 | Broj rezultata po stranici |

**Primjeri poziva:**

```javascript
// Svi korisnici, svi gradovi (default)
GET /api/app/leaderboard/visits

// Svi korisnici, samo Zagreb
GET /api/app/leaderboard/visits?place=Zagreb

// Samo buddies, svi gradovi (ZAHTIJEVA AUTH)
GET /api/app/leaderboard/visits?members=buddies

// Samo buddies, samo Osijek (ZAHTIJEVA AUTH)
GET /api/app/leaderboard/visits?members=buddies&place=Osijek

// Paginacija
GET /api/app/leaderboard/visits?page=2&limit=20
```

**Response:**
```json
{
  "filters": {
    "members": "all",
    "place": "all"
  },
  "leaderboard": [
    {
      "rank": 1,
      "userId": "uuid-1",
      "userName": "Pero Perić",
      "userUsername": "peroperic",
      "userProfileImage": "https://cdn.dinver.eu/uploads/profiles/xxx_medium.jpg",
      "uniqueVisits": 37
    },
    {
      "rank": 2,
      "userId": "uuid-2",
      "userName": "Ana Anić",
      "userUsername": "anaanic",
      "userProfileImage": null,
      "uniqueVisits": 25
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  },
  "userStats": {
    "position": 5,
    "uniqueVisits": 12
  }
}
```

**Napomene:**
- `userStats` je `null` ako korisnik nije ulogiran
- Ulogirani korisnik se **uvijek** vidi na listi i u `userStats`, čak i ako ima 0 posjeta
- `userProfileImage` može biti `null` ako korisnik nema profilnu sliku

---

## Frontend Implementation Guide

### 1. UI Struktura

```
┌─────────────────────────────────────┐
│  LEADERBOARD                        │
├─────────────────────────────────────┤
│  [All Members ▼]  [All Places ▼]    │  ← Filteri
├─────────────────────────────────────┤
│  Your Position: #5 (12 visits)      │  ← userStats (samo ako ulogiran)
├─────────────────────────────────────┤
│  🥇 1. @peroperic - 37 visits       │
│  🥈 2. @anaanic - 25 visits         │
│  🥉 3. @markomarkic - 22 visits     │
│     4. @ivanivan - 18 visits        │
│     5. @tijanatijana - 12 visits    │  ← Highlighted ako je current user
│     ...                             │
└─────────────────────────────────────┘
```

### 2. Filter Logic

```typescript
// State
const [membersFilter, setMembersFilter] = useState<'all' | 'buddies'>('all');
const [placeFilter, setPlaceFilter] = useState<string>('all');
const [places, setPlaces] = useState<Place[]>([]);

// Fetch places on mount
useEffect(() => {
  const fetchPlaces = async () => {
    const response = await api.get('/app/leaderboard/places');
    setPlaces(response.data.places);
  };
  fetchPlaces();
}, []);

// Fetch leaderboard when filters change
useEffect(() => {
  const fetchLeaderboard = async () => {
    const params = new URLSearchParams();
    if (membersFilter !== 'all') params.append('members', membersFilter);
    if (placeFilter !== 'all') params.append('place', placeFilter);

    const response = await api.get(`/app/leaderboard/visits?${params}`);
    setLeaderboard(response.data);
  };
  fetchLeaderboard();
}, [membersFilter, placeFilter]);
```

### 3. Members Filter - Conditional Rendering

```tsx
// "Buddies" opcija se prikazuje SAMO ako je korisnik ulogiran
const MembersFilter = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Picker
      selectedValue={membersFilter}
      onValueChange={setMembersFilter}
    >
      <Picker.Item label="All Members" value="all" />
      {isAuthenticated && (
        <Picker.Item label="Buddies" value="buddies" />
      )}
    </Picker>
  );
};
```

### 4. Places Filter

```tsx
const PlacesFilter = () => {
  return (
    <Picker
      selectedValue={placeFilter}
      onValueChange={setPlaceFilter}
    >
      <Picker.Item label="All Places" value="all" />
      {places.map((place) => (
        <Picker.Item
          key={place.name}
          label={`${place.name} (${place.totalUsers})`}
          value={place.name}
        />
      ))}
    </Picker>
  );
};
```

### 5. Leaderboard List

```tsx
const LeaderboardList = ({ data, currentUserId }) => {
  return (
    <FlatList
      data={data.leaderboard}
      ListHeaderComponent={() => (
        // User stats banner (ako je ulogiran)
        data.userStats && (
          <View style={styles.userStatsBanner}>
            <Text>Your Position: #{data.userStats.position}</Text>
            <Text>{data.userStats.uniqueVisits} unique visits</Text>
          </View>
        )
      )}
      renderItem={({ item }) => (
        <LeaderboardItem
          item={item}
          isCurrentUser={item.userId === currentUserId}
        />
      )}
      keyExtractor={(item) => item.userId}
    />
  );
};

const LeaderboardItem = ({ item, isCurrentUser }) => {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}.`;
  };

  return (
    <TouchableOpacity
      style={[styles.item, isCurrentUser && styles.highlighted]}
      onPress={() => navigation.navigate('UserProfile', { userId: item.userId })}
    >
      <Text style={styles.rank}>{getRankIcon(item.rank)}</Text>
      <Image
        source={{ uri: item.userProfileImage || DEFAULT_AVATAR }}
        style={styles.avatar}
      />
      <View style={styles.info}>
        <Text style={styles.name}>{item.userName}</Text>
        <Text style={styles.username}>@{item.userUsername}</Text>
      </View>
      <Text style={styles.visits}>{item.uniqueVisits} visits</Text>
    </TouchableOpacity>
  );
};
```

### 6. Pagination (Infinite Scroll)

```tsx
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);
const [leaderboard, setLeaderboard] = useState([]);

const loadMore = async () => {
  if (!hasMore) return;

  const response = await api.get('/app/leaderboard/visits', {
    params: { page: page + 1, members: membersFilter, place: placeFilter }
  });

  setLeaderboard(prev => [...prev, ...response.data.leaderboard]);
  setPage(prev => prev + 1);
  setHasMore(response.data.pagination.page < response.data.pagination.totalPages);
};

// U FlatList
<FlatList
  onEndReached={loadMore}
  onEndReachedThreshold={0.5}
/>
```

### 7. Error Handling

```typescript
// 401 error za buddies filter bez auth
if (error.response?.status === 401 && membersFilter === 'buddies') {
  // Reset to 'all' i prikaži login prompt
  setMembersFilter('all');
  showLoginPrompt();
}
```

---

## Points Leaderboard (Cycles)

Za natjecanja s bodovima - koristi postojeće endpointe:

| Endpoint | Opis |
|----------|------|
| `GET /api/app/leaderboard/active` | Aktivni cycle s pozicijom korisnika |
| `GET /api/app/leaderboard/cycles/:id` | Leaderboard za specifični cycle |
| `GET /api/app/leaderboard/history` | Povijest prošlih cyclea |
| `GET /api/app/leaderboard/my-stats` | Statistika korisnika (zahtijeva auth) |

---

## Response Field Reference

### Leaderboard Item

| Field | Tip | Opis |
|-------|-----|------|
| `rank` | number | Pozicija na ljestvici (1-based) |
| `userId` | string (UUID) | ID korisnika za navigaciju na profil |
| `userName` | string | Puno ime korisnika |
| `userUsername` | string | Username (bez @) |
| `userProfileImage` | string \| null | URL profilne slike (medium size) |
| `uniqueVisits` | number | Broj unikatnih restoran posjeta |

### User Stats

| Field | Tip | Opis |
|-------|-----|------|
| `position` | number | Korisnikova pozicija na ljestvici |
| `uniqueVisits` | number | Korisnikov broj unikatnih posjeta |

### Pagination

| Field | Tip | Opis |
|-------|-----|------|
| `page` | number | Trenutna stranica |
| `limit` | number | Broj rezultata po stranici |
| `total` | number | Ukupan broj korisnika |
| `totalPages` | number | Ukupan broj stranica |

---

## Buddies Definition

"Buddies" su korisnici koji se **međusobno prate** (mutual follow):
- Korisnik A prati korisnika B
- Korisnik B prati korisnika A
- → A i B su buddies

Kada je `members=buddies` filter aktivan:
- Prikazuju se samo buddies trenutnog korisnika
- Trenutni korisnik se **uvijek** prikazuje (čak i ako ima 0 posjeta)
- Rang je relativan prema tom skupu korisnika
