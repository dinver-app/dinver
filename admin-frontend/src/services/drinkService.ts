import { DrinkCategoryData, Translation } from "../interfaces/Interfaces";
import { apiClient } from "./authService";

// Drink Category API calls

export const createDrinkCategory = async (data: DrinkCategoryData) => {
  const response = await apiClient.post(`/api/admin/drinks/categories`, data);
  return response.data;
};

export const updateDrinkCategory = async (
  id: string,
  data: { translations: Translation[]; isActive?: boolean }
) => {
  const response = await apiClient.put(
    `/api/admin/drinks/categories/${id}`,
    data
  );
  return response.data;
};

export const deleteDrinkCategory = async (id: string) => {
  const response = await apiClient.delete(`/api/admin/drinks/categories/${id}`);
  return response.data;
};

// Drink Item API calls

export const getDrinkItems = async (restaurantId: string) => {
  const response = await apiClient.get(
    `/api/admin/drinks/drinkItems-admin/${restaurantId}`
  );
  return response.data;
};

export const createDrinkItem = async (data: {
  translations: Translation[];
  price: string;
  restaurantId: string;
  categoryId?: string | null;
  imageFile?: File;
  isActive?: boolean;
}) => {
  const formData = new FormData();

  formData.append("translations", JSON.stringify(data.translations));
  formData.append("price", data.price);
  formData.append("restaurantId", data.restaurantId);

  if (data.isActive !== undefined) {
    formData.append("isActive", data.isActive.toString());
  }

  formData.append(
    "categoryId",
    data.categoryId === null ? "null" : data.categoryId || ""
  );

  if (data.imageFile) {
    formData.append("imageFile", data.imageFile);
  }

  const response = await apiClient.post(
    "/api/admin/drinks/drinkItems",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

export const updateDrinkItem = async (
  id: string,
  data: {
    translations: Translation[];
    price: string;
    restaurantId: string;
    categoryId?: string | null;
    imageFile?: File;
    removeImage?: boolean;
    isActive?: boolean;
  }
) => {
  const formData = new FormData();

  formData.append("translations", JSON.stringify(data.translations));
  formData.append("price", data.price);
  formData.append("restaurantId", data.restaurantId);

  if (data.isActive !== undefined) {
    formData.append("isActive", data.isActive.toString());
  }

  formData.append(
    "categoryId",
    data.categoryId === null ? "null" : data.categoryId || ""
  );

  if (data.imageFile) {
    formData.append("imageFile", data.imageFile);
  }

  if (data.removeImage) {
    formData.append("removeImage", "true");
  }

  const response = await apiClient.put(
    `/api/admin/drinks/drinkItems/${id}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

export const deleteDrinkItem = async (id: string) => {
  const response = await apiClient.delete(`/api/admin/drinks/drinkItems/${id}`);
  return response.data;
};

// Get all drink categories for a specific restaurant
export const getDrinkCategories = async (restaurantId: string) => {
  const response = await apiClient.get(
    `/api/admin/drinks/categories-admin/${restaurantId}`
  );
  return response.data;
};

export const updateDrinkCategoryOrder = async (order: string[]) => {
  const response = await apiClient.put("/api/admin/drinks/categories-order", {
    order,
  });
  return response.data;
};

export const updateDrinkItemOrder = async (order: string[]) => {
  const response = await apiClient.put("/api/admin/drinks/drinkItems-order", {
    order,
  });
  return response.data;
};
