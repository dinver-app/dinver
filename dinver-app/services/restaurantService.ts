import api from "@/services/api";
import {
  Restaurant,
  RestaurantsResponse,
  restaurantsResponseSchema,
  LocationParams,
} from "@/utils/validation";
import { showError } from "@/utils/toast";

export type { Restaurant, LocationParams };

const CACHE_TTL = 5 * 60 * 1000;
const CACHE_TTL_SHORT = 2 * 60 * 1000;

// Cache implementation with TypeScript generic
class Cache<T> {
  private cache: Record<string, { data: T; timestamp: number }> = {};

  get(key: string, hasShortTTL = false): T | null {
    const entry = this.cache[key];
    if (!entry) return null;

    const elapsed = Date.now() - entry.timestamp;
    const ttl = hasShortTTL ? CACHE_TTL_SHORT : CACHE_TTL;

    return elapsed < ttl ? entry.data : null;
  }

  set(key: string, data: T): void {
    this.cache[key] = { data, timestamp: Date.now() };
  }

  clear(): void {
    this.cache = {};
  }
}

// Restaurant cache instances
const restaurantsCache = new Cache<RestaurantsResponse>();
const restaurantDetailsCache = new Cache<Restaurant>();

const normalizeRestaurant = (restaurant: any): Restaurant => ({
  ...restaurant,
  isOpen:
    typeof restaurant.isOpen === "string"
      ? restaurant.isOpen === "true"
        ? true
        : restaurant.isOpen === "false"
        ? false
        : undefined
      : restaurant.isOpen,
  userRatingsTotal: restaurant.userRatingsTotal || null,
  priceLevel: restaurant.priceLevel || null,
  thumbnailUrl: restaurant.thumbnailUrl || null,
});

export const fetchRestaurants = async (
  page = 1,
  search = "",
  locationParams?: LocationParams
): Promise<RestaurantsResponse> => {
  try {
    if (!locationParams?.latitude || !locationParams?.longitude) {
      throw new Error("Location data is required to find restaurants");
    }

    const searchTerm = search?.trim() || "";
    const cacheKey = `${page}_${searchTerm}_${locationParams.latitude.toFixed(
      5
    )}_${locationParams.longitude.toFixed(5)}`;

    // Try to get from cache
    const cachedData = restaurantsCache.get(cacheKey, !!searchTerm);
    if (cachedData) return cachedData;

    const params = {
      page,
      latitude: locationParams.latitude,
      longitude: locationParams.longitude,
      ...(searchTerm && { search: searchTerm }),
    };

    const { data: responseData } = await api.get("/restaurants/sample", {
      params,
    });

    const normalizedData = {
      ...responseData,
      hasSampleLimit: responseData.hasSampleLimit ?? true,
      fixedSampleSize: responseData.fixedSampleSize ?? 10,
      maxRecords: responseData.maxRecords ?? 50,
      restaurants: Array.isArray(responseData.restaurants)
        ? responseData.restaurants.map(normalizeRestaurant)
        : [],
    };

    // Validate and save to cache
    try {
      const validatedData = restaurantsResponseSchema.parse(normalizedData);
      restaurantsCache.set(cacheKey, validatedData);
      return validatedData;
    } catch (validationError) {
      console.error("Invalid restaurant API response:", validationError);
      return normalizedData as RestaurantsResponse;
    }
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    showError("Error", "Unable to retrieve restaurants");
    throw error;
  }
};

export const fetchRestaurantById = async (id: string): Promise<Restaurant> => {
  try {
    // Try to get from cache
    const cachedData = restaurantDetailsCache.get(id);
    if (cachedData) return cachedData;

    const { data } = await api.get(`/restaurants/${id}`);
    const normalized = normalizeRestaurant(data);

    restaurantDetailsCache.set(id, normalized);
    return normalized;
  } catch (error) {
    console.error(`Error fetching restaurant ${id}:`, error);
    showError("Error", "Unable to retrieve restaurant details");
    throw error;
  }
};

export const clearRestaurantCache = (): void => {
  restaurantsCache.clear();
  restaurantDetailsCache.clear();
};
