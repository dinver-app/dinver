import { apiClient } from "./authService";

// Category API calls

export const createCategory = async (data: {
  name: string;
  restaurantId: string;
}) => {
  const response = await apiClient.post(`/api/sysadmin/menu/categories`, data);
  return response.data;
};

export const updateCategory = async (id: string, data: { name: string }) => {
  const response = await apiClient.put(
    `/api/sysadmin/menu/categories/${id}`,
    data
  );
  return response.data;
};

export const deleteCategory = async (id: string) => {
  const response = await apiClient.delete(
    `/api/sysadmin/menu/categories/${id}`
  );
  return response.data;
};

// Menu Item API calls

export const getMenuItems = async (restaurantId: string) => {
  const response = await apiClient.get(
    `/api/sysadmin/menu/menuItems/${restaurantId}`
  );
  return response.data;
};

export const createMenuItem = async (data: any) => {
  const response = await apiClient.post("/api/sysadmin/menu/menuItems", data);
  return response.data;
};

export const updateMenuItem = async (id: string, data: any) => {
  const response = await apiClient.put(
    `/api/sysadmin/menu/menuItems/${id}`,
    data
  );
  return response.data;
};

export const deleteMenuItem = async (id: string) => {
  const response = await apiClient.delete(`/api/sysadmin/menu/menuItems/${id}`);
  return response.data;
};

// Get all categories for a specific restaurant
export const getCategoryItems = async (restaurantId: string) => {
  const response = await apiClient.get(
    `/api/sysadmin/menu/categories/${restaurantId}`
  );
  return response.data;
};

// Get all ingredients
export const getAllIngredients = async () => {
  const response = await apiClient.get("/api/sysadmin/menu/ingredients");
  return response.data;
};

// Get all allergens
export const getAllAllergens = async () => {
  const response = await apiClient.get("/api/sysadmin/menu/allergens");
  return response.data;
};

export const updateCategoryOrder = async (order: string[]) => {
  const response = await apiClient.put("/api/sysadmin/menu/categories-order", {
    order,
  });
  return response.data;
};

export const updateItemOrder = async (order: string[]) => {
  const response = await apiClient.put("/api/sysadmin/menu/menuItems-order", {
    order,
  });
  return response.data;
};
