import { apiClient } from "./authService";

// Initialize Google
export const getAdminRestaurants = async () => {
  const response = await apiClient.get("/api/admin/admin-restaurants");
  return response.data;
};

export const getRestaurantAdmins = async (restaurantId: string) => {
  const response = await apiClient.get(
    `/api/admin/restaurants/${restaurantId}/admins`
  );
  return response.data;
};

export const addRestaurantAdmin = async (
  restaurantId: string,
  adminData: { email: string; role: string }
) => {
  const response = await apiClient.post(
    `/api/admin/restaurants/${restaurantId}/admins`,
    adminData
  );
  return response.data;
};

export const removeRestaurantAdmin = async (
  restaurantId: string,
  userId: string
) => {
  await apiClient.delete(
    `/api/admin/restaurants/${restaurantId}/admins/${userId}`
  );
};

export const getUserRole = async (restaurantId: string) => {
  const response = await apiClient.get(`/api/admin/role/${restaurantId}`);
  return response.data.role;
};

export const updateRestaurantAdmin = async (
  restaurantId: string,
  userId: string,
  adminData: { role: string }
) => {
  const response = await apiClient.put(
    `/api/admin/restaurants/${restaurantId}/admins/${userId}`,
    adminData
  );
  return response.data;
};

export const translateText = async (text: string, targetLanguage: string) => {
  const apiKey = import.meta.env.GOOGLE_TRANSLATE_API_KEY;
  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: text,
      target: targetLanguage,
    }),
  });

  const data = await response.json();
  return data.data.translations[0].translatedText;
};
