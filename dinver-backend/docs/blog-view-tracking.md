# Blog View Tracking API

## Pregled

Implementiran je view tracking sistem za blogove koji omogućava praćenje broja pregleda svakog blog posta.

## Implementirano

### Backend API

Već imate `viewCount` polje u `Blogs` tablici koje je dodano kroz migraciju. Implementiran je API endpoint koji omogućava povećanje broja pregleda.

### API Endpoint

#### POST /app/public/blogs/:slug/view

Zabilježi pregled blog posta. Ovaj endpoint treba pozivati svaki put kada korisnik otvori blog page.

**Parametri:**

- `slug` (URL parametar) - Slug blog posta čiji pregled se bilježi

**Primjer zahtjeva:**

```bash
POST /app/public/blogs/top-10-restaurants-in-zagreb/view
```

**Response (Success):**

```json
{
  "success": true,
  "viewCount": 123
}
```

**Response (Error - Blog not found):**

```json
{
  "error": "Blog not found"
}
```

**Status kodovi:**

- `200` - Success
- `404` - Blog not found
- `500` - Server error

### Ažurirani API Odgovori

Svi public API endpointi za blogove sada vraćaju `viewCount` u odgovoru:

#### GET /app/public/blogs

Primjer odgovora:

```json
{
  "blogs": [
    {
      "id": "uuid",
      "title": "Top 10 Restaurants in Zagreb",
      "slug": "top-10-restaurants-in-zagreb",
      "excerpt": "Discover the best restaurants...",
      "content": "...",
      "featuredImage": "https://...",
      "category": "food",
      "tags": ["restaurants", "zagreb"],
      "publishedAt": "2024-01-15T10:00:00Z",
      "readingTimeMinutes": 5,
      "viewCount": 156,
      "author": {
        "name": "John Doe",
        "profileImage": "https://..."
      }
    }
  ],
  "pagination": {
    "total": 10,
    "pages": 1,
    "currentPage": 1,
    "limit": 10
  }
}
```

#### GET /app/public/blogs/:slug

Primjer odgovora:

```json
{
  "id": "uuid",
  "title": "Top 10 Restaurants in Zagreb",
  "slug": "top-10-restaurants-in-zagreb",
  "excerpt": "Discover the best restaurants...",
  "content": "...",
  "featuredImage": "https://...",
  "category": "food",
  "tags": ["restaurants", "zagreb"],
  "publishedAt": "2024-01-15T10:00:00Z",
  "readingTimeMinutes": 5,
  "viewCount": 156,
  "metaTitle": "...",
  "metaDescription": "...",
  "keywords": ["zagreb", "restaurants"],
  "author": {
    "name": "John Doe",
    "profileImage": "https://..."
  }
}
```

### Sysadmin API - Statistike

#### GET /sysadmin/blogs/stats

Dodane su statistike o pregledima blogova:

**Primjer odgovora:**

```json
{
  "total": 25,
  "published": 20,
  "draft": 5,
  "totalViews": 1234,
  "avgViewsPerBlog": 62
}
```

**Nova polja:**

- `totalViews` - Ukupno pregleda svih published blogova
- `avgViewsPerBlog` - Prosječno pregleda po blogu (zaokruženo)

## Implementacija za Frontend

### Kada pozivati tracking endpoint

Pozivati `POST /app/public/blogs/:slug/view` endpoint kada:

1. **Korisnik otvori blog page** - Pri učitavanju komponente koja prikazuje blog
2. **Za svaki pregled** - Pri svakom otvaranju, čak i za istog korisnika

**Napomena:** Trenutna implementacija ne trackira unique views. Svaki poziv incrementa view broj.

### Implementacija Primjer (React/Next.js)

```typescript
// Hooks/useBlogViewTracking.ts
import { useEffect } from 'react';

const BLOG_API_URL =
  process.env.NEXT_PUBLIC_BLOG_API_URL || 'https://api.dinver.com';

export const useBlogViewTracking = (slug: string) => {
  useEffect(() => {
    if (!slug) return;

    const trackView = async () => {
      try {
        await fetch(`${BLOG_API_URL}/app/public/blogs/${slug}/view`, {
          method: 'POST',
        });
      } catch (error) {
        console.error('Failed to track blog view:', error);
      }
    };

    trackView();
  }, [slug]);
};

// U komponenti
import { useBlogViewTracking } from '@/hooks/useBlogViewTracking';

export default function BlogPage({ slug }) {
  // Automatski tracking pri mount-u
  useBlogViewTracking(slug);

  // ... ostatak komponente
}
```

### Implementacija Primjer (Vanilla JavaScript)

```javascript
// blog-view-tracker.js
const trackBlogView = async (slug) => {
  try {
    const response = await fetch(
      `${BLOG_API_URL}/app/public/blogs/${slug}/view`,
      { method: 'POST' },
    );

    if (response.ok) {
      const data = await response.json();
      console.log('View tracked:', data.viewCount);
    }
  } catch (error) {
    console.error('Failed to track view:', error);
  }
};

// Koristiti pri učitavanju blog stranice
document.addEventListener('DOMContentLoaded', () => {
  const blogSlug = document.querySelector('[data-blog-slug]')?.dataset.blogSlug;
  if (blogSlug) {
    trackBlogView(blogSlug);
  }
});
```

## Tehnički Detalji

### Backend Implementacija

**Controller metoda:** `incrementBlogView`
**Lokacija:** `dinver-backend/src/controllers/blogController.js`
**Route:** `dinver-backend/src/routes/appRoutes/blogRoutes.js`

Endpoint provjerava:

- Blog post s tim slugom postoji
- Blog post je u `published` statusu
- Automatski incrementa `viewCount` polje u bazi

### Baza Podataka

Polje `viewCount` već postoji u `Blogs` tablici (dodano kroz migraciju `20250526161553-create-blogs-table.js`).

**SQL struktura:**

```sql
viewCount INTEGER DEFAULT 0
```

### Napredne Opcije

Za buduće poboljšanje, moguće je dodati:

- `BlogView` tablicu za detaljnije tracking (unique views, deviceId, vrijeme čitanja)
- Analitičke podatke (koji post je najpopularniji, peak viewing times)
- Rate limiting da se spriječi spam

Sličan napredni sistem je već implementiran za `RestaurantPost` s `PostView` tablicom.

## Testiranje

### Manualno Testiranje s cURL

```bash
# Test 1: Track view za neki blog
curl -X POST https://api.dinver.com/app/public/blogs/your-blog-slug/view

# Expected response:
# {"success":true,"viewCount":1}

# Test 2: Dohvati blog i provjeri viewCount
curl https://api.dinver.com/app/public/blogs/your-blog-slug

# Test 3: Dohvati statistike (sysadmin endpoint zahtijeva autentikaciju)
curl -H "Authorization: Bearer YOUR_TOKEN" https://api.dinver.com/sysadmin/blogs/stats
```

## Napomene

- **Jednostavnost:** Trenutna implementacija je jednostavna i ne trackira duplicate views
- **Performance:** Increment operacija je brza i ne blokira odgovor API-ja
- **Skalabilnost:** Za veće volumene, možda razmotriti asinkronu procesiranje
- **Analytics:** ViewCount je dostupan za prikaz korisnicima i admin panelima
