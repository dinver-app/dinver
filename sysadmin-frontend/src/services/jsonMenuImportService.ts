import { apiClient } from "./authService";

export interface AvailableMenu {
  slug: string;
  restaurantName: string;
  fileCount: number;
  jsonFiles: string[];
}

export interface ImportResult {
  results: {
    categories: {
      created: number;
      existing: number;
    };
    items: {
      created: number;
      errors: number;
    };
    files: Array<{
      filename: string;
      categories: { created: number };
      items: { created: number };
      error?: string;
    }>;
    errors: string[];
  };
}

// Get list of available menus from JSON files
export const getAvailableMenus = async (): Promise<AvailableMenu[]> => {
  const response = await apiClient.get("/api/sysadmin/json-menu-import/list");
  return response.data.menus || [];
};

// Import specific menu file for a restaurant
export const importMenuFile = async (
  restaurantSlug: string,
  filename: string,
  menuType: "food" | "drink"
): Promise<ImportResult> => {
  const response = await apiClient.post(
    `/api/sysadmin/json-menu-import/${restaurantSlug}/import`,
    {
      filename,
      menuType,
    }
  );
  return response.data;
};
