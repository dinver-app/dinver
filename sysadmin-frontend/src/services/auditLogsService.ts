import { apiClient } from "./authService";

export const getAuditLogs = async (
  page: number,
  search: string = "",
  action: string = ""
) => {
  const searchQuery = search ? `&search=${encodeURIComponent(search)}` : "";
  const actionQuery =
    action && action !== "all" ? `&action=${encodeURIComponent(action)}` : "";
  const response = await apiClient.get(
    `/api/audit-logs?page=${page}${searchQuery}${actionQuery}`
  );
  return response.data;
};
