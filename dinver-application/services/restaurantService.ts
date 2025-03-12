import { Restaurant, RestaurantsResponse } from "@/constants/Types";
import { apiClient } from "./authService";

export const restaurantService = {
  async getAllRestaurants(): Promise<Restaurant[]> {
    try {
      const response = await apiClient.get("/app/restaurants/all");
      return response.data;
    } catch (error) {
      throw new Error("Greška prilikom dohvaćanja restorana");
    }
  },

  async getRestaurants(
    page: number = 1,
    search?: string
  ): Promise<RestaurantsResponse> {
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      if (search && search.trim()) {
        params.append("search", search.trim());
      }

      const response = await apiClient.get(
        `/app/restaurants?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      throw new Error("Error fetching restaurants");
    }
  },

  async getAllRestaurantsWithDetails(
    search?: string
  ): Promise<RestaurantsResponse> {
    try {
      const params = new URLSearchParams();
      if (search && search.trim()) {
        params.append("search", search.trim());
      }

      const response = await apiClient.get(
        `/app/restaurants/all-with-details${
          params.toString() ? `?${params.toString()}` : ""
        }`
      );
      return response.data;
    } catch (error) {
      throw new Error("Error fetching restaurants");
    }
  },
};
