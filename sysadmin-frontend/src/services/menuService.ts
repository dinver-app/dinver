import { Translation } from "../interfaces/Interfaces";
import { apiClient } from "./authService";

interface MenuItemData {
  price: string;
  categoryId?: string;
  restaurantId: string;
  allergenIds?: string[];
  translations: Translation[];
  imageFile?: File;
}

interface CategoryData {
  restaurantId: string;
  translations: Translation[];
}

// Category API calls

export const createCategory = async (data: CategoryData) => {
  const response = await apiClient.post(`/api/sysadmin/menu/categories`, data);
  return response.data;
};

export const updateCategory = async (
  id: string,
  data: { translations: Translation[] }
) => {
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

export const createMenuItem = async (data: {
  translations: Translation[];
  price: string;
  restaurantId: string;
  allergenIds: string[];
  categoryId?: string | null;
  imageFile?: File;
}) => {
  const formData = new FormData();

  formData.append("translations", JSON.stringify(data.translations));
  formData.append("price", data.price);
  formData.append("restaurantId", data.restaurantId);

  if (data.allergenIds && data.allergenIds.length > 0) {
    formData.append("allergenIds", JSON.stringify(data.allergenIds));
  }

  formData.append(
    "categoryId",
    data.categoryId === null ? "null" : data.categoryId || ""
  );

  if (data.imageFile) {
    formData.append("imageFile", data.imageFile);
  }

  const response = await apiClient.post(
    "/api/sysadmin/menu/menuItems",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

export const updateMenuItem = async (
  id: string,
  data: {
    translations: Translation[];
    price: string;
    restaurantId: string;
    allergenIds: string[];
    categoryId?: string | null;
    imageFile?: File;
    removeImage?: boolean;
  }
) => {
  const formData = new FormData();

  formData.append("translations", JSON.stringify(data.translations));
  formData.append("price", data.price);
  formData.append("restaurantId", data.restaurantId);

  if (data.allergenIds && data.allergenIds.length > 0) {
    formData.append("allergenIds", JSON.stringify(data.allergenIds));
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
    `/api/sysadmin/menu/menuItems/${id}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
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
