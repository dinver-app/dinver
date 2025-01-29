import { apiClient } from "./authService";

export const listSysadmins = async () => {
  try {
    const response = await apiClient.get("api/sysadmin/sysadmins");
    return response.data;
  } catch (error: any) {
    throw new Error(error.response.data.error);
  }
};

export const addSysadmin = async (email: string) => {
  try {
    const response = await apiClient.post("api/sysadmin/sysadmins", { email });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response.data.error);
  }
};

export const removeSysadmin = async (email: string) => {
  try {
    const response = await apiClient.delete(`api/sysadmin/sysadmins/${email}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response.data.error);
  }
};
