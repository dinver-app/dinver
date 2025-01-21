import { apiClient } from "./authService";

export const listSysadmins = async () => {
  try {
    const response = await apiClient.get("api/sysadmin/sysadmins");
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch sysadmins");
  }
};

export const addSysadmin = async (userId: string) => {
  try {
    const response = await apiClient.post("api/sysadmin/sysadmins", { userId });
    return response.data;
  } catch (error) {
    throw new Error("Failed to add sysadmin");
  }
};

export const removeSysadmin = async (userId: string) => {
  try {
    const response = await apiClient.delete(`api/sysadmin/sysadmins/${userId}`);
    return response.data;
  } catch (error) {
    throw new Error("Failed to remove sysadmin");
  }
};
