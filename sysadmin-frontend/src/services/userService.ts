import { User } from "../interfaces/Interfaces";
import { apiClient } from "./authService";

export const listUsers = async (page: number, search?: string) => {
  const searchQuery = search ? `&search=${encodeURIComponent(search)}` : "";
  const response = await apiClient.get(
    `api/sysadmin/users?page=${page}${searchQuery}`
  );
  return response.data;
};

export const listAllUsers = async () => {
  const response = await apiClient.get("/api/sysadmin/users/all");
  return response.data;
};

export const createUser = async (user: User) => {
  const response = await apiClient.post(`api/sysadmin/users`, user);
  return response.data;
};

export const deleteUser = async (email: string) => {
  const response = await apiClient.delete(`api/sysadmin/users`, {
    data: { email },
  });
  return response.data;
};

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
