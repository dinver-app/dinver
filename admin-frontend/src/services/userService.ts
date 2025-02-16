import { apiClient } from "./authService";

export const updateUserLanguage = async (language: string) => {
  const response = await apiClient.put(`api/user/language`, {
    language,
  });
  return response.data;
};

export const getUserLanguage = async () => {
  const response = await apiClient.get(`api/user/language`);
  return response.data;
};

export const getUserById = async (id: string) => {
  const response = await apiClient.get(`/api/user/${id}`);
  return response.data;
};
