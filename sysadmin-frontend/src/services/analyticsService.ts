import { apiClient } from "./authService";

export const getAnalyticsSummary = async (restaurantId?: string) => {
  const params = restaurantId ? `?restaurantId=${restaurantId}` : "";
  const response = await apiClient.get(
    `/api/sysadmin/analytics/summary${params}`
  );
  return response.data;
};
