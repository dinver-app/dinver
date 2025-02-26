import { apiClient } from "./authService";

// Drink Category API calls

export const createDrinkCategory = async (data: {
  name: string;
  restaurantId: string;
}) => {
  const response = await apiClient.post(
    `/api/sysadmin/drinks/categories`,
    data
  );
  return response.data;
};

export const updateDrinkCategory = async (
  id: string,
  data: { name: string }
) => {
  const response = await apiClient.put(
    `/api/sysadmin/drinks/categories/${id}`,
    data
  );
  return response.data;
};

export const deleteDrinkCategory = async (id: string) => {
  const response = await apiClient.delete(
    `/api/sysadmin/drinks/categories/${id}`
  );
  return response.data;
};

// Drink Item API calls

export const getDrinkItems = async (restaurantId: string) => {
  const response = await apiClient.get(
    `/api/sysadmin/drinks/drinkItems/${restaurantId}`
  );
  return response.data;
};

export const createDrinkItem = async (data: any) => {
  const response = await apiClient.post(
    "/api/sysadmin/drinks/drinkItems",
    data
  );
  return response.data;
};

export const updateDrinkItem = async (id: string, data: any) => {
  const response = await apiClient.put(
    `/api/sysadmin/drinks/drinkItems/${id}`,
    data
  );
  return response.data;
};

export const deleteDrinkItem = async (id: string) => {
  const response = await apiClient.delete(
    `/api/sysadmin/drinks/drinkItems/${id}`
  );
  return response.data;
};

// Get all drink categories for a specific restaurant
export const getDrinkCategories = async (restaurantId: string) => {
  const response = await apiClient.get(
    `/api/sysadmin/drinks/categories/${restaurantId}`
  );
  return response.data;
};

export const updateDrinkCategoryOrder = async (order: string[]) => {
  const response = await apiClient.put(
    "/api/sysadmin/drinks/categories-order",
    {
      order,
    }
  );
  return response.data;
};

export const updateDrinkItemOrder = async (order: string[]) => {
  const response = await apiClient.put(
    "/api/sysadmin/drinks/drinkItems-order",
    {
      order,
    }
  );
  return response.data;
};
