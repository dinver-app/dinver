import { apiClient } from "./authService";

export interface Size {
  id: string;
  name: string;
  isActive: boolean;
}

export interface SizeTranslation {
  id: string;
  sizeId: string;
  language: string;
  name: string;
}

// Get all sizes for a specific restaurant
export const getAllSizes = async (restaurantId: string): Promise<Size[]> => {
  const response = await apiClient.get(`/api/admin/sizes/${restaurantId}`);
  return response.data;
};

// Create a new size
export const createSize = async (data: {
  restaurantId: string;
  translations: { language: string; name: string }[];
  isActive?: boolean;
}): Promise<Size> => {
  const response = await apiClient.post("/api/admin/sizes", data);
  return response.data;
};

// Update a size
export const updateSize = async (
  id: string,
  data: {
    translations: { language: string; name: string }[];
    isActive?: boolean;
  }
): Promise<Size> => {
  const response = await apiClient.put(`/api/admin/sizes/${id}`, data);
  return response.data;
};

// Delete a size
export const deleteSize = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/admin/sizes/${id}`);
};
