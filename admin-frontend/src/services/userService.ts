import { apiClient } from "./authService";

export const updateUserLanguage = async (language: string) => {
  const response = await apiClient.put(`/api/admin/users/language`, {
    language,
  });
  return response.data;
};

export const getUserLanguage = async () => {
  const response = await apiClient.get(`/api/admin/users/language`);
  return response.data;
};

export const getUserById = async (id: string) => {
  const response = await apiClient.get(`/api/admin/users/${id}`);
  return response.data;
};
