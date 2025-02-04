import { apiClient } from "./authService";

// Category API calls

export const createCategory = async (data: {
  name: string;
  restaurantId: string;
}) => {
  const response = await apiClient.post(`/api/menu/categories`, data);
  return response.data;
};

export const updateCategory = async (id: string, data: { name: string }) => {
  const response = await apiClient.put(`/api/menu/categories/${id}`, data);
  return response.data;
};

export const deleteCategory = async (id: string) => {
  const response = await apiClient.delete(`/api/menu/categories/${id}`);
  return response.data;
};

// Menu Item API calls

export const getMenuItems = async (restaurantId: string) => {
  const response = await apiClient.get(`/api/menu/menuItems/${restaurantId}`);
  return response.data;
};

export const createMenuItem = async (data: {
  name: string;
  price: number;
  restaurantId: string;
  categoryId?: string;
}) => {
  const response = await apiClient.post("/api/menu/menuItems", data);
  return response.data;
};

export const updateMenuItem = async (
  id: string,
  data: { name: string; price: number; categoryId?: string }
) => {
  const response = await apiClient.put(`/api/menu/menuItems/${id}`, data);
  return response.data;
};

export const deleteMenuItem = async (id: string) => {
  const response = await apiClient.delete(`/api/menu/menuItems/${id}`);
  return response.data;
};

// Get all categories for a specific restaurant
export const getCategoryItems = async (restaurantId: string) => {
  const response = await apiClient.get(`/api/menu/categories/${restaurantId}`);
  return response.data;
};
