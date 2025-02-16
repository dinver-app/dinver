import axios from "axios";

// Create an axios instance with a base URL
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
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

// Add a response interceptor to handle 401 and 403 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403) &&
      window.location.pathname !== "/login"
    ) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const login = async (email: string, password: string) => {
  try {
    const response = await apiClient.post("/api/admin/login", {
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
