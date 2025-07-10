import { CategoryData, Translation } from "../interfaces/Interfaces";
import { apiClient } from "./authService";

export const createCategory = async (data: CategoryData) => {
  const response = await apiClient.post(`/api/admin/menu/categories`, data);
  return response.data;
};

export const updateCategory = async (
  id: string,
  data: { translations: Translation[]; isActive?: boolean }
) => {
  const response = await apiClient.put(
    `/api/admin/menu/categories/${id}`,
    data
  );
  return response.data;
};

export const deleteCategory = async (id: string) => {
  const response = await apiClient.delete(`/api/admin/menu/categories/${id}`);
  return response.data;
};

// Menu Item API calls

export const getMenuItems = async (restaurantId: string) => {
  const response = await apiClient.get(
    `/api/admin/menu/menuItems-admin/${restaurantId}`
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
  isActive?: boolean;
}) => {
  const formData = new FormData();

  formData.append("translations", JSON.stringify(data.translations));
  formData.append("price", data.price);
  formData.append("restaurantId", data.restaurantId);

  if (data.isActive !== undefined) {
    formData.append("isActive", data.isActive.toString());
  }

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

  const response = await apiClient.post("/api/admin/menu/menuItems", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
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
    `/api/admin/menu/menuItems/${id}`,
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
  const response = await apiClient.delete(`/api/admin/menu/menuItems/${id}`);
  return response.data;
};

// Get all categories for a specific restaurant
export const getCategoryItems = async (restaurantId: string) => {
  const response = await apiClient.get(
    `/api/admin/menu/categories-admin/${restaurantId}`
  );
  return response.data;
};

// Get all allergens
export const getAllAllergens = async () => {
  const response = await apiClient.get("/api/admin/menu/allergens");
  return response.data;
};

export const updateCategoryOrder = async (order: string[]) => {
  const response = await apiClient.put("/api/admin/menu/categories-order", {
    order,
  });
  return response.data;
};

export const updateItemOrder = async (order: string[]) => {
  const response = await apiClient.put("/api/admin/menu/menuItems-order", {
    order,
  });
  return response.data;
};
