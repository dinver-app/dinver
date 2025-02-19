import { apiClient } from "./authService";

export const createBackup = async (restaurantId: string) => {
  try {
    const response = await apiClient.post(`/api/backup/${restaurantId}`);
    return response.data;
  } catch (error) {
    console.error("Error creating backup:", error);
    throw error;
  }
};

export const restoreBackup = async (
  restaurantId: string,
  backupDate: string
) => {
  try {
    const response = await apiClient.post(
      `/api/restore/${restaurantId}/${backupDate}`
    );
    return response.data;
  } catch (error) {
    console.error("Error restoring backup:", error);
    throw error;
  }
};

export const listBackups = async (search: string = "") => {
  try {
    const searchQuery = search ? `?search=${encodeURIComponent(search)}` : "";
    const response = await apiClient.get(`/api/backups${searchQuery}`);
    return response.data;
  } catch (error) {
    console.error("Error listing backups:", error);
    throw error;
  }
};

export const downloadBackup = async (
  restaurantId: string,
  backupDate: string
) => {
  try {
    const response = await apiClient.get(
      `/api/download/${restaurantId}/${backupDate}`,
      { responseType: "blob" }
    );
    return response.data;
  } catch (error) {
    console.error("Error downloading backup:", error);
    throw error;
  }
};
