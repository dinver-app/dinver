import { apiClient } from "./authService";

export const getGoogleApiLogsSummary = async (
  startDate?: string,
  endDate?: string
) => {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);

  const queryString = params.toString();
  const response = await apiClient.get(
    `/api/sysadmin/google-api-logs/summary${queryString ? `?${queryString}` : ""}`
  );
  return response.data;
};

export const getRecentGoogleApiLogs = async (
  page: number = 1,
  limit: number = 50
) => {
  const response = await apiClient.get(
    `/api/sysadmin/google-api-logs/recent?page=${page}&limit=${limit}`
  );
  return response.data;
};

export const getFailedGoogleApiLogs = async () => {
  const response = await apiClient.get(
    `/api/sysadmin/google-api-logs/failed`
  );
  return response.data;
};
