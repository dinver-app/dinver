import { useState, useEffect, useCallback, useRef } from "react";
import {
  getFavorites,
  checkIsFavorite,
  addToFavorites,
  removeFromFavorites,
} from "@/services/favoritesService";
import { useAuth } from "@/context/AuthContext";
import { Restaurant, FavoriteRestaurant } from "@/utils/validation";

interface FavoritesState {
  favorites: FavoriteRestaurant[];
  loading: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useFavorites = () => {
  const { user } = useAuth();
  const [state, setState] = useState<FavoritesState>({
    favorites: [],
    loading: false,
    isLoading: false,
    error: null,
  });

  // Use a ref to cache favorite status for quick lookups
  const favoriteStatusCache = useRef<Record<string, boolean>>({});

  // Load favorites when user changes
  useEffect(() => {
    if (user) loadFavorites();
    else {
      setState((prev) => ({ ...prev, favorites: [] }));
      favoriteStatusCache.current = {};
    }
  }, [user]);

  // Load all favorites from the API
  const loadFavorites = useCallback(async () => {
    if (!user) return;

    setState((prev) => ({
      ...prev,
      loading: true,
      isLoading: true,
      error: null,
    }));

    try {
      const userFavorites = await getFavorites();

      // Update favorites in state
      setState((prev) => ({
        ...prev,
        favorites: userFavorites,
        loading: false,
        isLoading: false,
      }));

      // Update the cache
      const newCache: Record<string, boolean> = {};
      userFavorites.forEach((fav) => {
        newCache[fav.id] = true;
      });
      favoriteStatusCache.current = newCache;
    } catch (err) {
      console.error("Failed to load favorites:", err);
      setState((prev) => ({
        ...prev,
        loading: false,
        isLoading: false,
        error: "Failed to load favorites",
      }));
    }
  }, [user]);

  // Check if a restaurant is a favorite (from cache)
  const isFavorite = useCallback(
    (restaurantId: string): boolean => {
      return (
        favoriteStatusCache.current[restaurantId] ||
        state.favorites.some((fav) => fav.id === restaurantId) ||
        false
      );
    },
    [state.favorites]
  );

  // Check favorite status from the API
  const checkFavoriteStatus = useCallback(
    async (restaurantId: string): Promise<boolean> => {
      if (!user) return false;

      try {
        // First check local cache/state
        if (state.favorites.some((fav) => fav.id === restaurantId)) {
          favoriteStatusCache.current[restaurantId] = true;
          return true;
        }

        // Fall back to API check
        const status = await checkIsFavorite(restaurantId);
        favoriteStatusCache.current[restaurantId] = status;
        return status;
      } catch (err) {
        return false;
      }
    },
    [user, state.favorites]
  );

  // Toggle favorite status
  const toggleFavorite = useCallback(
    async (restaurant: Restaurant): Promise<void> => {
      if (!user) {
        setState((prev) => ({
          ...prev,
          error: "You must be logged in to manage favorites",
        }));
        return;
      }

      const isCurrentlyFavorite = isFavorite(restaurant.id);

      try {
        if (isCurrentlyFavorite) {
          await removeFromFavorites(restaurant.id);
          setState((prev) => ({
            ...prev,
            favorites: prev.favorites.filter((fav) => fav.id !== restaurant.id),
          }));
          favoriteStatusCache.current[restaurant.id] = false;
        } else {
          await addToFavorites(restaurant.id);
          const newFavorite: FavoriteRestaurant = {
            id: restaurant.id,
            name: restaurant.name,
            rating: restaurant.rating || 0,
            priceLevel: restaurant.priceLevel || undefined,
            address: restaurant.address || "",
            iconUrl: restaurant.iconUrl || undefined,
          };
          setState((prev) => ({
            ...prev,
            favorites: [...prev.favorites, newFavorite],
          }));
          favoriteStatusCache.current[restaurant.id] = true;
        }
      } catch (err) {
        console.error("Error toggling favorite:", err);
        setState((prev) => ({ ...prev, error: "Failed to update favorites" }));
      }
    },
    [user, isFavorite]
  );

  // Handle removing a favorite
  const handleRemoveFavorite = useCallback(
    async (restaurantId: string) => {
      if (!user) return;

      try {
        await removeFromFavorites(restaurantId);
        setState((prev) => ({
          ...prev,
          favorites: prev.favorites.filter((fav) => fav.id !== restaurantId),
        }));
        favoriteStatusCache.current[restaurantId] = false;
      } catch (err) {
        console.error("Error removing favorite:", err);
        setState((prev) => ({ ...prev, error: "Failed to remove favorite" }));
      }
    },
    [user]
  );

  // Reset error state
  const resetError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    isFavorite,
    checkFavoriteStatus,
    toggleFavorite,
    loadFavorites,
    resetError,
    handleRemoveFavorite,
  };
};

export default useFavorites;
