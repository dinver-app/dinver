import { apiClient } from "./authService";

export const getRestaurants = async (page: number, search?: string) => {
  const response = await apiClient.get(
    `api/restaurants?page=${page}${
      search ? `&search=${encodeURIComponent(search)}` : ""
    }`
  );
  return response.data;
};

export const getAllRestaurants = async () => {
  const response = await apiClient.get("/api/restaurants/all");
  return response.data.map((restaurant: any) => ({
    id: restaurant.id,
    name: restaurant.name,
  }));
};

export const getRestaurantDetails = async (slug: string) => {
  const response = await apiClient.get(`api/restaurants/${slug}`);
  return response.data;
};

export const createRestaurant = async (restaurant: any) => {
  const response = await apiClient.post("api/restaurants", restaurant);
  return response.data;
};

export const deleteRestaurant = async (id: string) => {
  const response = await apiClient.delete(`api/restaurants/${id}`);
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

export const addRestaurantImages = async (
  id: string,
  restaurant_slug: string,
  images: File[]
) => {
  const formData = new FormData();
  images.forEach((image) => formData.append("images", image));
  formData.append("restaurant_slug", restaurant_slug);

  const response = await apiClient.post(
    `/api/restaurants/${id}/images`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

export const deleteRestaurantImage = async (
  id: string,
  restaurant_slug: string,
  imageUrl: string
) => {
  const response = await apiClient.delete(`/api/restaurants/${id}/images`, {
    data: { imageUrl, restaurant_slug },
  });
  return response.data;
};

export const updateImageOrder = async (id: string, images: string[]) => {
  try {
    const response = await apiClient.put(
      `/api/restaurants/${id}/images/order`,
      {
        images,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating image order:", error);
    throw error;
  }
};

export const handleClaimStatus = async (
  restaurantId: string,
  offer: string,
  isClaimed: boolean
) => {
  try {
    const response = await apiClient.post("/api/claim-logs/claim-status", {
      restaurantId,
      offer,
      isClaimed,
    });
    return response.data;
  } catch (error) {
    console.error("Error handling claim status:", error);
    throw error;
  }
};

export const getAllClaimLogs = async () => {
  try {
    const response = await apiClient.get("/api/claim-logs");
    return response.data;
  } catch (error) {
    console.error("Error fetching claim logs:", error);
    throw error;
  }
};

export const getRestaurantById = async (id: string) => {
  const response = await apiClient.get(`/api/restaurants/details/${id}`);
  return response.data;
};
