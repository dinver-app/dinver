import { apiClient } from "./authService";

export const getAnalyticsSummary = async (restaurantId?: string) => {
  const scope = restaurantId ? "single_restaurant" : "all_restaurants";
  const params = restaurantId
    ? `?restaurantId=${restaurantId}&scope=${scope}`
    : `?scope=${scope}`;
  const response = await apiClient.get(
    `/api/sysadmin/analytics/summary${params}`
  );
  return response.data;
};
