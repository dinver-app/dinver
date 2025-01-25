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
