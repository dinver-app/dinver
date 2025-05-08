import { authRequest } from "@/services/api";
import {
  favoriteCheckResponseSchema,
  favoriteMessageResponseSchema,
  favoriteRestaurantSchema,
  FavoriteRestaurant,
  FavoriteCheckResponse,
  FavoriteMessageResponse,
} from "@/utils/validation";

export const getFavorites = async (): Promise<FavoriteRestaurant[]> => {
  try {
    const data = await authRequest<any[]>("get", "/favorites");
    const favorites = data.map((favorite) => ({
      ...favorite,
      iconUrl: favorite.iconUrl || favorite.imageUrl || null,
    }));
    return favorites.map((favorite) =>
      favoriteRestaurantSchema.parse(favorite)
    );
  } catch (error) {
    console.error("Error getting favorites:", error);
    throw error;
  }
};

export const checkIsFavorite = async (
  restaurantId: string
): Promise<boolean> => {
  try {
    const response = await authRequest<FavoriteCheckResponse>(
      "get",
      `/favorites/${restaurantId}/check`
    );
    return favoriteCheckResponseSchema.parse(response).isFavorite;
  } catch (error) {
    console.error(`Error checking favorite status for ${restaurantId}:`, error);
    return false;
  }
};

export const addToFavorites = async (restaurantId: string): Promise<string> => {
  try {
    const response = await authRequest<FavoriteMessageResponse>(
      "post",
      "/favorites",
      { restaurantId }
    );
    return favoriteMessageResponseSchema.parse(response).message;
  } catch (error: any) {
    const message =
      error.response?.data?.message || "Couldn't add to favorites";
    throw new Error(message);
  }
};

export const removeFromFavorites = async (
  restaurantId: string
): Promise<string> => {
  try {
    const response = await authRequest<FavoriteMessageResponse>(
      "delete",
      `/favorites/${restaurantId}`
    );
    return favoriteMessageResponseSchema.parse(response).message;
  } catch (error: any) {
    const message =
      error.response?.data?.message || "Couldn't remove from favorites";
    throw new Error(message);
  }
};
