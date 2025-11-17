import {
  Visit,
  VisitsResponse,
  VisitStats,
  UpdateReceiptPayload,
  ApproveVisitResponse,
  RejectVisitPayload,
} from '../interfaces/Visit';
import { apiClient } from './authService';

export const visitService = {
  /**
   * Get all visits with pagination and filters
   */
  async getVisits(params?: {
    status?: string;
    restaurantId?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }): Promise<VisitsResponse> {
    const response = await apiClient.get<VisitsResponse>('/api/sysadmin/visits', {
      params,
    });
    return response.data;
  },

  /**
   * Get single visit by ID
   */
  async getVisitById(id: string): Promise<Visit> {
    const response = await apiClient.get<Visit>(`/api/sysadmin/visits/${id}`);
    return response.data;
  },

  /**
   * Get visit statistics
   */
  async getVisitStats(): Promise<VisitStats> {
    const response = await apiClient.get<VisitStats>('/api/sysadmin/visits/stats');
    return response.data;
  },

  /**
   * Update receipt OCR data
   */
  async updateReceipt(receiptId: string, data: UpdateReceiptPayload): Promise<{ message: string }> {
    const response = await apiClient.put<{ message: string }>(
      `/api/sysadmin/receipts/${receiptId}`,
      data,
    );
    return response.data;
  },

  /**
   * Approve visit
   */
  async approveVisit(visitId: string): Promise<ApproveVisitResponse> {
    const response = await apiClient.post<ApproveVisitResponse>(
      `/api/sysadmin/visits/${visitId}/approve`,
      {},
    );
    return response.data;
  },

  /**
   * Reject visit
   */
  async rejectVisit(visitId: string, payload: RejectVisitPayload): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      `/api/sysadmin/visits/${visitId}/reject`,
      payload,
    );
    return response.data;
  },

  /**
   * Delete visit
   */
  async deleteVisit(visitId: string): Promise<{ message: string; deletedVisitId: string }> {
    const response = await apiClient.delete<{ message: string; deletedVisitId: string }>(
      `/api/sysadmin/visits/${visitId}`,
    );
    return response.data;
  },
};
