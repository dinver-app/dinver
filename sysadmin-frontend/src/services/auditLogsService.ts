import { apiClient } from "./authService";

export const getAuditLogs = async (page: number, search: string = "") => {
  const searchQuery = search ? `&search=${encodeURIComponent(search)}` : "";
  const response = await apiClient.get(
    `/api/audit-logs?page=${page}${searchQuery}`
  );
  return response.data;
};
