import { apiClient } from "./authService";

export interface QRPrintRequest {
  id: string;
  userId: string;
  restaurantId: string;
  quantity: number;
  status: string;
  customText?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  restaurant?: {
    id: string;
    name: string;
  };
  showDinverLogo: boolean;
  showRestaurantName: boolean;
  showScanText: boolean;
  textPosition: string;
  qrTextColor: string;
  qrBackgroundColor: string;
  qrBorderColor: string;
  qrBorderWidth: number;
  padding: number;
}

export const getAllQRPrintRequests = async (
  params: {
    status?: string;
    restaurantId?: string;
    userId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}
) => {
  const query = new URLSearchParams();
  if (params.status) query.append("status", params.status);
  if (params.restaurantId) query.append("restaurantId", params.restaurantId);
  if (params.userId) query.append("userId", params.userId);
  if (params.search) query.append("search", params.search);
  if (params.limit) query.append("limit", params.limit.toString());
  if (params.offset) query.append("offset", params.offset.toString());
  const response = await apiClient.get(
    `/api/sysadmin/qr-print-requests?${query.toString()}`
  );
  return response.data.requests as QRPrintRequest[];
};

export const updateQRPrintRequestStatus = async (
  id: string,
  status: string
) => {
  const response = await apiClient.patch(
    `/api/sysadmin/qr-print-requests/${id}/status`,
    { status }
  );
  return response.data.request as QRPrintRequest;
};

export const deleteQRPrintRequest = async (id: string) => {
  await apiClient.delete(`/api/sysadmin/qr-print-requests/${id}`);
};
