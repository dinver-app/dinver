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

export const setUserBanStatus = async (email: string, banned: boolean) => {
  try {
    const response = await apiClient.post("api/sysadmin/users/ban", {
      email,
      banned,
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response.data.error);
  }
};

export const getRestaurantAdmins = async (restaurantId: string) => {
  try {
    const response = await apiClient.get(
      `api/sysadmin/restaurants/${restaurantId}/admins`
    );
    return response.data;
  } catch (error: any) {
    throw new Error(error.response.data.error);
  }
};

export const addRestaurantAdmin = async (
  restaurantId: string,
  email: string,
  role: string
) => {
  try {
    const response = await apiClient.post(
      `api/sysadmin/restaurants/${restaurantId}/admins`,
      {
        email,
        role,
      }
    );
    return response.data;
  } catch (error: any) {
    throw new Error(error.response.data.error);
  }
};

export const removeRestaurantAdmin = async (
  restaurantId: string,
  userId: string
) => {
  try {
    const response = await apiClient.delete(
      `api/sysadmin/restaurants/${restaurantId}/admins/${userId}`
    );
    return response.data;
  } catch (error: any) {
    throw new Error(error.response.data.error);
  }
};

export const updateRestaurantAdminRole = async (
  restaurantId: string,
  email: string,
  role: string
) => {
  try {
    const response = await apiClient.patch(
      `api/sysadmin/restaurants/${restaurantId}/admins/${email}`,
      {
        role,
      }
    );
    return response.data;
  } catch (error: any) {
    throw new Error(error.response.data.error);
  }
};
