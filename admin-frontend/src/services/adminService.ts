import { apiClient } from "./authService";

export const getAdminRestaurants = async () => {
  const response = await apiClient.get("/api/admin/admin-restaurants");
  return response.data;
};
