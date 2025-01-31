import { apiClient } from "./authService";

export const getAllRestaurants = async (page: number, search?: string) => {
  const response = await apiClient.get(
    `api/restaurants?page=${page}${
      search ? `&search=${encodeURIComponent(search)}` : ""
    }`
  );
  return response.data;
};

export const getRestaurantDetails = async (slug: string) => {
  const response = await apiClient.get(`api/restaurants/${slug}`);
  return response.data;
};

export const createRestaurant = async (restaurant: any) => {
  const response = await apiClient.post("api/restaurants", restaurant);
  return response.data;
};

export const deleteRestaurant = async (name: string) => {
  const response = await apiClient.delete("api/restaurants", {
    data: { name },
  });
  return response.data;
};

export const updateRestaurant = async (id: string, updatedData: any) => {
  try {
    const response = await apiClient.put(`/api/restaurants/${id}`, updatedData);
    return response.data;
  } catch (error) {
    console.error("Error updating restaurant:", error);
    throw error;
  }
};

export const updateWorkingHours = async (id: string, workingHours: any) => {
  const response = await apiClient.put(`/api/restaurants/${id}/working-hours`, {
    opening_hours: workingHours,
  });
  return response.data;
};

export const updateFilters = async (id: string, filters: any) => {
  const response = await apiClient.put(
    `/api/restaurants/${id}/filters`,
    filters
  );
  return response.data;
};

export const getAllFoodTypes = async () => {
  const response = await apiClient.get("api/types/food-types");
  return response.data;
};

export const getAllEstablishmentTypes = async () => {
  const response = await apiClient.get("api/types/establishment-types");
  return response.data;
};

export const getAllEstablishmentPerks = async () => {
  const response = await apiClient.get("api/types/establishment-perks");
  return response.data;
};
