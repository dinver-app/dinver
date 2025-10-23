import { apiClient } from "./authService";

export const getPaginatedReviewsForClaimedRestaurants = async (
  page: number,
  searchTerm: string,
  limit: number = 10,
  sort: string = "date_desc"
) => {
  const response = await apiClient.get(
    `/api/sysadmin/claimed/reviews?page=${page}&limit=${limit}&search=${encodeURIComponent(
      searchTerm
    )}&sort=${sort}`
  );
  return response.data;
};

export const getReviewById = async (reviewId: string) => {
  const response = await apiClient.get(`/api/sysadmin/reviews/${reviewId}`);
  return response.data;
};
