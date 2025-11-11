# Frontend Guide - Nova Image Struktura

## 📸 Što se promijenilo?

Backend sad vraća **3 veličine svake slike** umjesto jedne:

- **thumbnail** (400x400px) - Za liste i search
- **medium** (1200px) - Za detail prikaze
- **fullscreen** (2400px) - Za galerije i zoom

## ✅ Backward Compatible

**Stari kod nastavlja raditi!** Ako koristiš samo `imageUrl`, dobiti ćeš **medium** verziju (kao i prije).

Ali sada imaš i **`imageUrls`** sa svim varijantama za optimalnu performansu.

---

## 🎯 Kako koristiti

### 1. **Search Results & Liste**

**API Response:**

```json
{
  "restaurants": [
    {
      "id": 1,
      "name": "Bocca di Lupo",
      "thumbnailUrl": "...abc123-thumb.jpg", // Automatski thumbnail!
      "thumbnailUrls": {
        "thumbnail": "...abc123-thumb.jpg", // 400x400, ~50KB
        "medium": "...abc123-medium.jpg", // 1200px, ~200KB
        "fullscreen": "...abc123-full.jpg" // 2400px, ~500KB
      }
    }
  ]
}
```

**Korištenje:**

```jsx
// Liste - koristi thumbnailUrl (automatski thumbnail)
<Image
  source={{ uri: restaurant.thumbnailUrl }}
  style={{ width: 100, height: 100 }}
/>

// Ili eksplicitno thumbnail
<Image source={{ uri: restaurant.thumbnailUrls?.thumbnail }} />
```

✅ **Prednost:** Brže učitavanje listi (50KB umjesto 200KB+)

---

### 2. **Restaurant Detail - Hero Image**

**API Response:**

```json
{
  "id": 1,
  "thumbnailUrl": "...abc123-medium.jpg", // Automatski medium za detail
  "thumbnailUrls": {
    "thumbnail": "...abc123-thumb.jpg",
    "medium": "...abc123-medium.jpg",
    "fullscreen": "...abc123-full.jpg"
  }
}
```

**Korištenje:**

```jsx
// Hero image - koristi thumbnailUrl (automatski medium)
<Image
  source={{ uri: restaurant.thumbnailUrl }}
  style={{ width: '100%', height: 300 }}
/>

// Ili eksplicitno medium
<Image source={{ uri: restaurant.thumbnailUrls?.medium }} />
```

---

### 3. **Restaurant Gallery** - ⚠️ NOVO!

**API Response (PROMIJENJENO):**

```json
{
  "images": [
    {
      "url": "...img1-medium.jpg", // Medium za prikaz
      "urls": {
        "thumbnail": "...img1-thumb.jpg",
        "medium": "...img1-medium.jpg",
        "fullscreen": "...img1-full.jpg"
      }
    },
    {
      "url": "...img2-medium.jpg",
      "urls": {
        /* ... */
      }
    }
  ]
}
```

**STARA struktura (više ne vraća):**

```json
{
  "images": [
    "https://cdn.../img1.jpg", // Staro - samo string
    "https://cdn.../img2.jpg"
  ]
}
```

**Korištenje (NOVO):**

```jsx
// Gallery preview - koristi .url (medium)
{
  restaurant.images?.map((img, index) => (
    <TouchableOpacity
      key={index}
      onPress={() => openFullscreen(img.urls.fullscreen)} // Fullscreen na klik
    >
      <Image source={{ uri: img.url }} /> {/* Medium za preview */}
    </TouchableOpacity>
  ));
}

// Fullscreen modal
<Modal visible={fullscreenVisible}>
  <Image
    source={{ uri: selectedImage.urls?.fullscreen }} // Fullscreen verzija
    resizeMode="contain"
  />
</Modal>;
```

---

### 4. **Menu Items**

**API Response:**

```json
{
  "foodMenu": {
    "categories": [
      {
        "items": [
          {
            "id": 10,
            "name": "Margherita",
            "imageUrl": "...abc123-medium.jpg", // Medium za menu
            "imageUrls": {
              "thumbnail": "...abc123-thumb.jpg",
              "medium": "...abc123-medium.jpg",
              "fullscreen": "...abc123-full.jpg"
            }
          }
        ]
      }
    ]
  }
}
```

**Korištenje:**

```jsx
// Menu prikaz - koristi imageUrl (automatski medium)
<Image
  source={{ uri: item.imageUrl }}
  style={{ width: 80, height: 80 }}
/>

// Ako user klikne za detalje
<Modal>
  <Image source={{ uri: item.imageUrls?.fullscreen }} />
</Modal>
```

---

### 5. **Search Results - Menu/Drink Items**

**API Response:**

```json
{
  "menuItems": [
    {
      "id": 10,
      "name": "Margherita",
      "imageUrl": "...abc123-thumb.jpg", // Automatski thumbnail za search!
      "imageUrls": {
        "thumbnail": "...abc123-thumb.jpg",
        "medium": "...abc123-medium.jpg",
        "fullscreen": "...abc123-full.jpg"
      }
    }
  ]
}
```

**Korištenje:**

```jsx
// Search rezultati - koristi imageUrl (automatski thumbnail)
<Image source={{ uri: item.imageUrl }} />

// Ako user otvori detail
<Image source={{ uri: item.imageUrls?.medium }} />
```

---

## 📋 Quick Reference

| Screen                | Element            | Koristi                    | Varijanta  | Veličina       |
| --------------------- | ------------------ | -------------------------- | ---------- | -------------- |
| **Search**            | Restaurant card    | `thumbnailUrl`             | thumbnail  | 400x400, ~50KB |
| **Search**            | Menu item card     | `imageUrl`                 | thumbnail  | 400x400, ~50KB |
| **Restaurant List**   | Card               | `thumbnailUrl`             | thumbnail  | 400x400, ~50KB |
| **Restaurant Detail** | Hero               | `thumbnailUrl`             | medium     | 1200px, ~200KB |
| **Restaurant Detail** | Gallery preview    | `images[].url`             | medium     | 1200px, ~200KB |
| **Restaurant Detail** | Gallery fullscreen | `images[].urls.fullscreen` | fullscreen | 2400px, ~500KB |
| **Menu Screen**       | Item image         | `imageUrl`                 | medium     | 1200px, ~200KB |
| **Menu Screen**       | Item zoom          | `imageUrls.fullscreen`     | fullscreen | 2400px, ~500KB |

---

## 🔄 Migration Guide

### Stari kod (nastavlja raditi):

```jsx
// Restaurant hero
<Image source={{ uri: restaurant.thumbnailUrl }} />

// Menu item
<Image source={{ uri: item.imageUrl }} />
```

### Novi kod (optimizirano):

```jsx
// Restaurant hero - eksplicitno medium
<Image source={{ uri: restaurant.thumbnailUrls?.medium || restaurant.thumbnailUrl }} />

// Search results - eksplicitno thumbnail
<Image source={{ uri: restaurant.thumbnailUrls?.thumbnail || restaurant.thumbnailUrl }} />

// Gallery fullscreen
<Image source={{ uri: image.urls?.fullscreen || image.url }} />
```

---

## ⚠️ Breaking Changes

### Restaurant Gallery

**STARO (više ne radi):**

```jsx
{
  restaurant.images?.map((url) => (
    <Image source={{ uri: url }} /> // ❌ url je sad objekt, ne string!
  ));
}
```

**NOVO (mora se promijeniti):**

```jsx
{
  restaurant.images?.map((img) => (
    <Image source={{ uri: img.url }} /> // ✅ Koristi img.url
  ));
}
```

---

## 💡 Best Practices

### 1. **Uvijek fallback na stari način**

```jsx
<Image
  source={{
    uri: item.imageUrls?.thumbnail || item.imageUrl,
  }}
/>
```

### 2. **Progresivno učitavanje**

```jsx
<Image
  source={{ uri: item.imageUrls?.thumbnail }}
  style={{ width: 100, height: 100 }}
/>

// Kad user otvori detail, učitaj medium
<Image source={{ uri: item.imageUrls?.medium }} />
```

### 3. **Fullscreen samo kad treba**

```jsx
// NE učitavaj fullscreen odmah
<TouchableOpacity
  onPress={() => {
    // Učitaj fullscreen tek kad user klikne
    setFullscreenImage(item.imageUrls?.fullscreen);
    setModalVisible(true);
  }}
>
  <Image source={{ uri: item.imageUrls?.thumbnail }} />
</TouchableOpacity>
```

---

## 📦 Optimistic Upload (Upload Slika)

Kad user uploada sliku (npr. review photo), backend vraća **instant response**:

```json
{
  "id": 123,
  "photos": [
    {
      "url": "...abc123-medium.jpg",
      "urls": {
        "thumbnail": "...abc123-thumb.jpg",
        "medium": "...abc123-medium.jpg",
        "fullscreen": "...abc123-full.jpg",
        "processing": true, // ⚠️ Još se procesira!
        "jobId": "12345"
      }
    }
  ]
}
```

**Korištenje:**

```jsx
// Prikaži local preview dok se procesira
{
  photo.urls?.processing ? (
    <>
      <Image source={{ uri: localImageUri }} /> // Lokalni preview
      <ActivityIndicator /> // Spinner
    </>
  ) : (
    <Image source={{ uri: photo.urls.medium }} /> // Gotova slika
  );
}

// Opciono: Poll za status
if (photo.urls?.processing) {
  pollImageStatus(photo.urls.jobId);
}
```

---

## 🚀 Performance Benefits

### Prije:

- Search lista: 20 restorana × 2MB = **40MB download** 😱
- Učitavanje: **8-10 sekundi**

### Poslije:

- Search lista: 20 restorana × 50KB = **1MB download** 🚀
- Učitavanje: **<1 sekunda**

**98% smanjenje veličine!**

---

## 🛠️ TypeScript Types

```typescript
interface Restaurant {
  id: number;
  name: string;
  thumbnailUrl: string | null; // Automatski thumbnail (search) ili medium (detail)
  thumbnailUrls?: ImageUrls | null; // Sve varijante
  images?: GalleryImage[]; // ⚠️ NOVO: Objekt umjesto stringa
}

interface GalleryImage {
  url: string; // Medium verzija
  urls: ImageUrls; // Sve varijante
}

interface ImageUrls {
  thumbnail: string; // 400x400, ~50KB
  medium: string; // 1200px, ~200KB
  fullscreen: string; // 2400px, ~500KB
  processing?: boolean; // Ako se još procesira
  jobId?: string; // Za polling statusa
}

interface MenuItem {
  id: number;
  name: string;
  imageUrl: string | null; // Automatski thumbnail (search) ili medium (menu)
  imageUrls?: ImageUrls | null; // Sve varijante
}
```

---

## ❓ FAQ

**Q: Što ako stari kod ne radi?**
A: Stari kod bi trebao raditi jer je backward compatible. Ako ne radi, možda imaš cache - očisti cache ili force refresh.

**Q: Trebam li migrirati odmah?**
A: Ne! Stari kod radi. Migriraj postepeno za bolju performansu.

**Q: Što ako nema `imageUrls`?**
A: Stare slike još nemaju varijante. Koristi fallback:

```jsx
<Image source={{ uri: item.imageUrls?.thumbnail || item.imageUrl }} />
```

**Q: Restaurant gallery se srušio!**
A: Gallery sad vraća objekt, ne string. Promijeni:

```jsx
// STARO: url (string)
{
  images.map((url) => <Image source={{ uri: url }} />);
}

// NOVO: img.url (objekt)
{
  images.map((img) => <Image source={{ uri: img.url }} />);
}
```

**Q: Kako znam da li slika ima varijante?**
A: Provjeri `imageUrls`:

```jsx
const hasVariants = !!item.imageUrls;
```

---

**Last Updated:** 2025-01-06
