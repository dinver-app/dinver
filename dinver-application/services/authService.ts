import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const MOBILE_APP_API_KEY = Constants.expoConfig?.extra?.mobileAppApiKey;
const API_URL = "https://api.dinver.eu/api";

// Create an axios instance with a base URL
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    "x-api-key": MOBILE_APP_API_KEY,
  },
});

// Add a response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const authService = {
  async login(email: string, password: string) {
    try {
      const response = await apiClient.post("/app/auth/login", {
        email,
        password,
      });

      console.log("Login response:", response.data);

      // Provjeri ima li token u odgovoru
      if (response.data?.token) {
        await AsyncStorage.setItem("token", response.data.token);
      } else {
        throw new Error("Token nije pronađen u odgovoru");
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.message || "Greška prilikom prijave"
        );
      }
      throw error;
    }
  },

  async register(userData: { email: string; password: string; name: string }) {
    try {
      const response = await apiClient.post("/app/auth/register", userData);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.message || "Greška prilikom registracije"
        );
      }
      throw error;
    }
  },
};
