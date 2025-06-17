import { apiClient } from "./authService";

export const getRestaurantDetails = async (slug: string) => {
  const response = await apiClient.get(
    `api/admin/restaurants/${slug}?includeWifi=true`
  );
  return response.data;
};

export const updateRestaurant = async (id: string, updatedData: any) => {
  try {
    const response = await apiClient.put(
      `api/admin/restaurants/details/${id}`,
      updatedData
    );
    return response.data;
  } catch (error) {
    console.error("Error updating restaurant:", error);
    throw error;
  }
};

export const updateWorkingHours = async (id: string, workingHours: any) => {
  const response = await apiClient.put(
    `/api/admin/restaurants/${id}/working-hours`,
    {
      opening_hours: workingHours,
    }
  );
  return response.data;
};

export const updateFilters = async (id: string, filters: any) => {
  if (!id) {
    throw new Error("Restaurant ID is required");
  }

  const response = await apiClient.put(
    `/api/admin/restaurants/${id}/filters`,
    filters
  );

  // Ensure we return just the restaurant data
  return response.data.restaurant || response.data;
};

export const getAllFoodTypes = async () => {
  const response = await apiClient.get("/api/admin/types/food-types");
  return response.data;
};

export const getAllEstablishmentTypes = async () => {
  const response = await apiClient.get("/api/admin/types/establishment-types");
  return response.data;
};

export const getAllEstablishmentPerks = async () => {
  const response = await apiClient.get("/api/admin/types/establishment-perks");
  return response.data;
};

export const getAllMealTypes = async () => {
  const response = await apiClient.get("/api/admin/types/meal-types");
  return response.data;
};

export const getAllPriceCategories = async () => {
  const response = await apiClient.get("/api/admin/types/price-categories");
  return response.data;
};

export const getAllDietaryTypes = async () => {
  const response = await apiClient.get("/api/admin/types/dietary-types");
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
    `/api/admin/restaurants/${id}/images`,
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
  const response = await apiClient.delete(
    `/api/admin/restaurants/${id}/images`,
    {
      data: { imageUrl, restaurant_slug },
    }
  );
  return response.data;
};

export const updateImageOrder = async (id: string, images: string[]) => {
  try {
    const response = await apiClient.put(
      `/api/admin/restaurants/${id}/images/order`,
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

export const getRestaurantById = async (id: string) => {
  const response = await apiClient.get(`/api/admin/restaurants/${id}`);
  return response.data;
};

export const getCustomWorkingDays = async (restaurantId: string) => {
  const response = await apiClient.get(
    `/api/admin/restaurants/${restaurantId}/custom-working-days`
  );
  return response.data;
};

export const getUpcomingCustomWorkingDays = async (restaurantId: string) => {
  const response = await apiClient.get(
    `/api/admin/restaurants/${restaurantId}/upcoming-custom-working-days`
  );
  return response.data;
};

export const addCustomWorkingDay = async (
  restaurantId: string,
  customDay: {
    name: string;
    date: string;
    times: { open: string; close: string }[];
  }
) => {
  const response = await apiClient.post(
    `/api/admin/restaurants/${restaurantId}/custom-working-days`,
    customDay
  );
  return response.data;
};

export const updateCustomWorkingDay = async (
  restaurantId: string,
  customDay: {
    name: string;
    date: string;
    times: { open: string; close: string }[];
  }
) => {
  const response = await apiClient.put(
    `/api/admin/restaurants/${restaurantId}/custom-working-days`,
    customDay
  );
  return response.data;
};

export const deleteCustomWorkingDay = async (
  restaurantId: string,
  date: string
) => {
  const response = await apiClient.delete(
    `/api/admin/restaurants/${restaurantId}/custom-working-days`,
    {
      data: { date },
    }
  );
  return response.data;
};

export const deleteRestaurantThumbnail = async (id: string) => {
  try {
    const response = await apiClient.delete(
      `/api/admin/restaurants/${id}/thumbnail`
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting restaurant thumbnail:", error);
    throw error;
  }
};
