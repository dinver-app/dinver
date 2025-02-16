import { apiClient } from "./authService";

export const getPaginatedReviewsForClaimedRestaurants = async (
  page: number,
  searchTerm: string,
  limit: number = 10
) => {
  const response = await apiClient.get(
    `/api/sysadmin/claimed/reviews?page=${page}&limit=${limit}&search=${encodeURIComponent(
      searchTerm
    )}`
  );
  return response.data;
};
