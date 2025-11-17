import { apiClient } from './authService';

export interface GooglePlaceResult {
  placeId: string;
  name: string;
  address: string;
  place?: string; // City/town
  rating?: number;
  userRatingsTotal?: number;
  types?: string[];
  photoReference?: string;
  photoUrl?: string;
  location: {
    lat: number;
    lng: number;
  };
  existsInDatabase: boolean;
  databaseId?: string;
}

export interface RestaurantDataFromGoogle {
  name: string;
  placeId: string;
  address: string;
  place?: string;
  country?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  websiteUrl?: string;
  priceLevel?: number;
  openingHours?: any;
  isOpenNow?: boolean;
  previewPhotoUrl?: string;
}

/**
 * Import restaurant from Google Maps URL
 */
export const importRestaurantFromUrl = async (url: string) => {
  const response = await apiClient.post<{
    message: string;
    placeId: string;
    restaurantData: RestaurantDataFromGoogle;
    rawPlaceDetails?: any;
  }>('/api/sysadmin/restaurants/import-from-url', { url });
  return response.data;
};

/**
 * Search restaurants on Google Places by text query
 */
export const searchGooglePlaces = async (query: string) => {
  const response = await apiClient.get<{
    query: string;
    count: number;
    results: GooglePlaceResult[];
  }>('/api/sysadmin/restaurants/search-places', {
    params: { query },
  });
  return response.data;
};

/**
 * Get restaurant details from Google Place ID
 */
export const getGooglePlaceDetails = async (placeId: string) => {
  const response = await apiClient.get<{
    message: string;
    placeId: string;
    restaurantData: RestaurantDataFromGoogle;
  }>(`/api/sysadmin/restaurants/place-details/${placeId}`);
  return response.data;
};

/**
 * Create restaurant from Google Places data
 */
export const createRestaurantFromGoogle = async (
  placeId: string,
  overrides?: Partial<RestaurantDataFromGoogle>
) => {
  const response = await apiClient.post<{
    message: string;
    restaurant: {
      id: string;
      name: string;
      slug: string;
      placeId: string;
      address: string;
      place?: string;
    };
  }>('/api/sysadmin/restaurants/create-from-google', {
    placeId,
    overrides,
  });
  return response.data;
};
