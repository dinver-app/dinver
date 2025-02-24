import { apiClient } from "./authService";

export const getPaginatedReviewsForRestaurant = async (
  restaurantId: string,
  page: number = 1,
  limit: number = 10,
  search: string = "",
  sort: string = "date_desc"
) => {
  const response = await apiClient.get(
    `/api/admin/restaurant/${restaurantId}/reviews?page=${page}&limit=${limit}&search=${encodeURIComponent(
      search
    )}&sort=${sort}`
  );
  return response.data;
};
