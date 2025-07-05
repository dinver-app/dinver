import { apiClient } from "./authService";

export const getAnalyticsSummary = async (restaurantId: string) => {
  const response = await apiClient.get(
    `/api/admin/analytics/summary?restaurantId=${restaurantId}`
  );
  return response.data;
};
