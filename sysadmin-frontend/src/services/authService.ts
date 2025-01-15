import axios from "axios";

// Create an axios instance with a base URL
const apiClient = axios.create({
  baseURL: "http://localhost:3000", // Ensure this is your backend API URL
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
  return apiClient.post("/api/sysadmin/login", { email, password });
};
