import { apiClient } from "./authService";

export const getSubscribers = async (page: number, status?: string) => {
  try {
    const response = await apiClient.get(
      `api/sysadmin/newsletter/subscribers`,
      {
        params: {
          page,
          status,
        },
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};
