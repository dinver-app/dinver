# Dinver Experience - Kompletna Implementacija za Mobilnu Aplikaciju

## 📱 Pregled Značajke

**Dinver Experience** je TikTok/Instagram Reels-style social media feature za dijeljenje iskustava u restoranima. Korisnici mogu:
- Kreirati video ili carousel (slike) objave o svom iskustvu u restoranu
- Pregledavati feed objava drugih korisnika (NEW i TRENDING)
- Lajkati, spremati (My Map) i gledati objave
- Ocijeniti hranu, uslugu, atmosferu i cijene
- Zarađivati bodove za interakcije

**VAŽNO**: Korisnici mogu objavljivati iskustvo **SAMO ako imaju approved račun u tom restoranu iz zadnjih 14 dana!**

---

## 🎯 Tvoj Zadatak

Implementiraj kompletnu Experience značajku u React Native mobilnoj aplikaciji (Dinver App). Trebaš:

1. **Analizirati postojeću strukturu aplikacije** - pregledaj kako je organiziran kod
2. **Dodati Experience tab** u glavni donji Tab Navigator
3. **Kreirati sve potrebne ekrane** (Feed, Create, Details, My Map, My Likes)
4. **Implementirati API integraciju** sa backendom
5. **Kreirati video/image picker** sa upload funkcionalitetom
6. **Implementirati interakcije** (like, save, share)
7. **Dodati animacije i gesture handlers** za TikTok-style UX

---

## 📂 Struktura Mobilne Aplikacije (React Native)

Prvo moraš pronaći i analizirati postojeću strukturu. Tipična React Native aplikacija ima:

```
dinver-app/
├── src/
│   ├── screens/          # Glavni ekrani
│   ├── components/       # Reusable komponente
│   ├── navigation/       # Navigation setup (Stack, Tab, Drawer)
│   ├── services/         # API calls
│   ├── contexts/         # Context API (AuthContext, itd.)
│   ├── hooks/           # Custom hooks
│   ├── utils/           # Helper funkcije
│   ├── constants/       # Constants (colors, fonts)
│   └── assets/          # Slike, ikone, fontovi
├── App.tsx              # Root component
└── package.json
```

**KORACI ZA ANALIZU:**
1. Pronađi glavni `App.tsx` ili `index.js` file
2. Lociraј navigation setup (npr. `src/navigation/AppNavigator.tsx`)
3. Pogledaj postojeće API service fileove (npr. `src/services/api.ts`)
4. Provjeri kako se koristi AuthContext za JWT tokene
5. Pogledaj postojeće screen komponente za stil i strukturu

---

## 🔐 Autentifikacija i API Setup

### Base API Configuration

Svi API pozivi za Experience feature koriste **app JWT token** (ne admin/sysadmin).

**Endpoint baza**: `https://your-api.com/api/app/experiences`

**Headers za sve requste:**
```javascript
{
  'Authorization': `Bearer ${userToken}`,
  'Content-Type': 'application/json'
}
```

**Pronađi u kodu:**
- Gdje se čuva JWT token (AsyncStorage, SecureStore, ili Context)
- Kako se kreira axios/fetch instance sa default headerima
- Primjer iz postojeće feature (npr. kako se dohvaćaju restorani)

**Kreiraj service file**: `src/services/experienceService.ts`

```typescript
import axios from 'axios';
import { getAuthToken } from '../utils/auth'; // ili gdje god je token

const API_BASE = 'https://your-api.com/api/app';

// Axios instance sa default config
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Interceptor za dodavanje tokena
apiClient.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

---

## 📋 Svi API Endpointi (User App Strana)

### 1. Media Upload - Pre-signed URL Flow

**VAŽNO**: Upload se radi direktno na S3, ne šalje se file na backend!

#### Korak 1: Request Pre-signed URL
```
POST /api/app/experiences/media/presigned-url
```

**Body:**
```json
{
  "kind": "IMAGE",  // ili "VIDEO"
  "mimeType": "image/jpeg",  // ili video/mp4, itd.
  "bytes": 2485760,  // veličina u bajtima
  "checksum": "abc123..."  // opcionalno, MD5 hash
}
```

**Response:**
```json
{
  "data": {
    "uploadUrl": "https://s3.amazonaws.com/...",  // Za upload
    "fileId": "uuid-file-id",
    "storageKey": "experiences/2025-11/userId/image/uuid.jpg",
    "cdnUrl": "https://cdn.dinver.com/experiences/...",  // Za prikaz
    "expiresAt": "2025-11-04T19:00:00Z"
  }
}
```

#### Korak 2: Upload File na S3
```javascript
// Upload direktno na S3 sa pre-signed URL
await fetch(uploadUrl, {
  method: 'PUT',
  headers: {
    'Content-Type': mimeType,
  },
  body: fileBlob,  // File kao blob/buffer
});
```

#### Korak 3: Confirm Upload
```
POST /api/app/experiences/media/confirm-upload
```

**Body:**
```json
{
  "fileId": "uuid-file-id",
  "checksum": "abc123..."  // opcionalno
}
```

**Response:**
```json
{
  "data": {
    "fileId": "uuid-file-id",
    "status": "PROCESSING",  // Backend pokreće transcoding
    "cdnUrl": "https://cdn.dinver.com/..."
  }
}
```

---

### 2. Kreiranje Experience

```
POST /api/app/experiences
```

**Body:**
```json
{
  "restaurantId": "uuid-restaurant-id",
  "mediaKind": "VIDEO",  // ili "CAROUSEL"
  "media": [
    {
      "fileId": "uuid-file-id-1",
      "orderIndex": 0
    },
    {
      "fileId": "uuid-file-id-2",
      "orderIndex": 1
    }
  ],
  "title": "Najbolja pizza u gradu!",
  "description": "Probao sam njihovu Margherita pizzu i bila je fenomenalna...",
  "foodRating": 5,       // 1-5
  "serviceRating": 4,    // 1-5
  "atmosphereRating": 5, // 1-5
  "priceRating": 4       // 1-5
}
```

**VALIDACIJE:**
- User MORA imati approved račun u tom restoranu iz zadnjih 14 dana
- Ako nema, vraća se **403 error** sa `errorCode: "NO_VALID_RECEIPT"`
- `mediaKind: VIDEO` → točno 1 file u media arrayu
- `mediaKind: CAROUSEL` → 2-10 slika u media arrayu
- Title je obavezan (min 3, max 100 znakova)

**Response:**
```json
{
  "data": {
    "experience": {
      "id": "uuid-experience-id",
      "userId": "uuid-user-id",
      "restaurantId": "uuid-restaurant-id",
      "status": "PENDING",  // Čeka moderaciju
      "mediaKind": "VIDEO",
      "title": "Najbolja pizza u gradu!",
      "description": "...",
      "foodRating": 5,
      "serviceRating": 4,
      "atmosphereRating": 5,
      "priceRating": 4,
      "engagementScore": 0,
      "createdAt": "2025-11-04T18:00:00Z",
      "media": [...]
    }
  }
}
```

**Status Experience-a:**
- `DRAFT` - još nije objavljen
- `PENDING` - čeka moderaciju (ne prikazuje se u feedu)
- `APPROVED` - odobren, prikazuje se u feedu
- `REJECTED` - odbijen od sysadmin tima

---

### 3. Dohvaćanje Feed-a

```
GET /api/app/experiences/feed?sortBy=NEW&city=Zagreb&page=1&limit=20
```

**Query Parametri:**
- `sortBy`: `NEW` (najnovije) ili `TRENDING` (po engagement score-u)
- `city`: filtriranje po gradu (opcionalno)
- `page`: stranica (default: 1)
- `limit`: broj rezultata (default: 20, max: 50)

**Response:**
```json
{
  "data": {
    "experiences": [
      {
        "id": "uuid-experience-id",
        "userId": "uuid-user-id",
        "restaurantId": "uuid-restaurant-id",
        "status": "APPROVED",
        "mediaKind": "VIDEO",
        "title": "Najbolja pizza!",
        "description": "...",
        "foodRating": 5,
        "serviceRating": 4,
        "atmosphereRating": 5,
        "priceRating": 4,
        "engagementScore": 245.8,
        "createdAt": "2025-11-04T18:00:00Z",
        "author": {
          "id": "uuid-user-id",
          "firstName": "Ivan",
          "lastName": "Horvat",
          "profileImage": "https://cdn.dinver.com/profiles/..."
        },
        "restaurant": {
          "id": "uuid-restaurant-id",
          "name": "Pizzeria Napoli",
          "address": "Ilica 123",
          "city": "Zagreb",
          "mainImage": "https://cdn.dinver.com/restaurants/..."
        },
        "media": [
          {
            "id": "uuid-media-id",
            "kind": "VIDEO",
            "cdnUrl": "https://cdn.dinver.com/experiences/...",
            "thumbnails": [
              "https://cdn.dinver.com/experiences/.../thumb_320.jpg",
              "https://cdn.dinver.com/experiences/.../thumb_640.jpg"
            ],
            "width": 1080,
            "height": 1920,
            "durationSeconds": 15
          }
        ],
        "engagement": {
          "likesCount": 42,
          "savesCount": 15,
          "viewsCount": 1250
        },
        "userInteraction": {
          "hasLiked": false,
          "hasSaved": false,
          "canLikeForPoints": true  // Može dobiti bodove za like
        }
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

### 4. Detalji Pojedinačnog Experience-a

```
GET /api/app/experiences/:id
```

**Response:** Isti format kao jedan item u feedu, sa svim detaljima.

---

### 5. Lajkanje Experience-a

```
POST /api/app/experiences/:id/like
```

**Body:** Prazan (ili možeš poslati `deviceId`, `ipAddress` ako imaš)

**Response:**
```json
{
  "data": {
    "like": {
      "id": "uuid-like-id",
      "experienceId": "uuid-experience-id",
      "userId": "uuid-user-id",
      "cycleId": "uuid-cycle-id",
      "createdAt": "2025-11-04T18:00:00Z"
    },
    "pointsAwarded": 0.05,  // Bodovi dodani autoru
    "newLikesCount": 43
  },
  "message": "Experience liked successfully"
}
```

**VAŽNO:**
- User može lajkati SAMO JEDNOM po leaderboard cycle (npr. mjesec)
- Ako već lajkao u ovom cycleu → vraća se 400 error
- Autor dobiva **+0.05 bodova** za svaki like
- Bodovi se dodjeljuju JEDNOM po user+cycle kombinaciji (anti-fraud)

---

### 6. Unlajkanje Experience-a

```
DELETE /api/app/experiences/:id/like
```

**Response:**
```json
{
  "data": {
    "newLikesCount": 42
  },
  "message": "Like removed successfully"
}
```

**VAŽNO**: Bodovi se NE oduzimaju kada user unlajka!

---

### 7. Spremanje na My Map

```
POST /api/app/experiences/:id/save
```

**Response:**
```json
{
  "data": {
    "save": {
      "id": "uuid-save-id",
      "userId": "uuid-user-id",
      "restaurantId": "uuid-restaurant-id",
      "experienceId": "uuid-experience-id",
      "createdAt": "2025-11-04T18:00:00Z"
    },
    "pointsAwarded": 0.10,  // Bodovi dodani autoru
    "newSavesCount": 16
  },
  "message": "Experience saved to My Map"
}
```

**VAŽNO:**
- User može spremiti restoran SAMO JEDNOM (bez obzira na cycle)
- Autor dobiva **+0.10 bodova** PRVI PUT kada netko spremi
- Ako već spremljeno → vraća se 400 error

---

### 8. Uklanjanje sa My Map

```
DELETE /api/app/experiences/:id/save
```

**Response:**
```json
{
  "data": {
    "newSavesCount": 15
  },
  "message": "Experience removed from My Map"
}
```

---

### 9. Praćenje Pregleda (View Tracking)

```
POST /api/app/experiences/:id/view
```

**Body:**
```json
{
  "durationMs": 8500,      // Koliko dugo je gledao (milisekunde)
  "completionRate": 0.75,  // Koliko je videa pogledao (0.0 - 1.0)
  "source": "EXPLORE_FEED" // Otkud je došao
}
```

**Source opcije:**
- `EXPLORE_FEED` - iz glavnog feeda
- `TRENDING_FEED` - iz trending feeda
- `USER_PROFILE` - iz profila autora
- `RESTAURANT_PAGE` - sa stranice restorana
- `DIRECT_LINK` - direktan link
- `PUSH_NOTIFICATION` - iz notifikacije
- `MY_MAP` - iz My Map liste

**Response:**
```json
{
  "data": {
    "view": {
      "id": "uuid-view-id",
      "experienceId": "uuid-experience-id",
      "durationMs": 8500,
      "completionRate": 0.75
    },
    "newViewsCount": 1251
  }
}
```

**KADA POZVATI:**
- Pozovi kada user NAPUSTI experience (swipe away, back button, app minimize)
- Ne zovi više puta za isti view
- Prati koliko dugo je gledao i completion rate za analitiku

---

### 10. My Map - Spremljeni Restorani

```
GET /api/app/experiences/saved?page=1&limit=20
```

**Response:**
```json
{
  "data": {
    "saved": [
      {
        "id": "uuid-save-id",
        "userId": "uuid-user-id",
        "restaurantId": "uuid-restaurant-id",
        "experienceId": "uuid-experience-id",  // Experience koji je spasio
        "savedAt": "2025-11-04T18:00:00Z",
        "restaurant": {
          "id": "uuid-restaurant-id",
          "name": "Pizzeria Napoli",
          "address": "Ilica 123",
          "city": "Zagreb",
          "mainImage": "...",
          "rating": 4.7,
          "experiencesCount": 12  // Broj objava u ovom restoranu
        },
        "experience": {
          "id": "uuid-experience-id",
          "title": "Najbolja pizza!",
          "media": [...]
        }
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8
  }
}
```

---

### 11. My Likes - Lajkani Experiences

```
GET /api/app/experiences/liked?page=1&limit=20
```

**Response:**
```json
{
  "data": {
    "likes": [
      {
        "id": "uuid-like-id",
        "likedAt": "2025-11-04T18:00:00Z",
        "experience": {
          // Kompletan experience objekt
        }
      }
    ]
  },
  "pagination": { ... }
}
```

---

### 12. User Experiences - Moje Objave

```
GET /api/app/experiences/me?status=APPROVED&page=1&limit=20
```

**Query Parametri:**
- `status`: `DRAFT`, `PENDING`, `APPROVED`, `REJECTED` (opcionalno, bez toga vraća sve)

**Response:**
```json
{
  "data": {
    "experiences": [
      // Lista tvojih objava sa svim detaljima
    ]
  },
  "pagination": { ... }
}
```

---

### 13. Experiences Određenog Usera

```
GET /api/app/experiences/user/:userId?page=1&limit=20
```

**Response:** Isti format kao `/me`, ali za drugog usera (samo APPROVED objave).

---

### 14. Experiences za Restoran

```
GET /api/app/experiences/restaurant/:restaurantId?page=1&limit=20
```

**Response:**
```json
{
  "data": {
    "restaurant": {
      "id": "uuid-restaurant-id",
      "name": "Pizzeria Napoli",
      "city": "Zagreb"
    },
    "experiences": [
      // Lista svih approved objava za ovaj restoran
    ]
  },
  "pagination": { ... }
}
```

---

### 15. Check Receipt Eligibility

Provjeri može li user objaviti u restoranu PRIJE nego što prikaže "Create" opciju.

```
GET /api/app/experiences/check-eligibility/:restaurantId
```

**Response:**
```json
{
  "data": {
    "eligible": true,
    "receipt": {
      "id": "uuid-receipt-id",
      "restaurantId": "uuid-restaurant-id",
      "status": "approved",
      "createdAt": "2025-10-25T12:00:00Z",
      "daysAgo": 10
    }
  }
}
```

**Ako NIJE eligible:**
```json
{
  "data": {
    "eligible": false,
    "reason": "NO_VALID_RECEIPT",
    "message": "Nemate odobren račun u ovom restoranu iz zadnjih 14 dana."
  }
}
```

**POZOVI OVU RUTU:**
- Kad user klikne na restoran i želi objaviti iskustvo
- Prikaži error poruku ako nije eligible
- Ponudi mu da skenira račun prvo

---

## 🎨 UI/UX Implementacija

### 1. Tab Navigator - Dodaj Experience Tab

Pronađi gdje je definiran glavni Tab Navigator (npr. `src/navigation/TabNavigator.tsx`).

**Dodaj novi tab:**
```tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ExperienceNavigator from './ExperienceNavigator';
import { Sparkles } from 'lucide-react-native'; // ili react-native-vector-icons

const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />
        }}
      />

      {/* NOVI TAB ZA EXPERIENCE */}
      <Tab.Screen
        name="Experience"
        component={ExperienceNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} />,
          headerShown: false
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />
        }}
      />
    </Tab.Navigator>
  );
}
```

---

### 2. Experience Stack Navigator

Kreiraj `src/navigation/ExperienceNavigator.tsx`:

```tsx
import { createStackNavigator } from '@react-navigation/stack';
import ExperienceFeedScreen from '../screens/Experience/ExperienceFeedScreen';
import CreateExperienceScreen from '../screens/Experience/CreateExperienceScreen';
import ExperienceDetailsScreen from '../screens/Experience/ExperienceDetailsScreen';
import MyMapScreen from '../screens/Experience/MyMapScreen';
import MyLikesScreen from '../screens/Experience/MyLikesScreen';
import UserExperiencesScreen from '../screens/Experience/UserExperiencesScreen';

const Stack = createStackNavigator();

export default function ExperienceNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ExperienceFeed"
        component={ExperienceFeedScreen}
        options={{ headerShown: false }} // Full screen feed
      />
      <Stack.Screen
        name="CreateExperience"
        component={CreateExperienceScreen}
        options={{
          title: 'Share Your Experience',
          presentation: 'modal'
        }}
      />
      <Stack.Screen
        name="ExperienceDetails"
        component={ExperienceDetailsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MyMap"
        component={MyMapScreen}
        options={{ title: 'My Map' }}
      />
      <Stack.Screen
        name="MyLikes"
        component={MyLikesScreen}
        options={{ title: 'Liked' }}
      />
      <Stack.Screen
        name="UserExperiences"
        component={UserExperiencesScreen}
        options={{ title: 'Experiences' }}
      />
    </Stack.Navigator>
  );
}
```

---

### 3. Experience Feed Screen (TikTok-style Vertical Swipe)

**File**: `src/screens/Experience/ExperienceFeedScreen.tsx`

**Značajke:**
- Vertikalni scroll/swipe između videa (kao TikTok)
- Auto-play videa kada je na ekranu
- Pause kad user swipa dalje
- Like, save, share buttoni overlay
- Author info, restaurant info na dnu
- Pull-to-refresh za novi content

**Biblioteke koje trebaš:**
```bash
npm install react-native-video
npm install react-native-gesture-handler
npm install react-native-reanimated
npm install @react-native-community/viewpager
```

**Osnovni kod:**

```tsx
import React, { useState, useRef, useEffect } from 'react';
import { View, FlatList, Dimensions, TouchableOpacity, Text } from 'react-native';
import Video from 'react-native-video';
import { Heart, Bookmark, Share2, MessageCircle } from 'lucide-react-native';
import { useExperience } from '../../hooks/useExperience';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ExperienceFeedScreen({ navigation }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [sortBy, setSortBy] = useState('NEW'); // NEW ili TRENDING
  const flatListRef = useRef(null);

  const {
    experiences,
    loading,
    loadMore,
    refresh,
    likeExperience,
    saveExperience,
    trackView
  } = useExperience({ sortBy });

  // Track view kada user napusti experience
  useEffect(() => {
    return () => {
      if (experiences[activeIndex]) {
        trackView(experiences[activeIndex].id, {
          durationMs: viewDuration,
          completionRate: watchedPercentage,
          source: 'EXPLORE_FEED'
        });
      }
    };
  }, [activeIndex]);

  const handleViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const renderItem = ({ item, index }) => (
    <ExperienceCard
      experience={item}
      isActive={index === activeIndex}
      onLike={() => likeExperience(item.id)}
      onSave={() => saveExperience(item.id)}
      onShare={() => shareExperience(item)}
      onAuthorPress={() => navigation.navigate('UserExperiences', { userId: item.userId })}
      onRestaurantPress={() => navigation.navigate('RestaurantDetails', { restaurantId: item.restaurantId })}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Top Bar - Sorting Toggle */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => setSortBy('NEW')}>
          <Text style={[styles.sortButton, sortBy === 'NEW' && styles.sortButtonActive]}>
            NEW
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSortBy('TRENDING')}>
          <Text style={[styles.sortButton, sortBy === 'TRENDING' && styles.sortButtonActive]}>
            TRENDING
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('MyMap')}>
          <Bookmark color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      {/* Vertical Feed */}
      <FlatList
        ref={flatListRef}
        data={experiences}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50
        }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshing={loading}
        onRefresh={refresh}
      />

      {/* Create Button */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('CreateExperience')}
      >
        <Text style={styles.createButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = {
  topBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 10,
    paddingHorizontal: 20,
  },
  sortButton: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.6,
  },
  sortButtonActive: {
    opacity: 1,
    borderBottomWidth: 2,
    borderBottomColor: '#fff',
  },
  createButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300',
  },
};
```

---

### 4. Experience Card Component

**File**: `src/components/Experience/ExperienceCard.tsx`

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import Video from 'react-native-video';
import FastImage from 'react-native-fast-image';
import { Heart, Bookmark, Share2, MapPin } from 'lucide-react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ExperienceCard({
  experience,
  isActive,
  onLike,
  onSave,
  onShare,
  onAuthorPress,
  onRestaurantPress
}) {
  const [paused, setPaused] = useState(!isActive);
  const [isLiked, setIsLiked] = useState(experience.userInteraction.hasLiked);
  const [isSaved, setIsSaved] = useState(experience.userInteraction.hasSaved);
  const [likesCount, setLikesCount] = useState(experience.engagement.likesCount);
  const [savesCount, setSavesCount] = useState(experience.engagement.savesCount);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const videoRef = useRef(null);
  const startTime = useRef(Date.now());
  const watchDuration = useRef(0);

  useEffect(() => {
    setPaused(!isActive);
    if (isActive) {
      startTime.current = Date.now();
    } else {
      watchDuration.current += Date.now() - startTime.current;
    }
  }, [isActive]);

  const handleLike = async () => {
    if (isLiked) return; // Ne možeš unlajkati iz feeda (samo iz details)

    setIsLiked(true);
    setLikesCount(prev => prev + 1);

    try {
      await onLike();
    } catch (error) {
      // Revert ako fail
      setIsLiked(false);
      setLikesCount(prev => prev - 1);
    }
  };

  const handleSave = async () => {
    const newSavedState = !isSaved;
    setIsSaved(newSavedState);
    setSavesCount(prev => newSavedState ? prev + 1 : prev - 1);

    try {
      await onSave();
    } catch (error) {
      // Revert ako fail
      setIsSaved(!newSavedState);
      setSavesCount(prev => newSavedState ? prev - 1 : prev + 1);
    }
  };

  const isVideo = experience.mediaKind === 'VIDEO';
  const media = experience.media[0];

  return (
    <View style={styles.container}>
      {/* Media - Video ili Carousel */}
      {isVideo ? (
        <Video
          ref={videoRef}
          source={{ uri: media.cdnUrl }}
          style={styles.video}
          resizeMode="cover"
          repeat
          paused={paused}
          muted={false}
          poster={media.thumbnails?.[0]}
          posterResizeMode="cover"
        />
      ) : (
        <FastImage
          source={{ uri: experience.media[currentImageIndex].cdnUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      {/* Gradient Overlay Bottom */}
      <View style={styles.gradientBottom} />

      {/* Bottom Info */}
      <View style={styles.bottomInfo}>
        {/* Author */}
        <TouchableOpacity
          style={styles.authorRow}
          onPress={onAuthorPress}
        >
          <FastImage
            source={{ uri: experience.author.profileImage }}
            style={styles.authorImage}
          />
          <Text style={styles.authorName}>
            {experience.author.firstName} {experience.author.lastName}
          </Text>
        </TouchableOpacity>

        {/* Title & Description */}
        <Text style={styles.title}>{experience.title}</Text>
        {experience.description && (
          <Text style={styles.description} numberOfLines={2}>
            {experience.description}
          </Text>
        )}

        {/* Restaurant */}
        <TouchableOpacity
          style={styles.restaurantRow}
          onPress={onRestaurantPress}
        >
          <MapPin color="#fff" size={16} />
          <Text style={styles.restaurantName}>{experience.restaurant.name}</Text>
          <Text style={styles.restaurantCity}> • {experience.restaurant.city}</Text>
        </TouchableOpacity>

        {/* Ratings */}
        <View style={styles.ratingsRow}>
          {experience.foodRating && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingEmoji}>🍕</Text>
              <Text style={styles.ratingText}>{experience.foodRating}/5</Text>
            </View>
          )}
          {experience.serviceRating && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingEmoji}>🙋</Text>
              <Text style={styles.ratingText}>{experience.serviceRating}/5</Text>
            </View>
          )}
          {experience.atmosphereRating && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingEmoji}>✨</Text>
              <Text style={styles.ratingText}>{experience.atmosphereRating}/5</Text>
            </View>
          )}
        </View>
      </View>

      {/* Right Action Buttons */}
      <View style={styles.rightActions}>
        {/* Like */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleLike}
          disabled={isLiked}
        >
          <Heart
            color={isLiked ? '#FF6B6B' : '#fff'}
            fill={isLiked ? '#FF6B6B' : 'transparent'}
            size={32}
          />
          <Text style={styles.actionCount}>{likesCount}</Text>
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleSave}
        >
          <Bookmark
            color={isSaved ? '#FFD93D' : '#fff'}
            fill={isSaved ? '#FFD93D' : 'transparent'}
            size={32}
          />
          <Text style={styles.actionCount}>{savesCount}</Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onShare}
        >
          <Share2 color="#fff" size={32} />
          <Text style={styles.actionCount}>{experience.engagement.viewsCount}</Text>
        </TouchableOpacity>

        {/* Restaurant Image */}
        <TouchableOpacity onPress={onRestaurantPress}>
          <FastImage
            source={{ uri: experience.restaurant.mainImage }}
            style={styles.restaurantImage}
          />
        </TouchableOpacity>
      </View>

      {/* Carousel Dots (ako je carousel) */}
      {!isVideo && experience.media.length > 1 && (
        <View style={styles.carouselDots}>
          {experience.media.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentImageIndex && styles.dotActive
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = {
  container: {
    height: SCREEN_HEIGHT,
    width: SCREEN_WIDTH,
    backgroundColor: '#000',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 100,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  authorImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  authorName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 8,
  },
  restaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  restaurantName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  restaurantCity: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.7,
  },
  ratingsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  ratingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  rightActions: {
    position: 'absolute',
    right: 12,
    bottom: 120,
    gap: 24,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  restaurantImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
    marginTop: 12,
  },
  carouselDots: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 20,
  },
};
```

---

### 5. Create Experience Screen

**File**: `src/screens/Experience/CreateExperienceScreen.tsx`

**Flow:**
1. Odaberi restoran
2. Provjeri eligibility (ima li approved račun iz zadnjih 14 dana)
3. Odaberi medij (video ili slike)
4. Upload na S3 preko pre-signed URL
5. Dodaj title, description, ratings
6. Kreiraj experience

```tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { X, Upload, Video as VideoIcon, Image as ImageIcon, Star } from 'lucide-react-native';
import RestaurantPicker from '../../components/Experience/RestaurantPicker';
import { useExperience } from '../../hooks/useExperience';

export default function CreateExperienceScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1: Pick Restaurant, 2: Upload Media, 3: Add Details
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [isEligible, setIsEligible] = useState(false);
  const [mediaKind, setMediaKind] = useState(null); // 'VIDEO' ili 'CAROUSEL'
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [foodRating, setFoodRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [atmosphereRating, setAtmosphereRating] = useState(0);
  const [priceRating, setPriceRating] = useState(0);
  const [isCreating, setIsCreating] = useState(false);

  const {
    checkEligibility,
    uploadMedia,
    createExperience
  } = useExperience();

  // Step 1: Check eligibility kada odabere restoran
  const handleRestaurantSelect = async (restaurant) => {
    setSelectedRestaurant(restaurant);

    try {
      const result = await checkEligibility(restaurant.id);

      if (result.eligible) {
        setIsEligible(true);
        setStep(2);
      } else {
        Alert.alert(
          'Nije moguće objaviti',
          result.message || 'Nemate odobren račun u ovom restoranu iz zadnjih 14 dana.',
          [
            { text: 'Odustani', style: 'cancel' },
            {
              text: 'Skeniraj račun',
              onPress: () => navigation.navigate('ScanReceipt', { restaurantId: restaurant.id })
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Greška', 'Došlo je do greške. Pokušajte ponovno.');
    }
  };

  // Step 2: Select media type
  const handleMediaKindSelect = (kind) => {
    setMediaKind(kind);
  };

  // Pick media from library
  const handlePickMedia = async () => {
    const options = {
      mediaType: mediaKind === 'VIDEO' ? 'video' : 'photo',
      selectionLimit: mediaKind === 'VIDEO' ? 1 : 10,
      quality: 1,
    };

    const result = await launchImageLibrary(options);

    if (!result.didCancel && result.assets) {
      setSelectedMedia(result.assets);
      // Start upload
      await uploadAllMedia(result.assets);
      setStep(3);
    }
  };

  // Upload media to S3
  const uploadAllMedia = async (mediaFiles) => {
    const uploadedFiles = [];

    for (let i = 0; i < mediaFiles.length; i++) {
      const file = mediaFiles[i];

      try {
        setUploadProgress(prev => ({ ...prev, [i]: 0 }));

        // Step 1: Get pre-signed URL
        const presignedData = await uploadMedia.requestPresignedUrl({
          kind: mediaKind === 'VIDEO' ? 'VIDEO' : 'IMAGE',
          mimeType: file.type,
          bytes: file.fileSize,
        });

        // Step 2: Upload to S3
        const uploadResponse = await fetch(presignedData.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
          },
          body: {
            uri: file.uri,
            type: file.type,
            name: file.fileName,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error('Upload failed');
        }

        // Step 3: Confirm upload
        await uploadMedia.confirmUpload({
          fileId: presignedData.fileId,
        });

        uploadedFiles.push({
          fileId: presignedData.fileId,
          orderIndex: i,
        });

        setUploadProgress(prev => ({ ...prev, [i]: 100 }));
      } catch (error) {
        Alert.alert('Upload greška', `Neuspješan upload filea ${i + 1}`);
        throw error;
      }
    }

    return uploadedFiles;
  };

  // Step 3: Create experience
  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Greška', 'Naslov je obavezan');
      return;
    }

    setIsCreating(true);

    try {
      const uploadedFiles = selectedMedia.map((file, index) => ({
        fileId: file.fileId,
        orderIndex: index,
      }));

      await createExperience({
        restaurantId: selectedRestaurant.id,
        mediaKind,
        media: uploadedFiles,
        title: title.trim(),
        description: description.trim(),
        foodRating: foodRating || undefined,
        serviceRating: serviceRating || undefined,
        atmosphereRating: atmosphereRating || undefined,
        priceRating: priceRating || undefined,
      });

      Alert.alert(
        'Objavljeno!',
        'Tvoj experience je poslan na moderaciju. Biti će prikazan u feedu kada bude odobren.',
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      );
    } catch (error) {
      Alert.alert('Greška', error.message || 'Neuspješno kreiranje objave');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X color="#000" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share Your Experience</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Step 1: Restaurant Picker */}
      {step === 1 && (
        <RestaurantPicker
          onSelect={handleRestaurantSelect}
        />
      )}

      {/* Step 2: Media Kind & Upload */}
      {step === 2 && (
        <View style={styles.mediaSelection}>
          <Text style={styles.sectionTitle}>Odaberi tip objave</Text>

          <View style={styles.mediaKindButtons}>
            <TouchableOpacity
              style={[styles.mediaKindButton, mediaKind === 'VIDEO' && styles.mediaKindButtonActive]}
              onPress={() => handleMediaKindSelect('VIDEO')}
            >
              <VideoIcon color={mediaKind === 'VIDEO' ? '#fff' : '#000'} size={32} />
              <Text style={[styles.mediaKindText, mediaKind === 'VIDEO' && styles.mediaKindTextActive]}>
                Video
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mediaKindButton, mediaKind === 'CAROUSEL' && styles.mediaKindButtonActive]}
              onPress={() => handleMediaKindSelect('CAROUSEL')}
            >
              <ImageIcon color={mediaKind === 'CAROUSEL' ? '#fff' : '#000'} size={32} />
              <Text style={[styles.mediaKindText, mediaKind === 'CAROUSEL' && styles.mediaKindTextActive]}>
                Slike (2-10)
              </Text>
            </TouchableOpacity>
          </View>

          {mediaKind && (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handlePickMedia}
            >
              <Upload color="#fff" size={24} />
              <Text style={styles.uploadButtonText}>
                Odaberi {mediaKind === 'VIDEO' ? 'Video' : 'Slike'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Upload Progress */}
          {Object.keys(uploadProgress).length > 0 && (
            <View style={styles.uploadProgress}>
              {Object.entries(uploadProgress).map(([index, progress]) => (
                <View key={index} style={styles.progressBar}>
                  <Text>File {parseInt(index) + 1}</Text>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Step 3: Add Details */}
      {step === 3 && (
        <View style={styles.detailsForm}>
          <Text style={styles.sectionTitle}>Detalji objave</Text>

          {/* Title */}
          <TextInput
            style={styles.input}
            placeholder="Naslov (obavezno)"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          {/* Description */}
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Opiši svoje iskustvo..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={500}
          />

          {/* Ratings */}
          <Text style={styles.ratingsTitle}>Ocijeni iskustvo:</Text>

          <RatingInput
            label="Hrana"
            emoji="🍕"
            value={foodRating}
            onChange={setFoodRating}
          />
          <RatingInput
            label="Usluga"
            emoji="🙋"
            value={serviceRating}
            onChange={setServiceRating}
          />
          <RatingInput
            label="Atmosfera"
            emoji="✨"
            value={atmosphereRating}
            onChange={setAtmosphereRating}
          />
          <RatingInput
            label="Cijena"
            emoji="💰"
            value={priceRating}
            onChange={setPriceRating}
          />

          {/* Preview */}
          {selectedMedia.length > 0 && (
            <View style={styles.preview}>
              <Text style={styles.previewTitle}>Preview:</Text>
              <ScrollView horizontal>
                {selectedMedia.map((media, index) => (
                  <Image
                    key={index}
                    source={{ uri: media.uri }}
                    style={styles.previewImage}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isCreating && styles.submitButtonDisabled]}
            onPress={handleCreate}
            disabled={isCreating}
          >
            <Text style={styles.submitButtonText}>
              {isCreating ? 'Objavljujem...' : 'Objavi Experience'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

// Rating Input Component
function RatingInput({ label, emoji, value, onChange }) {
  return (
    <View style={styles.ratingRow}>
      <Text style={styles.ratingLabel}>
        {emoji} {label}
      </Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onChange(star)}
          >
            <Star
              color="#FFD700"
              fill={star <= value ? '#FFD700' : 'transparent'}
              size={24}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  mediaSelection: {
    padding: 20,
  },
  mediaKindButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  mediaKindButton: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    gap: 8,
  },
  mediaKindButtonActive: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  mediaKindText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  mediaKindTextActive: {
    color: '#fff',
  },
  uploadButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  detailsForm: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  ratingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: 16,
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
  },
  preview: {
    marginTop: 20,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  previewImage: {
    width: 100,
    height: 150,
    borderRadius: 8,
    marginRight: 8,
  },
  submitButton: {
    backgroundColor: '#FF6B6B',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  uploadProgress: {
    marginTop: 20,
  },
  progressBar: {
    marginBottom: 12,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
};
```

---

### 6. Custom Hook za Experience API

**File**: `src/hooks/useExperience.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import experienceService from '../services/experienceService';

export function useExperience({ sortBy = 'NEW', city = null } = {}) {
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Load feed
  const loadFeed = useCallback(async (reset = false) => {
    if (loading || (!reset && !hasMore)) return;

    setLoading(true);
    const currentPage = reset ? 1 : page;

    try {
      const response = await experienceService.getFeed({
        sortBy,
        city,
        page: currentPage,
        limit: 20,
      });

      if (reset) {
        setExperiences(response.data.experiences);
      } else {
        setExperiences(prev => [...prev, ...response.data.experiences]);
      }

      setHasMore(response.pagination.page < response.pagination.totalPages);
      setPage(currentPage + 1);
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
    }
  }, [sortBy, city, page, loading, hasMore]);

  // Refresh feed
  const refresh = useCallback(() => {
    setPage(1);
    setHasMore(true);
    loadFeed(true);
  }, [loadFeed]);

  // Load more
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadFeed();
    }
  }, [loading, hasMore, loadFeed]);

  // Like experience
  const likeExperience = useCallback(async (experienceId) => {
    try {
      await experienceService.likeExperience(experienceId);
      // Update local state
      setExperiences(prev =>
        prev.map(exp =>
          exp.id === experienceId
            ? {
                ...exp,
                engagement: {
                  ...exp.engagement,
                  likesCount: exp.engagement.likesCount + 1,
                },
                userInteraction: {
                  ...exp.userInteraction,
                  hasLiked: true,
                },
              }
            : exp
        )
      );
    } catch (error) {
      throw error;
    }
  }, []);

  // Save experience
  const saveExperience = useCallback(async (experienceId) => {
    try {
      const exp = experiences.find(e => e.id === experienceId);
      if (!exp) return;

      if (exp.userInteraction.hasSaved) {
        // Unsave
        await experienceService.unsaveExperience(experienceId);
        setExperiences(prev =>
          prev.map(e =>
            e.id === experienceId
              ? {
                  ...e,
                  engagement: {
                    ...e.engagement,
                    savesCount: e.engagement.savesCount - 1,
                  },
                  userInteraction: {
                    ...e.userInteraction,
                    hasSaved: false,
                  },
                }
              : e
          )
        );
      } else {
        // Save
        await experienceService.saveExperience(experienceId);
        setExperiences(prev =>
          prev.map(e =>
            e.id === experienceId
              ? {
                  ...e,
                  engagement: {
                    ...e.engagement,
                    savesCount: e.engagement.savesCount + 1,
                  },
                  userInteraction: {
                    ...e.userInteraction,
                    hasSaved: true,
                  },
                }
              : e
          )
        );
      }
    } catch (error) {
      throw error;
    }
  }, [experiences]);

  // Track view
  const trackView = useCallback(async (experienceId, viewData) => {
    try {
      await experienceService.trackView(experienceId, viewData);
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  }, []);

  // Check eligibility
  const checkEligibility = useCallback(async (restaurantId) => {
    try {
      const response = await experienceService.checkEligibility(restaurantId);
      return response.data;
    } catch (error) {
      throw error;
    }
  }, []);

  // Upload media
  const uploadMedia = {
    requestPresignedUrl: async (data) => {
      const response = await experienceService.requestPresignedUrl(data);
      return response.data;
    },
    confirmUpload: async (data) => {
      const response = await experienceService.confirmUpload(data);
      return response.data;
    },
  };

  // Create experience
  const createExperience = useCallback(async (data) => {
    try {
      const response = await experienceService.createExperience(data);
      return response.data.experience;
    } catch (error) {
      throw error;
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadFeed(true);
  }, [sortBy, city]);

  return {
    experiences,
    loading,
    loadMore,
    refresh,
    likeExperience,
    saveExperience,
    trackView,
    checkEligibility,
    uploadMedia,
    createExperience,
  };
}
```

---

## 🎬 Ostali Ekrani

### 7. My Map Screen

Prikazuje sve spremljene restorane.

```tsx
import React from 'react';
import { FlatList, View, Text, TouchableOpacity, Image } from 'react-native';
import { MapPin } from 'lucide-react-native';

export default function MyMapScreen({ navigation }) {
  const { savedRestaurants, loading, loadMore } = useSavedRestaurants();

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('RestaurantDetails', { restaurantId: item.restaurantId })}
    >
      <Image source={{ uri: item.restaurant.mainImage }} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.name}>{item.restaurant.name}</Text>
        <View style={styles.locationRow}>
          <MapPin size={14} color="#666" />
          <Text style={styles.location}>{item.restaurant.city}</Text>
        </View>
        <Text style={styles.experiencesCount}>
          {item.restaurant.experiencesCount} experiences
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={savedRestaurants}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      onEndReached={loadMore}
      refreshing={loading}
    />
  );
}
```

### 8. My Likes Screen

Prikazuje sve lajkane objave.

```tsx
import React from 'react';
import { FlatList } from 'react-native';
import ExperienceGridItem from '../../components/Experience/ExperienceGridItem';

export default function MyLikesScreen({ navigation }) {
  const { likedExperiences, loading, loadMore } = useLikedExperiences();

  return (
    <FlatList
      data={likedExperiences}
      renderItem={({ item }) => (
        <ExperienceGridItem
          experience={item.experience}
          onPress={() => navigation.navigate('ExperienceDetails', { experienceId: item.experienceId })}
        />
      )}
      keyExtractor={(item) => item.id}
      numColumns={3}
      onEndReached={loadMore}
      refreshing={loading}
    />
  );
}
```

### 9. User Experiences Screen

Prikazuje sve objave određenog korisnika.

```tsx
import React from 'react';
import { FlatList, View, Text } from 'react-native';
import ExperienceGridItem from '../../components/Experience/ExperienceGridItem';

export default function UserExperiencesScreen({ route, navigation }) {
  const { userId } = route.params;
  const { experiences, loading, loadMore, user } = useUserExperiences(userId);

  return (
    <View style={{ flex: 1 }}>
      {/* User Header */}
      <View style={styles.userHeader}>
        <Image source={{ uri: user?.profileImage }} style={styles.avatar} />
        <Text style={styles.userName}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.experiencesCount}>
          {experiences.length} experiences
        </Text>
      </View>

      {/* Grid */}
      <FlatList
        data={experiences}
        renderItem={({ item }) => (
          <ExperienceGridItem
            experience={item}
            onPress={() => navigation.navigate('ExperienceDetails', { experienceId: item.id })}
          />
        )}
        keyExtractor={(item) => item.id}
        numColumns={3}
        onEndReached={loadMore}
        refreshing={loading}
      />
    </View>
  );
}
```

---

## 🚀 Testing Plan

### 1. Testiranje Kreiranje Objave

```javascript
// Test 1: User SA approved računom
// Expected: Uspješno kreiran experience sa statusom PENDING

// Test 2: User BEZ approved računa
// Expected: 403 error sa errorCode: "NO_VALID_RECEIPT"

// Test 3: Video upload
// Expected: Video se uploada, transkodira, prikazuje thumbnail

// Test 4: Carousel upload
// Expected: 2-10 slika se uploadaju, prikazuju se u carouselu
```

### 2. Testiranje Feed-a

```javascript
// Test 1: NEW feed
// Expected: Sortiranje po createdAt DESC

// Test 2: TRENDING feed
// Expected: Sortiranje po engagementScore DESC

// Test 3: City filter
// Expected: Prikazuju se samo objave iz odabranog grada

// Test 4: Infinite scroll
// Expected: Učitavaju se nove stranice kada skrollaš do kraja
```

### 3. Testiranje Interakcija

```javascript
// Test 1: Like objave
// Expected: Like count se poveća, button postane filled, autor dobiva +0.05 bodova

// Test 2: Like drugi put u istom cycleu
// Expected: 400 error - već lajkano

// Test 3: Save objave
// Expected: Save count se poveća, restoran se pojavi u My Map, autor dobiva +0.10 bodova

// Test 4: Unsave objave
// Expected: Save count se smanji, restoran nestane iz My Map
```

---

## 📊 Analytics & Tracking

### View Tracking Logic

```typescript
class ViewTracker {
  private startTime: number = 0;
  private videoDuration: number = 0;
  private watchedDuration: number = 0;

  start(videoDuration: number) {
    this.startTime = Date.now();
    this.videoDuration = videoDuration;
  }

  pause() {
    if (this.startTime > 0) {
      this.watchedDuration += Date.now() - this.startTime;
      this.startTime = 0;
    }
  }

  resume() {
    this.startTime = Date.now();
  }

  async finish(experienceId: string, source: string) {
    this.pause();

    const durationMs = this.watchedDuration;
    const completionRate = this.videoDuration > 0
      ? Math.min(1, this.watchedDuration / (this.videoDuration * 1000))
      : 1;

    await experienceService.trackView(experienceId, {
      durationMs,
      completionRate,
      source,
    });
  }
}
```

---

## 🔧 Troubleshooting

### Problem: Video ne loaduje

**Rješenje:**
- Provjeri da je `transcodingStatus: "COMPLETED"`
- Koristi thumbnail dok se video procesira
- Implementiraj retry logiku

### Problem: Upload faila

**Rješenje:**
- Provjeri veličinu filea (max 50MB za video/slike)
- Provjeri mime type (dozvoljeni: jpeg, png, mp4, mov)
- Implementiraj resumable upload za velike fileove

### Problem: 403 error pri kreiranju

**Rješenje:**
- Provjeri ima li user approved račun u zadnjih 14 dana
- Prikaži poruku da mora skenirati račun prvo
- Preusmjeri na "Scan Receipt" screen

---

## ✅ Checklist - Što Moraš Implementirati

### Phase 1: Setup & Navigation
- [ ] Dodaj Experience tab u glavni Tab Navigator
- [ ] Kreiraj Experience Stack Navigator
- [ ] Setup experienceService.ts sa svim API pozivima
- [ ] Kreiraj useExperience hook

### Phase 2: Feed Screen
- [ ] ExperienceFeedScreen - vertikalni swipe feed
- [ ] ExperienceCard component - video/carousel prikaz
- [ ] Like, Save, Share buttoni
- [ ] NEW/TRENDING toggle
- [ ] Pull-to-refresh
- [ ] Infinite scroll
- [ ] View tracking logika

### Phase 3: Create Screen
- [ ] CreateExperienceScreen - multi-step form
- [ ] RestaurantPicker component
- [ ] Eligibility check prije upload-a
- [ ] Media picker (video/slike)
- [ ] Pre-signed URL upload flow
- [ ] Upload progress indicator
- [ ] Title, description, ratings inputs

### Phase 4: Other Screens
- [ ] MyMapScreen - spremljeni restorani
- [ ] MyLikesScreen - lajkane objave
- [ ] UserExperiencesScreen - objave korisnika
- [ ] ExperienceDetailsScreen (opcionalno - za detaljniji prikaz)

### Phase 5: Polish
- [ ] Animacije (like animation, swipe transitions)
- [ ] Error handling
- [ ] Loading states
- [ ] Empty states
- [ ] Share functionality (deep linking)
- [ ] Push notifications setup

---

## 🎯 Finalne Napomene

1. **Provjeri postojeću strukturu** - Analiziraj kako su implementirane druge feature (npr. restorani, profil) i slijedi isti pattern

2. **Koristi postojeće komponente** - Ako postoje Button, Input, Card komponente, koristi ih umjesto kreiranja novih

3. **JWT Token** - Provjeri gdje se čuva i kako se dohvaća auth token

4. **Video player** - `react-native-video` je najčešće korišteni, ali provjeri ima li app već neki

5. **Image picker** - Provjeri ima li već implementiran image/video picker

6. **Styling** - Slijedi postojeći design system (boje, fontovi, spacing)

7. **Error handling** - Koristi postojeći error handling pattern (toast/alert)

8. **Loading states** - Koristi postojeće loading indikatore

9. **Navigation** - Provjeri navigation type (Stack, Tab, Drawer) i props typing

10. **Testing** - Testiraj sve edge case-ove (bez računa, već lajkano, network error, itd.)

---

## 📞 Backend Kontakt Info

**API Base URL**: `https://your-api.com/api/app`

**Potreban Token**: JWT token iz AuthContext (user app token, NE admin/sysadmin)

**Dokumentacija**: Vidi `EXPERIENCE_API.md` za detaljnu API dokumentaciju

**Support**: Kontaktiraj backend tim ako ima problema sa API-jem

---

**Sretno sa implementacijom! 🚀**

Implementiraj feature po fazama, testiraj svaki korak, i nemoj se bojati pitati ako nešto nije jasno!
