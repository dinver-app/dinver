import { apiClient } from "./authService";

export interface RestaurantLite {
  id: string;
  name: string;
  address?: string;
  place?: string;
  oib?: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
}

export interface SearchResponse {
  restaurants: RestaurantLite[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

class RestaurantAdminService {
  async search(query: string, page = 1, limit = 20): Promise<SearchResponse> {
    const params = new URLSearchParams();
    if (query) params.append("query", query);
    params.append("page", String(page));
    params.append("limit", String(limit));
    const res = await apiClient.get(
      `/api/sysadmin/restaurants/search?${params}`
    );
    return res.data;
  }

  async nearby(
    lat: number,
    lng: number,
    radius = 1500,
    limit = 10
  ): Promise<{ restaurants: RestaurantLite[] }> {
    const params = new URLSearchParams();
    params.append("lat", String(lat));
    params.append("lng", String(lng));
    params.append("radius", String(radius));
    params.append("limit", String(limit));
    const res = await apiClient.get(
      `/api/sysadmin/restaurants/nearby?${params}`
    );
    return res.data;
  }
}

export const restaurantAdminService = new RestaurantAdminService();
