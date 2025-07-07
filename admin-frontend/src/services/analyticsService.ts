import { apiClient } from "./authService";

export const getAnalyticsSummary = async (restaurantId: string) => {
  const response = await apiClient.get(
    `/api/admin/analytics/summary?restaurantId=${restaurantId}&scope=single_restaurant`
  );
  return response.data;
};
