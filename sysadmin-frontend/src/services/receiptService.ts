import { apiClient } from "./authService";

export interface Receipt {
  id: string;
  userId: string;
  restaurantId?: string;
  imageUrl: string;
  imageHash: string;
  locationLat?: number;
  locationLng?: number;
  status: "pending" | "approved" | "rejected";
  totalAmount?: number;
  issueDate?: string;
  issueTime?: string;
  jir?: string;
  zki?: string;
  oib?: string;
  ocrData?: any;
  verifierId?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  pointsAwarded?: number;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  restaurant?: {
    id: string;
    name: string;
    oib?: string;
  };
  verifier?: {
    id: string;
    user?: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
}

export interface ReceiptFilters {
  status?: string;
  page?: number;
  limit?: number;
  userId?: string;
  restaurantId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ReceiptsResponse {
  receipts: Receipt[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export interface UpdateReceiptData {
  oib?: string;
  jir?: string;
  zki?: string;
  totalAmount?: number;
  issueDate?: string;
  issueTime?: string;
  restaurantId?: string;
}

export interface ApproveReceiptData {
  restaurantId: string;
  totalAmount: number;
  jir: string;
  zki: string;
  oib: string;
  issueDate: string;
  issueTime: string;
}

export interface RejectReceiptData {
  rejectionReason: string;
}

class ReceiptService {
  async getReceipts(filters: ReceiptFilters = {}): Promise<ReceiptsResponse> {
    const params = new URLSearchParams();

    if (filters.status) params.append("status", filters.status);
    if (filters.page) params.append("page", filters.page.toString());
    if (filters.limit) params.append("limit", filters.limit.toString());
    if (filters.userId) params.append("userId", filters.userId);
    if (filters.restaurantId)
      params.append("restaurantId", filters.restaurantId);
    if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.append("dateTo", filters.dateTo);

    const response = await apiClient.get(`/api/sysadmin/receipts?${params}`);

    return response.data;
  }

  async getReceiptById(id: string): Promise<Receipt> {
    const response = await apiClient.get(`/api/sysadmin/receipts/${id}`);

    return response.data;
  }

  async updateReceiptData(id: string, data: UpdateReceiptData): Promise<void> {
    const response = await apiClient.put(`/api/sysadmin/receipts/${id}`, data);

    return response.data;
  }

  async approveReceipt(
    id: string,
    data: ApproveReceiptData
  ): Promise<{ message: string; pointsAwarded: number }> {
    const response = await apiClient.post(
      `/api/sysadmin/receipts/${id}/approve`,
      data
    );

    return response.data;
  }

  async rejectReceipt(
    id: string,
    data: RejectReceiptData
  ): Promise<{ message: string }> {
    const response = await apiClient.post(
      `/api/sysadmin/receipts/${id}/reject`,
      data
    );

    return response.data;
  }
}

export const receiptService = new ReceiptService();
