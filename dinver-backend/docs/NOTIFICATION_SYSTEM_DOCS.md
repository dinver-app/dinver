# Dinver Notification System - Frontend Dokumentacija

## Quick Start

**5 stvari koje moraš znati:**

1. **API rute:** `GET /api/app/notifications` za dohvat, `POST /api/app/notifications/mark-all-read` za mark as read
2. **Badge count:** `GET /api/app/notifications/unread-count` - polling svakih 60 sekundi
3. **Auto-mark-as-read:** Čekaj 1 sekundu nakon otvaranja notifications page, pa pozovi mark-all-read
4. **Deep linking:** Svaki notification type ima `data` objekt s potrebnim parametrima za navigaciju (vidi tablicu ispod)
5. **Retention:** Notifikacije starije od 30 dana se brišu automatski

**Osnovni flow:**
```typescript
// 1. Dohvati notifikacije
const { notifications, unreadCount } = await fetchNotifications();

// 2. Prikaži u listi (bold ako isRead === false)
<NotificationList notifications={notifications} />

// 3. Auto-mark-as-read nakon 1 sekunde
setTimeout(() => markAllAsRead(), 1000);

// 4. Na klik - navigiraj prema notification.type
handleNotificationPress(notification);
```

---

## Uvod

Dinver ima **persistentni notification system** - sve notifikacije se spremaju u bazu i ostaju dostupne 30 dana. Korisnici mogu vidjeti cijelu history notifikacija na svom profilu.

## Koncept

### Kako radi?

1. **Backend kreira notifikaciju** u bazi podataka
2. **Backend šalje push notification** (ako korisnik ima aktivan push token)
3. **Korisnik vidi notifikaciju** bilo kao push ili u notification history
4. **Notifikacija se automatski briše** nakon 30 dana

### Što ako korisnik nije logiran?

- **Personalne notifikacije** (follow, reservation, message): Spremaju se u bazu, korisnik ih vidi kad se logira
- **Globalne notifikacije** (novi restoran): Spremaju se samo za logirane korisnike
- **Push notifikacija** se šalje samo ako korisnik ima aktivan push token

---

## Tipovi notifikacija - Redirect Mapping

| Tip | Tko prima | Kada | Data polja | Screen | Parametri |
|-----|-----------|------|------------|--------|-----------|
| `user_followed_you` | Korisnik | Netko te pratio | `actorUserId`, `followerUsername`, `followerName` | `UserProfile` | `userId: actorUserId` |
| `new_reservation` | Admin | Nova rezervacija | `reservationId`, `restaurantId`, `restaurantName`, `date`, `time`, `guests` | `AdminReservationDetails` | `reservationId`, `restaurantId` |
| `reservation_confirmed` | Korisnik | Potvrđena rezervacija | `reservationId`, `restaurantId`, `restaurantName`, `date`, `time` | `ReservationDetails` | `reservationId` |
| `reservation_declined` | Korisnik | Odbijena rezervacija | `reservationId`, `restaurantId`, `restaurantName`, `date`, `time` | `ReservationDetails` | `reservationId` |
| `alternative_time_suggested` | Korisnik | Predložen alt. termin | `reservationId`, `restaurantId`, `restaurantName`, `suggestedDate`, `suggestedTime` | `ReservationDetails` | `reservationId` |
| `reservation_cancelled_by_restaurant` | Korisnik | Restoran otkazao | `reservationId`, `restaurantId`, `restaurantName`, `date`, `time`, `cancellationReason` | `ReservationDetails` | `reservationId` |
| `new_message_from_user` | Admin | Korisnik poslao poruku | `reservationId`, `restaurantId`, `messageId` | `ReservationChat` | `reservationId` |
| `new_message_from_restaurant` | Korisnik | Restoran poslao poruku | `reservationId`, `restaurantId`, `restaurantName`, `messageId` | `ReservationChat` | `reservationId` |
| `new_restaurant` | Svi logirani | Novi restoran dodan | `restaurantId`, `restaurantName`, `place` | `RestaurantDetails` | `restaurantId` |

### Detaljni opis po tipu

#### 1. `user_followed_you`
**Tko prima:** Korisnik kojeg su zapratili
**Primjer body:** `"john_doe te je zapratio!"`
**Data polja:**
```json
{
  "type": "user_followed_you",
  "actorUserId": "uuid-korisnika-koji-je-zapratio",
  "followerUsername": "john_doe",
  "followerName": "John Doe"
}
```
**Redirect:** `UserProfile` screen s `userId: actorUserId`

---

#### 2. `new_reservation`
**Tko prima:** Svi admini restorana
**Primjer body:** `"Nova rezervacija u Bistro XYZ"`
**Data polja:**
```json
{
  "type": "new_reservation",
  "reservationId": "uuid-rezervacije",
  "restaurantId": "uuid-restorana",
  "restaurantName": "Bistro XYZ",
  "date": "2025-02-15",
  "time": "19:00:00",
  "guests": 4
}
```
**Redirect:** `AdminReservationDetails` screen s `reservationId` i `restaurantId`

---

#### 3. `reservation_confirmed`
**Tko prima:** Korisnik koji je napravio rezervaciju
**Primjer body:** `"Vaša rezervacija u Bistro XYZ je potvrđena (15.02.2025., 19:00h)"`
**Data polja:**
```json
{
  "type": "reservation_confirmed",
  "reservationId": "uuid-rezervacije",
  "restaurantId": "uuid-restorana",
  "restaurantName": "Bistro XYZ",
  "date": "2025-02-15",
  "time": "19:00:00"
}
```
**Redirect:** `ReservationDetails` screen s `reservationId`

---

#### 4. `reservation_declined`
**Tko prima:** Korisnik koji je napravio rezervaciju
**Primjer body:** `"Vaša rezervacija u Bistro XYZ je odbijena (15.02.2025., 19:00h)"`
**Data polja:**
```json
{
  "type": "reservation_declined",
  "reservationId": "uuid-rezervacije",
  "restaurantId": "uuid-restorana",
  "restaurantName": "Bistro XYZ",
  "date": "2025-02-15",
  "time": "19:00:00"
}
```
**Redirect:** `ReservationDetails` screen s `reservationId`

---

#### 5. `alternative_time_suggested`
**Tko prima:** Korisnik koji je napravio rezervaciju
**Primjer body:** `"Bistro XYZ je predložio alternativni termin (16.02.2025., 20:00h)"`
**Data polja:**
```json
{
  "type": "alternative_time_suggested",
  "reservationId": "uuid-rezervacije",
  "restaurantId": "uuid-restorana",
  "restaurantName": "Bistro XYZ",
  "suggestedDate": "2025-02-16",
  "suggestedTime": "20:00:00"
}
```
**Redirect:** `ReservationDetails` screen s `reservationId`

---

#### 6. `reservation_cancelled_by_restaurant`
**Tko prima:** Korisnik koji je napravio rezervaciju
**Primjer body:** `"Vaša rezervacija u Bistro XYZ je otkazana od strane restorana (15.02.2025., 19:00h)"`
**Data polja:**
```json
{
  "type": "reservation_cancelled_by_restaurant",
  "reservationId": "uuid-rezervacije",
  "restaurantId": "uuid-restorana",
  "restaurantName": "Bistro XYZ",
  "date": "2025-02-15",
  "time": "19:00:00",
  "cancellationReason": "Restoran zatvoren zbog privatnog događaja"
}
```
**Redirect:** `ReservationDetails` screen s `reservationId`

---

#### 7. `new_message_from_user`
**Tko prima:** Svi admini restorana
**Primjer body:** `"Nova poruka u rezervaciji za 15.02.2025. u 19:00h"`
**Data polja:**
```json
{
  "type": "new_message_from_user",
  "reservationId": "uuid-rezervacije",
  "restaurantId": "uuid-restorana",
  "messageId": "uuid-poruke"
}
```
**Redirect:** `ReservationChat` screen s `reservationId`

---

#### 8. `new_message_from_restaurant`
**Tko prima:** Korisnik koji je napravio rezervaciju
**Primjer body:** `"Bistro XYZ vam je poslao novu poruku (rezervacija 15.02.2025. u 19:00h)"`
**Data polja:**
```json
{
  "type": "new_message_from_restaurant",
  "reservationId": "uuid-rezervacije",
  "restaurantId": "uuid-restorana",
  "restaurantName": "Bistro XYZ",
  "messageId": "uuid-poruke"
}
```
**Redirect:** `ReservationChat` screen s `reservationId`

---

#### 9. `new_restaurant`
**Tko prima:** Svi logirani korisnici
**Primjer body:** `"Restoran "Bistro XYZ" se pridružio Dinveru! Pogledaj što sve nudi!"`
**Data polja:**
```json
{
  "type": "new_restaurant",
  "restaurantId": "uuid-restorana",
  "restaurantName": "Bistro XYZ",
  "place": "Zagreb"
}
```
**Redirect:** `RestaurantDetails` screen s `restaurantId`

---

## API Rute

### 1. Dohvati notifikacije korisnika

```
GET /api/app/notifications
```

**Headers:**
```
Authorization: Bearer <token>
```

**Query parametri:**
```
limit: number (default: 50, max: 50)
offset: number (default: 0)
```

**Response (200):**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "userId": "uuid",
      "type": "user_followed_you",
      "title": "Novi follower! 👤",
      "body": "john_doe te je zapratio!",
      "data": {
        "type": "user_followed_you",
        "actorUserId": "uuid",
        "followerUsername": "john_doe",
        "followerName": "John Doe"
      },
      "isRead": false,
      "readAt": null,
      "wasSent": true,
      "sentAt": "2025-01-20T10:30:00.000Z",
      "createdAt": "2025-01-20T10:30:00.000Z",
      "actor": {
        "id": "uuid",
        "username": "john_doe",
        "name": "John Doe",
        "profileImage": "https://..."
      },
      "restaurant": null
    },
    {
      "id": "uuid",
      "userId": "uuid",
      "type": "reservation_confirmed",
      "title": "Rezervacija potvrđena! ✅",
      "body": "Vaša rezervacija u Bistro XYZ je potvrđena (15.02.2025., 19:00h)",
      "data": {
        "type": "reservation_confirmed",
        "reservationId": "uuid",
        "restaurantId": "uuid",
        "restaurantName": "Bistro XYZ",
        "date": "2025-02-15",
        "time": "19:00:00"
      },
      "isRead": false,
      "readAt": null,
      "wasSent": true,
      "sentAt": "2025-01-20T11:00:00.000Z",
      "createdAt": "2025-01-20T11:00:00.000Z",
      "actor": null,
      "restaurant": {
        "id": "uuid",
        "name": "Bistro XYZ",
        "slug": "bistro-xyz",
        "thumbnailUrl": "https://...",
        "place": "Zagreb"
      }
    }
  ],
  "unreadCount": 5,
  "totalCount": 23,
  "hasMore": false
}
```

**Error (500):**
```json
{
  "error": "Failed to fetch notifications"
}
```

**Napomena:**
- Dohvaća notifikacije iz zadnjih 30 dana
- Sortirane po `createdAt` DESC (najnovije prvo)
- Include-a podatke o `actor` (korisnik koji je napravio akciju) i `restaurant`

---

### 2. Označi sve notifikacije kao pročitane

```
POST /api/app/notifications/mark-all-read
```

**Headers:**
```
Authorization: Bearer <token>
```

**Body:** Nema body parametara

**Response (200):**
```json
{
  "success": true,
  "markedAsRead": 5
}
```

**Error (500):**
```json
{
  "error": "Failed to mark notifications as read"
}
```

**Kada koristiti:**
- Kad korisnik otvori notifications page (auto-mark-as-read)
- Kad korisnik klikne "Mark all as read" button

---

### 3. Označi jednu notifikaciju kao pročitanu

```
POST /api/app/notifications/:id/read
```

**Headers:**
```
Authorization: Bearer <token>
```

**URL parametri:**
```
id: uuid (notification ID)
```

**Body:** Nema body parametara

**Response (200):**
```json
{
  "success": true,
  "notification": {
    "id": "uuid",
    "userId": "uuid",
    "type": "user_followed_you",
    "title": "Novi follower! 👤",
    "body": "john_doe te je zapratio!",
    "isRead": true,
    "readAt": "2025-01-20T12:00:00.000Z",
    "createdAt": "2025-01-20T10:30:00.000Z"
  }
}
```

**Error (404):**
```json
{
  "error": "Notification not found"
}
```

**Error (500):**
```json
{
  "error": "Failed to mark notification as read"
}
```

**Kada koristiti:**
- Kad korisnik klikne na pojedinačnu notifikaciju
- Opcionalno: možeš koristiti mark-all-read umjesto ovog

---

### 4. Dohvati broj nepročitanih notifikacija

```
GET /api/app/notifications/unread-count
```

**Headers:**
```
Authorization: Bearer <token>
```

**Query parametri:** Nema query parametara

**Response (200):**
```json
{
  "unreadCount": 5
}
```

**Error (500):**
```json
{
  "error": "Failed to fetch unread count"
}
```

**Kada koristiti:**
- Za badge na bell ikoni
- Polling svake minute ili dvije
- Nakon što korisnik primi push notifikaciju (refresh badge)

---

### 5. Obriši jednu notifikaciju

```
DELETE /api/app/notifications/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**URL parametri:**
```
id: uuid (notification ID)
```

**Response (200):**
```json
{
  "success": true
}
```

**Error (404):**
```json
{
  "error": "Notification not found"
}
```

**Error (500):**
```json
{
  "error": "Failed to delete notification"
}
```

**Kada koristiti:**
- Kad korisnik swipe-a notifikaciju za brisanje
- "Clear this notification" button

---

### 6. Obriši sve notifikacije

```
DELETE /api/app/notifications
```

**Headers:**
```
Authorization: Bearer <token>
```

**Body:** Nema body parametara

**Response (200):**
```json
{
  "success": true,
  "deletedCount": 23
}
```

**Error (500):**
```json
{
  "error": "Failed to delete notifications"
}
```

**Kada koristiti:**
- "Clear all notifications" button
- Settings opcija

---

## Frontend Flow

### 1. Bell Icon s Badge Count

```typescript
// Dohvati unread count za badge
const fetchUnreadCount = async () => {
  const response = await fetch('/api/app/notifications/unread-count', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const { unreadCount } = await response.json();
  setBadgeCount(unreadCount);
};

// Pozovi pri mount-u i svakih 60-120 sekundi
useEffect(() => {
  fetchUnreadCount();
  const interval = setInterval(fetchUnreadCount, 60000); // 1 min
  return () => clearInterval(interval);
}, []);
```

---

### 2. Otvaranje Notifications Page

```typescript
const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // 1. Dohvati notifikacije
    fetchNotifications();

    // 2. Automatski označi sve kao pročitane nakon 1 sekunde
    const timer = setTimeout(() => {
      markAllAsRead();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const fetchNotifications = async () => {
    const response = await fetch('/api/app/notifications?limit=50&offset=0', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
  };

  const markAllAsRead = async () => {
    await fetch('/api/app/notifications/mark-all-read', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    setUnreadCount(0);
    // Refresh badge count u navigaciji
    refreshBadgeCount();
  };

  return (
    <View>
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onPress={() => handleNotificationPress(notification)}
        />
      ))}
    </View>
  );
};
```

---

### 3. Klik na Notifikaciju (Deep Linking)

```typescript
const handleNotificationPress = (notification) => {
  const { type, data } = notification;

  // Provjeri imaš li sve potrebne podatke
  if (!data || !data.type) {
    console.error('Missing data in notification:', notification);
    return;
  }

  // Navigacija ovisno o tipu notifikacije
  switch (type) {
    case 'user_followed_you':
      // Treba: actorUserId
      if (!data.actorUserId) {
        console.error('Missing actorUserId for user_followed_you');
        return;
      }
      navigation.navigate('UserProfile', {
        userId: data.actorUserId
      });
      break;

    case 'reservation_confirmed':
    case 'reservation_declined':
    case 'alternative_time_suggested':
    case 'reservation_cancelled_by_restaurant':
      // Treba: reservationId
      if (!data.reservationId) {
        console.error(`Missing reservationId for ${type}`);
        return;
      }
      navigation.navigate('ReservationDetails', {
        reservationId: data.reservationId
      });
      break;

    case 'new_message_from_user':
    case 'new_message_from_restaurant':
      // Treba: reservationId
      if (!data.reservationId) {
        console.error(`Missing reservationId for ${type}`);
        return;
      }
      navigation.navigate('ReservationChat', {
        reservationId: data.reservationId
      });
      break;

    case 'new_reservation':
      // Za admine - Treba: reservationId, restaurantId
      if (!data.reservationId || !data.restaurantId) {
        console.error('Missing reservationId or restaurantId for new_reservation');
        return;
      }
      navigation.navigate('AdminReservationDetails', {
        reservationId: data.reservationId,
        restaurantId: data.restaurantId
      });
      break;

    case 'new_restaurant':
      // Treba: restaurantId
      if (!data.restaurantId) {
        console.error('Missing restaurantId for new_restaurant');
        return;
      }
      navigation.navigate('RestaurantDetails', {
        restaurantId: data.restaurantId
      });
      break;

    default:
      console.warn('Unknown notification type:', type);
  }
};
```

**Primjer korištenja u NotificationItem komponenti:**
```typescript
const NotificationItem = ({ notification, onPress }) => {
  const handlePress = () => {
    // Prvo označi kao pročitano (opciono)
    markAsRead(notification.id);

    // Pa navigiraj
    handleNotificationPress(notification);

    // Callback za parent komponentu (opciono)
    onPress?.(notification);
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      <View style={styles.avatarContainer}>
        {notification.actor ? (
          <Image
            source={{ uri: notification.actor.profileImage }}
            style={styles.avatar}
          />
        ) : notification.restaurant ? (
          <Image
            source={{ uri: notification.restaurant.thumbnailUrl }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.defaultAvatar}>
            <Text>🔔</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={[
          styles.title,
          !notification.isRead && styles.boldTitle
        ]}>
          {notification.title}
        </Text>
        <Text style={styles.body}>{notification.body}</Text>
        <Text style={styles.timestamp}>
          {formatTimestamp(notification.createdAt)}
        </Text>
      </View>

      {!notification.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};
```

---

### 4. Push Notification Handler

```typescript
// Kad korisnik primi push notifikaciju
Notifications.addNotificationResponseReceivedListener(response => {
  const { data } = response.notification.request.content;

  // Refresh badge count
  fetchUnreadCount();

  // Navigiraj na odgovarajući screen ako je app otvoren
  if (data?.type) {
    handleNotificationPress({ type: data.type, data });
  }
});
```

---

### 5. Pagination (Infinite Scroll)

```typescript
const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async (currentOffset = 0) => {
    if (loading) return;
    setLoading(true);

    const response = await fetch(
      `/api/app/notifications?limit=50&offset=${currentOffset}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();

    if (currentOffset === 0) {
      setNotifications(data.notifications);
    } else {
      setNotifications(prev => [...prev, ...data.notifications]);
    }

    setHasMore(data.hasMore);
    setOffset(currentOffset + 50);
    setLoading(false);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchNotifications(offset);
    }
  };

  return (
    <FlatList
      data={notifications}
      renderItem={({ item }) => <NotificationItem notification={item} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={loading ? <ActivityIndicator /> : null}
    />
  );
};
```

---

### 6. Swipe to Delete

```typescript
import Swipeable from 'react-native-gesture-handler/Swipeable';

const NotificationItem = ({ notification, onDelete }) => {
  const handleDelete = async () => {
    await fetch(`/api/app/notifications/${notification.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    onDelete(notification.id);
  };

  const renderRightActions = () => (
    <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
      <Text style={styles.deleteText}>Delete</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <View style={styles.notificationCard}>
        {/* Notification content */}
      </View>
    </Swipeable>
  );
};
```

---

## Notification Data Structure

### Notification Object

```typescript
interface Notification {
  id: string;                    // UUID
  userId: string;                // UUID korisnika koji prima notifikaciju
  type: NotificationType;        // Tip notifikacije
  title: string;                 // Naslov (za prikaz)
  body: string;                  // Tekst (za prikaz)
  data: NotificationData;        // Custom podaci za deep linking
  isRead: boolean;               // Je li pročitana?
  readAt: string | null;         // Datum pročitavanja
  wasSent: boolean;              // Je li push poslan?
  sentAt: string | null;         // Datum slanja pusha
  createdAt: string;             // Datum kreiranja

  // Associated data (eager loaded)
  actor: Actor | null;           // Korisnik koji je napravio akciju
  restaurant: Restaurant | null; // Restoran vezan uz notifikaciju
}

type NotificationType =
  | 'new_restaurant'
  | 'new_reservation'
  | 'reservation_confirmed'
  | 'reservation_declined'
  | 'alternative_time_suggested'
  | 'reservation_cancelled_by_restaurant'
  | 'new_message_from_user'
  | 'new_message_from_restaurant'
  | 'user_followed_you';

interface NotificationData {
  type: NotificationType;

  // Follow notifikacije
  actorUserId?: string;
  followerUsername?: string;
  followerName?: string;

  // Reservation notifikacije
  reservationId?: string;
  restaurantId?: string;
  restaurantName?: string;
  date?: string;              // YYYY-MM-DD
  time?: string;              // HH:MM:SS
  guests?: number;
  suggestedDate?: string;     // Za alternative_time_suggested
  suggestedTime?: string;     // Za alternative_time_suggested
  cancellationReason?: string;

  // Message notifikacije
  messageId?: string;

  // Restaurant notifikacije
  place?: string;
}

interface Actor {
  id: string;
  username: string;
  name: string;
  profileImage: string | null;
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  thumbnailUrl: string | null;
  place: string | null;
}
```

---

## UI/UX Preporuke

### 1. Bell Icon Badge
- Prikaži broj nepročitanih notifikacija
- Sakrij badge ako je `unreadCount === 0`
- Update badge nakon što korisnik primi push
- Polling svakih 60-120 sekundi

### 2. Notification List
- **Nove notifikacije** (isRead: false): Bold font, background highlight
- **Pročitane notifikacije** (isRead: true): Normalan font, bez highlight-a
- **Group po datumu**: "Danas", "Jučer", "Prije 3 dana"
- **Avatar slike**: Prikaži actor.profileImage ili restaurant.thumbnailUrl

### 3. Auto-Mark-As-Read
- Čekaj 1 sekundu nakon otvaranja notifications page
- Pozovi `POST /api/app/notifications/mark-all-read`
- Update badge count na 0
- Opcionalno: Animiraj promjenu iz bold u normal font

### 4. Empty State
```
Nemaš notifikacija 🔔
Ovdje ćeš vidjeti nove followere, rezervacije i poruke.
```

### 5. Pull to Refresh
- Omogući korisniku da povuče dolje za refresh
- Pozovi `GET /api/app/notifications` s offset=0
- Reset pagination state

---

## Backend Behavior

### Retention Policy
- Notifikacije starije od **30 dana** se automatski brišu
- Cron job se pokreće svaki dan u 02:00 AM
- Korisnici neće vidjeti notifikacije starije od 30 dana

### Follow Notification Deletion
- Kad korisnik **unfollow-a**, notifikacija se **briše iz baze** (Instagram behavior)
- Frontend ne mora ništa posebno raditi, samo refresh notifications list

### Notification Creation
- Notifikacije se kreiraju **uvijek** u bazi (čak i ako korisnik nije logiran)
- Push se šalje **samo** ako korisnik ima aktivan push token
- Ako push ne uspije, notifikacija ostaje u bazi s `wasSent: false`

---

## Testing Checklist

### 1. Follow Flow
- [ ] A follow-a B-a → B dobije notifikaciju
- [ ] A otvori notifications → vidi notifikaciju
- [ ] A klikne na notifikaciju → otvori B-ov profil
- [ ] A unfollow-a B-a → notifikacija se briše iz liste

### 2. Reservation Flow
- [ ] Korisnik kreira rezervaciju → admin dobije notifikaciju
- [ ] Admin potvrdi rezervaciju → korisnik dobije notifikaciju
- [ ] Admin odbije rezervaciju → korisnik dobije notifikaciju
- [ ] Admin predloži alternativni termin → korisnik dobije notifikaciju
- [ ] Admin otkaže rezervaciju → korisnik dobije notifikaciju

### 3. Message Flow
- [ ] Korisnik pošalje poruku → admin dobije notifikaciju
- [ ] Admin pošalje poruku → korisnik dobije notifikaciju
- [ ] Klik na notifikaciju → otvori chat thread

### 4. Badge Count
- [ ] Badge prikazuje točan broj nepročitanih
- [ ] Badge se update-a nakon što korisnik primi push
- [ ] Badge ide na 0 nakon što korisnik otvori notifications
- [ ] Badge se sakrije ako je 0

### 5. Mark as Read
- [ ] Auto-mark-as-read nakon 1 sekunde
- [ ] Nove notifikacije bold, pročitane normal
- [ ] Badge count se update-a

---

## Error Handling

### Network Errors
```typescript
const fetchNotifications = async () => {
  try {
    const response = await fetch('/api/app/notifications', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch notifications');
    }

    const data = await response.json();
    setNotifications(data.notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    // Prikaži error toast korisniku
    showToast('Greška pri učitavanju notifikacija');
  }
};
```

### Missing Data
```typescript
const handleNotificationPress = (notification) => {
  const { type, data } = notification;

  // Provjeri imamo li sve potrebne podatke
  if (type === 'user_followed_you' && !data.actorUserId) {
    console.error('Missing actorUserId in notification data');
    return;
  }

  if (type === 'reservation_confirmed' && !data.reservationId) {
    console.error('Missing reservationId in notification data');
    return;
  }

  // ... navigacija
};
```

---

## Helper Funkcije

### 1. Format Timestamp
```typescript
const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Upravo sada';
  } else if (diffMins < 60) {
    return `Prije ${diffMins} min`;
  } else if (diffHours < 24) {
    return `Prije ${diffHours}h`;
  } else if (diffDays < 7) {
    return `Prije ${diffDays}d`;
  } else {
    // Format: 15.02.2025.
    return date.toLocaleDateString('hr-HR');
  }
};
```

### 2. Group Notifications by Date
```typescript
const groupNotificationsByDate = (notifications: Notification[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: Record<string, Notification[]> = {
    'Danas': [],
    'Jučer': [],
    'Ranije': []
  };

  notifications.forEach(notification => {
    const date = new Date(notification.createdAt);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      groups['Danas'].push(notification);
    } else if (date.getTime() === yesterday.getTime()) {
      groups['Jučer'].push(notification);
    } else {
      groups['Ranije'].push(notification);
    }
  });

  // Remove empty groups
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });

  return groups;
};
```

### 3. Format Date & Time
```typescript
// Format date from "2025-02-15" to "15.02.2025."
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}.`;
};

// Format time from "19:00:00" to "19:00h"
const formatTime = (timeStr: string): string => {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  return `${hours}:${minutes}h`;
};
```

---

## Performance Tips

### 1. Lazy Loading Images
- Koristi `react-native-fast-image` za actor/restaurant slike
- Cache slike za brži prikaz

### 2. Optimistic Updates
```typescript
const markAsRead = async (notificationId) => {
  // Optimistic update
  setNotifications(prev => prev.map(n =>
    n.id === notificationId ? { ...n, isRead: true } : n
  ));

  // API call
  try {
    await fetch(`/api/app/notifications/${notificationId}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (error) {
    // Rollback optimistic update
    setNotifications(prev => prev.map(n =>
      n.id === notificationId ? { ...n, isRead: false } : n
    ));
    showToast('Greška pri označavanju kao pročitano');
  }
};
```

### 3. Debounce Badge Count Polling
```typescript
import { debounce } from 'lodash';

const debouncedFetchUnreadCount = debounce(fetchUnreadCount, 500);
```

---

## API Rate Limits

**Nema hard rate limit-a**, ali preporučujemo:
- Badge count polling: max svakih 60 sekundi
- Notifications list refresh: max svakih 30 sekundi
- Mark as read: bez limit-a (optimistic updates)

---

## Support

Za pitanja ili bugove, kontaktirajte backend tim ili otvorite issue na GitHubu.

**Backend deployed:** Production Heroku
**API Base URL:** `https://api.dinverapp.com`
**Verzija:** 1.0.0
**Zadnji update:** 20.01.2025.
