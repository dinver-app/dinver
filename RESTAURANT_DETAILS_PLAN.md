# Restaurant Details Page - Implementation Plan

## Overview
Create a modern, responsive restaurant details page for the landing site that mirrors the mobile app experience. The page will be read-only (no reservations, AI chat) but will showcase all restaurant information beautifully.

## What We Have (From Screenshots Analysis)

### Mobile App Features Shown:
1. **Hero Section**
   - Large cover image with restaurant interior/exterior
   - Share, Call, and Bookmark icons overlay
   - Restaurant name prominently displayed
   - Short description

2. **Basic Info**
   - Full address with MapPin icon
   - Open/Closed status with closing time (e.g., "Otvoreno - Zatvara se u 22:00")
   - Action buttons: "Prikaži na karti" (Show on map), "Meni", "Virtualna šetnja", "Rezervirajte stol"

3. **AI Section** (Skip for landing - app only)

4. **Working Hours Section (Radno vrijeme)**
   - Full week schedule
   - Different hours for different days
   - Bold highlight for current day

5. **Social Links**
   - Website, Facebook, Instagram, Email icons

6. **Characteristics (Karakteristike)**
   - **Kuhinja (Cuisine)**: Pizza, Tjestenina, Salate, +10 more
   - **Vrste obroka (Meal Types)**: Doručak, Ručak, Večera
   - **Posebni prehrambeni tipovi (Dietary)**: Vegetarijanski, Bez glutena
   - **Dodatne usluge (Amenities)**: Vanjska terasa, U blizini javnog prijevoza, Preporučeno rezervirati, +4

7. **Experiences Section (Doživljaji)**
   - Grid of user experiences with photos
   - Rating breakdown (food 5.0, ambience 5.0, service 5.0)
   - User name, review text, star rating, likes count

8. **Gallery (Galerija)**
   - Horizontal scrolling gallery with "Vidi sve" (See all) link

9. **Menu Section**
   - Tabs: Hrana (Food) / Pića (Drinks)
   - Search bar
   - Category tabs (Antipasto, Pasta, Carne, Panini, Menu per Bambini)
   - Menu items with:
     - Image thumbnail
     - Name
     - Description (truncated)
     - Price in €

10. **Virtual Tour**
    - Video/360 player overlay

---

## Backend Changes Required

### 1. New Endpoint: Get Restaurant Experiences
**Route:** `GET /api/landing/restaurants/:restaurantId/experiences`
**File:** `dinver-backend/src/controllers/landingController.js`

Returns experiences for a specific restaurant with:
- Author info (name, avatar)
- Rating breakdown (food, ambience, service, overall)
- Description
- Images
- Likes count
- Published date

### 2. Existing Endpoints to Use
- `GET /api/landing/details/:restaurantId` - Full restaurant details ✅
- `GET /api/landing/menu/:restaurantId` - Menu + Drinks ✅
- `GET /api/landing/restaurantDetails/menu/categories/:restaurantId` ✅
- `GET /api/landing/restaurantDetails/menu/menuItems/:restaurantId` ✅
- `GET /api/landing/restaurantDetails/drinks/categories/:restaurantId` ✅
- `GET /api/landing/restaurantDetails/drinks/drinkItems/:restaurantId` ✅

---

## Frontend Structure

### Page Route
`/restoran/[slug]` - Dynamic route using restaurant slug

### Components to Create

```
src/
├── app/
│   └── restoran/
│       └── [slug]/
│           ├── page.tsx          # Main page component
│           ├── menu/
│           │   └── page.tsx      # Full menu subpage
│           └── virtualna-setnja/
│               └── page.tsx      # Virtual tour subpage
├── components/
│   └── restaurant/
│       ├── RestaurantHero.tsx        # Cover image + basic info
│       ├── RestaurantActions.tsx     # CTA buttons (Map, Menu, Virtual Tour, Reserve)
│       ├── WorkingHours.tsx          # Full working hours display
│       ├── SocialLinks.tsx           # Social media icons
│       ├── Characteristics.tsx       # Cuisine, meals, dietary, amenities
│       ├── ExperiencesSection.tsx    # User experiences grid
│       ├── GallerySection.tsx        # Image gallery
│       ├── MenuSection.tsx           # Food & Drinks tabs with categories
│       ├── MenuItem.tsx              # Individual menu item card
│       ├── VirtualTourModal.tsx      # Video/360 player modal
│       └── DownloadCTA.tsx           # "Download app" banner
```

---

## Detailed Component Specs

### 1. RestaurantHero.tsx
- Full-width cover image (first gallery image or thumbnail)
- Gradient overlay at bottom
- Restaurant name (h1)
- Short description
- Share button (copy link)
- Open/Closed badge with time

### 2. RestaurantActions.tsx
- 4 buttons in a 2x2 grid (mobile) or 4-column (desktop):
  - "Prikaži na karti" → Opens Google Maps
  - "Meni" → Scrolls to menu section
  - "Virtualna šetnja" → Opens modal (if available)
  - "Rezervirajte stol" → Shows "Download app" modal

### 3. WorkingHours.tsx
- Full week display
- Kitchen hours (if different)
- Custom hours handling
- Current day highlighted
- "Closed" for closed days

### 4. Characteristics.tsx
- Grouped sections:
  - Cuisine types (with icons)
  - Meal types
  - Dietary options
  - Amenities
- Expandable "+N more" pills

### 5. ExperiencesSection.tsx
- Masonry or grid layout
- Experience cards with:
  - Cover image
  - Rating badges (food, ambience, service)
  - User name
  - Review text (truncated)
  - Star rating
  - Likes count
- "No experiences yet" empty state

### 6. GallerySection.tsx
- Horizontal scroll on mobile
- Grid on desktop
- Lightbox modal for full view
- "Vidi sve" expands to show all

### 7. MenuSection.tsx
- Tab switcher: Hrana / Pića
- Category chips (horizontal scroll)
- Search input
- Menu items list
- Price display (€)

### 8. VirtualTourModal.tsx
- Full-screen modal
- Embedded video player or iframe
- Close button
- Restaurant name overlay

### 9. DownloadCTA.tsx
- Sticky banner at bottom (mobile)
- "Get the full experience on Dinver app"
- App store buttons

---

## Data Flow

```
1. User visits /restoran/[slug]
2. Page fetches:
   - Restaurant details (getRestaurantDetails)
   - Menu categories + items (getMenuCategories, getMenuItems)
   - Drink categories + items (getDrinkCategories, getDrinkItems)
   - Restaurant experiences (NEW: getRestaurantExperiences)
3. SSR or client-side rendering with loading states
4. All data displayed in sections
```

---

## API Types to Add (api.ts)

```typescript
// Restaurant Experiences
export interface RestaurantExperience {
  id: string;
  author: {
    name: string;
    avatarUrl?: string | null;
  };
  ratings: {
    food: number;
    ambience: number;
    service: number;
    overall: number;
  };
  description: string;
  images: Array<{
    url: string;
    width?: number;
    height?: number;
  }>;
  likesCount: number;
  publishedAt: string;
}

export interface RestaurantExperiencesResponse {
  experiences: RestaurantExperience[];
  total: number;
}

// Enhanced RestaurantDetails (add missing fields)
export interface RestaurantDetails extends Partner {
  // ... existing fields ...
  hoursStatus?: {
    isOpen: boolean;
    closesAt?: string;
    opensAt?: string;
    nextOpenDay?: string;
  };
  ratings?: {
    overall: number;
    foodQuality: number;
    service: number;
    atmosphere: number;
  };
}
```

---

## Styling Approach

- Use existing Tailwind classes
- Match landing page color scheme (dinver-green)
- Smooth animations with Framer Motion
- Mobile-first responsive design
- Consistent with existing components

---

## Implementation Order

1. **Backend: Add experiences endpoint** (15 mins)
2. **Frontend API: Add types and functions** (10 mins)
3. **Create page route and basic layout** (20 mins)
4. **Hero section** (30 mins)
5. **Working hours component** (20 mins)
6. **Characteristics section** (25 mins)
7. **Menu section with tabs** (40 mins)
8. **Experiences gallery** (30 mins)
9. **Image gallery with lightbox** (25 mins)
10. **Virtual tour modal** (15 mins)
11. **Mobile polish and testing** (20 mins)

---

## Files to Create/Modify

### Backend
- `dinver-backend/src/controllers/landingController.js` - Add getRestaurantExperiences
- `dinver-backend/src/routes/landingRoutes.js` - Add route

### Frontend
- `dinver-landing/src/app/restoran/[slug]/page.tsx` - Main page
- `dinver-landing/src/app/restoran/[slug]/menu/page.tsx` - Full menu page
- `dinver-landing/src/app/restoran/[slug]/virtualna-setnja/page.tsx` - Virtual tour page
- `dinver-landing/src/lib/api.ts` - Add new types and functions
- `dinver-landing/src/components/restaurant/*.tsx` - All components

---

## Translations (HR/EN)

All text will support both languages using the existing i18n system:
- "Radno vrijeme" / "Working hours"
- "Karakteristike" / "Characteristics"
- "Kuhinja" / "Cuisine"
- "Vrste obroka" / "Meal types"
- "Doživljaji" / "Experiences"
- "Galerija" / "Gallery"
- "Meni" / "Menu"
- "Hrana" / "Food"
- "Pića" / "Drinks"
- "Otvoreno" / "Open"
- "Zatvoreno" / "Closed"
- "Zatvara se u" / "Closes at"
- "Vidi sve" / "See all"
- "Preuzmi aplikaciju" / "Download app"
