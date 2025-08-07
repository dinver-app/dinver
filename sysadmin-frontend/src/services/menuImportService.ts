import { apiClient } from "./authService";

export interface MenuAnalysisResult {
  success: boolean;
  message: string;
  error?: string;
  data?: {
    categories: Array<{
      name: {
        hr: string;
        en: string;
      };
      description?: {
        hr: string;
        en: string;
      };
    }>;
    items: Array<{
      name: {
        hr: string;
        en: string;
      };
      description?: {
        hr: string;
        en: string;
      };
      price: number;
      categoryName: string;
      hasSizes?: boolean;
      defaultSizeName?: string | null;
      sizes?: Array<{
        name: string;
        price: number;
      }>;
    }>;
  };
  results?: Array<{
    filename: string;
    data?: any;
    error?: string;
  }>;
  restaurantId: string;
  menuType: "food" | "drink";
}

export const analyzeMenuImage = async (
  restaurantId: string,
  file: File,
  menuType: "food" | "drink" = "food"
): Promise<MenuAnalysisResult> => {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("menuType", menuType);

  const response = await apiClient.post(
    `/api/sysadmin/menu-import/${restaurantId}/analyze-single`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

export const analyzeMultipleMenuImages = async (
  restaurantId: string,
  files: File[],
  menuType: "food" | "drink" = "food"
): Promise<MenuAnalysisResult> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("images", file);
  });
  formData.append("menuType", menuType);

  const response = await apiClient.post(
    `api/sysadmin/menu-import/${restaurantId}/analyze-multiple`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

export const importEditedMenu = async (
  restaurantId: string,
  menuType: "food" | "drink",
  categories: Array<{
    id: string;
    name: { hr: string; en: string };
    description: { hr: string; en: string };
  }>,
  items: Array<{
    id: string;
    name: { hr: string; en: string };
    description: { hr: string; en: string };
    price: number;
    categoryName: string;
    hasSizes: boolean;
    defaultSizeName: string | null;
    sizes: Array<{ name: string; price: number }>;
  }>
): Promise<{ success: boolean; message: string; results: any }> => {
  const response = await apiClient.post(
    `api/sysadmin/menu-import/${restaurantId}/import`,
    {
      restaurantId,
      menuType,
      categories,
      items,
    }
  );

  return response.data;
};
