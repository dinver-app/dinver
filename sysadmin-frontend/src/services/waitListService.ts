import { apiClient } from "./authService";

export interface WaitListEntry {
  id: string;
  email: string;
  city: string;
  restaurantName?: string;
  type: "user" | "restaurant";
  createdAt: string;
  updatedAt: string;
}

export interface WaitListStats {
  totalUsers: number;
  totalRestaurants: number;
  totalEntries: number;
  cityStats: Array<{
    city: string;
    count: number;
  }>;
}

export interface WaitListResponse {
  success: boolean;
  data: {
    entries: WaitListEntry[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export const getWaitListEntries = async (page: number, type?: string) => {
  try {
    const response = await apiClient.get(`api/sysadmin/waitlist/get-all`, {
      params: {
        page,
        type,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getWaitListStats = async (): Promise<WaitListStats> => {
  try {
    const response = await apiClient.get(`api/sysadmin/waitlist/get-stats`);
    return response.data.data;
  } catch (error) {
    throw error;
  }
};
