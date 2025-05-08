/* eslint-disable import/no-named-as-default */
import {
  fetchRestaurants,
  LocationParams,
  Restaurant,
} from "@/services/restaurantService";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image } from "react-native";
import useImagePreloader from "./useImagePreloader";

interface RestaurantsState {
  restaurants: Restaurant[];
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
}

interface UseRestaurantsReturn extends RestaurantsState {
  loadRestaurants: (
    page?: number,
    refresh?: boolean,
    search?: string,
    locationParams?: LocationParams,
    forceReload?: boolean
  ) => Promise<void>;
  handleLoadMore: () => void;
  handleRefresh: () => void;
  imagesLoading: boolean;
}

// In-memory cache for restaurants
let restaurantsCache: {
  [key: string]: {
    data: Restaurant[];
    lastLoaded: number;
    currentPage: number;
    totalPages: number;
  };
} = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useRestaurants(
  searchQuery: string = "",
  locationParams?: LocationParams
): UseRestaurantsReturn {
  const [state, setState] = useState<RestaurantsState>({
    restaurants: [],
    loading: false,
    loadingMore: false,
    refreshing: false,
    error: null,
    currentPage: 1,
    totalPages: 1,
  });

  const prevSearchRef = useRef<string>(searchQuery);
  const prevLocationRef = useRef<LocationParams | undefined>(locationParams);
  const initialFetchRef = useRef(true);
  const loadMoreTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { loading: imagesLoading } = useImagePreloader(state.restaurants, 10);

  const preloadImages = useCallback(async (restaurants: Restaurant[]) => {
    if (!restaurants || restaurants.length === 0) return;

    const priorityImages = restaurants
      .slice(0, 6)
      .map((restaurant) => restaurant.thumbnailUrl)
      .filter(Boolean);

    const secondaryImages = restaurants
      .slice(6, 15)
      .map((restaurant) => restaurant.thumbnailUrl)
      .filter(Boolean);

    try {
      await Promise.all(priorityImages.map((url) => Image.prefetch(url!)));

      if (secondaryImages.length > 0) {
        setTimeout(() => {
          Promise.all(secondaryImages.map((url) => Image.prefetch(url!))).catch(
            (error) =>
              console.error("Error preloading secondary images:", error)
          );
        }, 100);
      }
    } catch (error) {
      console.error("Error preloading images:", error);
    }
  }, []);

  const loadRestaurants = useCallback(
    async (
      page: number = 1,
      refresh: boolean = false,
      search: string = searchQuery,
      location: LocationParams | undefined = locationParams,
      forceReload: boolean = false
    ) => {
      if (!location?.latitude || !location?.longitude) {
        setState((prev) => ({
          ...prev,
          loading: false,
          loadingMore: false,
          refreshing: false,
          error: "Please select a location to find restaurants",
        }));
        return;
      }

      // Cache key based on page, search, and location
      const cacheKey = `${page}_${search.trim()}_${location.latitude.toFixed(
        5
      )}_${location.longitude.toFixed(5)}`;
      const now = Date.now();
      if (
        !forceReload &&
        !refresh &&
        restaurantsCache[cacheKey] &&
        now - restaurantsCache[cacheKey].lastLoaded < CACHE_TTL
      ) {
        const cached = restaurantsCache[cacheKey];
        setState((prev) => ({
          ...prev,
          restaurants: cached.data,
          currentPage: cached.currentPage,
          totalPages: cached.totalPages,
          loading: false,
          loadingMore: false,
          refreshing: false,
          error: null,
        }));
        preloadImages(cached.data);
        return;
      }

      setState((prev) => ({
        ...prev,
        loading: !refresh && page === 1,
        loadingMore: !refresh && page > 1,
        refreshing: refresh,
        error: null,
      }));

      try {
        const response = await fetchRestaurants(
          Math.max(1, page),
          search.trim(),
          location
        );

        preloadImages(response.restaurants);

        // Update cache
        restaurantsCache[cacheKey] = {
          data: response.restaurants,
          lastLoaded: Date.now(),
          currentPage: response.currentPage,
          totalPages: response.totalPages,
        };

        setState((prev) => ({
          ...prev,
          restaurants:
            page === 1 || refresh
              ? response.restaurants
              : [...prev.restaurants, ...response.restaurants],
          currentPage: response.currentPage,
          totalPages: response.totalPages,
          loading: false,
          loadingMore: false,
          refreshing: false,
          error: null,
        }));

        prevSearchRef.current = search;
        prevLocationRef.current = location;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unable to retrieve restaurants";
        setState((prev) => ({
          ...prev,
          loading: false,
          loadingMore: false,
          refreshing: false,
          error: errorMessage,
        }));
        console.error("Error retrieving restaurants:", err);
      }
    },
    [searchQuery, locationParams, preloadImages]
  );

  useEffect(() => {
    if (initialFetchRef.current) {
      initialFetchRef.current = false;
      return;
    }

    const hasLocationChanged =
      locationParams?.latitude !== prevLocationRef.current?.latitude ||
      locationParams?.longitude !== prevLocationRef.current?.longitude;

    const hasSearchChanged = searchQuery !== prevSearchRef.current;

    if (
      locationParams?.latitude &&
      locationParams?.longitude &&
      (hasLocationChanged || hasSearchChanged)
    ) {
      const timer = setTimeout(() => {
        loadRestaurants(1, true);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [searchQuery, locationParams, loadRestaurants]);

  const handleLoadMore = useCallback(() => {
    const { loadingMore, currentPage, totalPages, loading } = state;

    if (
      loadingMore ||
      loading ||
      currentPage >= totalPages ||
      !locationParams?.latitude ||
      !locationParams?.longitude
    ) {
      return;
    }

    if (loadMoreTimerRef.current) {
      clearTimeout(loadMoreTimerRef.current);
    }

    loadMoreTimerRef.current = setTimeout(() => {
      loadRestaurants(currentPage + 1, false);
      loadMoreTimerRef.current = null;
    }, 200) as unknown as NodeJS.Timeout;
  }, [state, locationParams, loadRestaurants]);

  useEffect(() => {
    return () => {
      if (loadMoreTimerRef.current) {
        clearTimeout(loadMoreTimerRef.current);
      }
    };
  }, []);

  const handleRefresh = useCallback(() => {
    loadRestaurants(1, true);
  }, [loadRestaurants]);

  return {
    ...state,
    loadRestaurants,
    handleLoadMore,
    handleRefresh,
    imagesLoading,
  };
}
