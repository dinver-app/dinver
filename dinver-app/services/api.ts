/* eslint-disable @typescript-eslint/no-unused-vars */
import axios, { AxiosError, AxiosInstance } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

declare module "axios" {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

export const STORAGE_KEYS = {
  ACCESS_TOKEN: "accessToken",
  REFRESH_TOKEN: "refreshToken",
  USER: "user",
};

const API_KEY = process.env.EXPO_PUBLIC_MOBILE_APP_API_KEY || "";
const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://api.dinver.eu/api/app";

export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    return !!token;
  } catch (error) {
    console.error("Error checking authentication:", error);
    return false;
  }
};

export const clearAuth = async (): Promise<void> => {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
    STORAGE_KEYS.USER,
  ]);
};

const createApiInstance = (baseURL: string): AxiosInstance => {
  const instance = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
  });

  instance.interceptors.request.use(
    async (config) => {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (token) config.headers["Authorization"] = token;
      } catch (error) {
        console.error("Error retrieving auth token:", error);
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      if (error && (error as any).isHandled) {
        return Promise.reject(error);
      }

      if (error.response) {
        const { status, config } = error.response;
        const isAuthEndpoint = config?.url?.includes("/auth");

        // Handle auth errors (except for auth endpoints themselves)
        if (status === 401 && config && !config._retry && !isAuthEndpoint) {
          config._retry = true;
          try {
            await clearAuth();
            router.replace("/(screens)/profile");
          } catch (refreshError) {
            console.error("Error handling auth failure:", refreshError);
          }
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

// Create and export the default API instance
const api = createApiInstance(BASE_URL);
export default api;

// Helper for authenticated API calls with strong typing
export const authRequest = async <T>(
  method: "get" | "post" | "put" | "patch" | "delete",
  url: string,
  data?: any,
  options?: any
): Promise<T> => {
  const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  if (!token) throw new Error("Authentication required");

  const config = {
    headers: {
      Authorization: token,
      "x-api-key": API_KEY,
      ...options?.headers,
    },
    ...options,
  };

  try {
    let response;
    switch (method) {
      case "get":
        response = await api.get(url, config);
        break;
      case "post":
        response = await api.post(url, data, config);
        break;
      case "put":
        response = await api.put(url, data, config);
        break;
      case "patch":
        response = await api.patch(url, data, config);
        break;
      case "delete":
        response = await api.delete(url, config);
        break;
    }
    return response.data;
  } catch (error) {
    if ((error as AxiosError).response?.status === 401) {
      router.replace("/(screens)/profile");
    }
    throw error;
  }
};

export const login = async (email: string, password: string) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/auth/login`,
      { email, password },
      {
        headers: {
          "x-api-key": API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const { token } = response.data;
    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Login failed");
  }
};

export const register = async (
  email: string,
  password: string,
  name: string
) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/auth/register`,
      { email, password, name },
      {
        headers: {
          "x-api-key": API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const { token } = response.data;
    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Registration failed");
  }
};

export const logout = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  } catch (error) {
    console.error("Error during logout:", error);
    throw error;
  }
};
