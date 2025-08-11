import { apiClient } from "./authService";

export interface JsonMenuFile {
  id: string;
  restaurantId: string;
  filename: string;
  jsonContent: any;
  menuType: "food" | "drink";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  restaurant?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface CreateJsonMenuFileData {
  filename: string;
  jsonContent: any;
  menuType: "food" | "drink";
}

export interface UpdateJsonMenuFileData {
  filename?: string;
  jsonContent?: any;
  menuType?: "food" | "drink";
  isActive?: boolean;
}

export interface ImportResult {
  success: boolean;
  message: string;
  results: {
    restaurant: string;
    slug: string;
    menuType: string;
    categories: {
      created: number;
      existing: number;
    };
    items: {
      created: number;
      errors: number;
    };
    errors: string[];
  };
}

// Get all JSON menu files for a restaurant
export const getRestaurantJsonFiles = async (restaurantId: string): Promise<JsonMenuFile[]> => {
  const response = await apiClient.get(`/api/sysadmin/restaurants/${restaurantId}/json-files`);
  return response.data.files;
};

// Create a new JSON menu file
export const createJsonMenuFile = async (
  restaurantId: string,
  data: CreateJsonMenuFileData
): Promise<JsonMenuFile> => {
  const response = await apiClient.post(`/api/sysadmin/restaurants/${restaurantId}/json-files`, data);
  return response.data.file;
};

// Update a JSON menu file
export const updateJsonMenuFile = async (
  id: string,
  data: UpdateJsonMenuFileData
): Promise<JsonMenuFile> => {
  const response = await apiClient.put(`/api/sysadmin/json-files/${id}`, data);
  return response.data.file;
};

// Delete a JSON menu file (soft delete)
export const deleteJsonMenuFile = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/sysadmin/json-files/${id}`);
};

// Import menu from JSON file
export const importMenuFromJsonFile = async (id: string): Promise<ImportResult> => {
  const response = await apiClient.post(`/api/sysadmin/json-files/${id}/import`);
  return response.data;
};
