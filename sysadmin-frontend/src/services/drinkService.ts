import { Translation } from "../interfaces/Interfaces";
import { apiClient } from "./authService";

interface DrinkItemData {
  price: string;
  categoryId?: string;
  restaurantId: string;
  translations: Translation[];
  imageFile?: File;
}

interface DrinkCategoryData {
  restaurantId: string;
  translations: Translation[];
}

// Drink Category API calls

export const createDrinkCategory = async (data: DrinkCategoryData) => {
  const response = await apiClient.post(
    `/api/sysadmin/drinks/categories`,
    data
  );
  return response.data;
};

export const updateDrinkCategory = async (
  id: string,
  data: { translations: Translation[] }
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

export const createDrinkItem = async (data: {
  translations: Translation[];
  price: string;
  restaurantId: string;
  categoryId?: string | null;
  imageFile?: File;
}) => {
  const formData = new FormData();

  formData.append("translations", JSON.stringify(data.translations));
  formData.append("price", data.price);
  formData.append("restaurantId", data.restaurantId);

  formData.append(
    "categoryId",
    data.categoryId === null ? "null" : data.categoryId || ""
  );

  if (data.imageFile) {
    formData.append("imageFile", data.imageFile);
  }

  const response = await apiClient.post(
    "/api/sysadmin/drinks/drinkItems",
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
  }
) => {
  const formData = new FormData();

  formData.append("translations", JSON.stringify(data.translations));
  formData.append("price", data.price);
  formData.append("restaurantId", data.restaurantId);

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
    `/api/sysadmin/drinks/drinkItems/${id}`,
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
