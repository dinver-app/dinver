# Maps Upgrade Implementation

This document describes the implementation of the maps upgrade for the restaurant system, which separates map rendering (lean GeoJSON) from detailed data fetching (by-ids).

## Overview

The maps upgrade optimizes performance by:

- **Map endpoints** return lean GeoJSON with minimal properties (only `id`)
- **List/carousel endpoints** fetch detailed data for specific restaurant IDs
- **Synchronization** is maintained through consistent ID ordering
- **Bandwidth optimization** by not sending unnecessary data in map responses

## New Endpoints

### 1. Map Endpoint (near-you / default)

**GET** `/app/restaurants/map`

**Query Parameters:**

- `lat` (required): User latitude
- `lng` (required): User longitude
- `radiusKm` (optional): Search radius in kilometers (default: 10)
- `limit` (optional): Maximum number of restaurants (default: 3000, max: 3000)
- `fields` (optional): Properties to include in GeoJSON features (default: 'min')

**Response:**

```json
{
  "geojson": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "id": "uuid",
        "properties": { "id": "uuid" },
        "geometry": {
          "type": "Point",
          "coordinates": [15.975, 45.815]
        }
      }
    ]
  },
  "ids": ["uuid", "..."],
  "meta": {
    "count": 1234,
    "truncated": false,
    "radiusKm": 10,
    "source": "near-you"
  }
}
```

**Features:**

- Returns only minimal properties (`id`) for optimal map performance
- Sorts by distance first, then by name
- Filters by radius and applies limit
- Returns ordered IDs for sync with list/carousel

### 2. Global Search - Map Mode

**GET** `/app/global-search`

**Query Parameters:**

- `mode=map` (required for map mode)
- `query` (optional): Search terms
- `latitude`, `longitude` (required): User coordinates
- `radiusKm` (optional): Search radius (default: 10)
- `limit` (optional): Maximum results (default: 3000, max: 3000)
- `fields` (optional): Properties to include (default: 'min')
- All existing search filters (priceCategoryIds, establishmentTypeIds, etc.)

**Response:** Same GeoJSON format as map endpoint, but with `meta.source = "search"`

**Features:**

- Extends existing global search with map mode
- Applies all search filters and returns GeoJSON
- Maintains search relevance scoring
- Same ID ordering for sync

### 3. Restaurants by IDs (Detailed Data)

**GET** `/app/restaurants/by-ids?ids=uuid1,uuid2,...`

**POST** `/app/restaurants/by-ids`

**Query Parameters (GET):**

- `ids` (required): Comma-separated restaurant UUIDs
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 20)

**Request Body (POST):**

```json
{
  "ids": ["uuid1", "uuid2", "..."],
  "page": 1,
  "pageSize": 20
}
```

**Response:**

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Pizzeria A",
      "latitude": 45.81,
      "longitude": 15.98,
      "rating": 4.7,
      "thumbnailUrl": "https://...",
      "isFavorite": true,
      "isClaimed": true
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

**Features:**

- Returns detailed restaurant data for specific IDs
- Maintains exact order of provided IDs
- Includes user-specific data (isFavorite) when authenticated
- Supports pagination for large ID lists
- Transforms thumbnail URLs to full URLs

## Implementation Details

### Controller Functions

1. **`getRestaurantsMap`** - Main map endpoint
2. **`getRestaurantsByIds`** - GET endpoint for fetching by IDs
3. **`getRestaurantsByIdsPost`** - POST endpoint for larger ID lists
4. **Global search map mode** - Extended existing search controller

### Key Optimizations

- **Distance calculation** using Haversine formula
- **Radius filtering** before applying limits
- **Consistent sorting** (distance ASC, name ASC)
- **UUID validation** for security
- **Efficient database queries** with proper indexing
- **Order preservation** using PostgreSQL array functions

### Database Considerations

- Ensure `latitude` and `longitude` columns are indexed
- Consider spatial indexes for large datasets
- Monitor query performance with 8,000+ restaurants

## Usage Flow

1. **Map rendering**: Call `/restaurants/map` to get lean GeoJSON
2. **User interaction**: When user selects restaurants, use returned `ids` array
3. **Detailed data**: Call `/restaurants/by-ids` with selected IDs
4. **Synchronization**: IDs maintain order between map and list/carousel

## Error Handling

- **Invalid coordinates**: Returns 400 with validation error
- **Missing parameters**: Returns 400 with specific error message
- **Invalid UUIDs**: Returns 400 with list of invalid IDs
- **Database errors**: Returns 500 with generic error message

## Performance Benefits

- **Map rendering**: 90%+ reduction in payload size
- **Client-side clustering**: Faster Mapbox performance
- **Bandwidth savings**: Minimal data transfer for map views
- **Scalability**: Supports 8,000+ restaurants efficiently

## Testing

Test the endpoints with:

- Valid coordinates (Zagreb: 45.813, 15.977)
- Various radius values (5, 10, 25, 50 km)
- Different limit values
- Search queries with map mode
- Large ID lists for by-ids endpoints
