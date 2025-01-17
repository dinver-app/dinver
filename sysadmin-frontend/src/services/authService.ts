import axios from "axios";

// Create an axios instance with a base URL
const apiClient = axios.create({
  baseURL: "http://localhost:3000",
  withCredentials: true,
});

// Add an interceptor to include the token in the headers
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const login = async (email: string, password: string) => {
  try {
    const response = await apiClient.post("/api/sysadmin/login", {
      email,
      password,
    });
    return response.data;
  } catch (error) {
    throw new Error("Login failed");
  }
};

export const logout = async () => {
  const response = await apiClient.get("/api/auth/logout");
  return response.data;
};

export const checkAuth = async () => {
  const response = await apiClient.get("/api/auth/check-auth");
  return response.data;
};
