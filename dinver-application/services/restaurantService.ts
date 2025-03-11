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
      if (search) {
        params.append("search", search);
      }

      const response = await apiClient.get(
        `/app/restaurants?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      throw new Error("Greška prilikom dohvaćanja restorana");
    }
  },
};
