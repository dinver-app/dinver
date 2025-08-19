import { apiClient } from "./authService";

export interface ReferralStats {
  totalReferrals: number;
  statusBreakdown: {
    pending: number;
    registered: number;
    firstVisit: number;
    completed: number;
  };
  totalRewardsPaid: number;
  activeCodes: number;
  conversionRate: string;
}

export interface Referral {
  id: string;
  referrer: {
    firstName: string;
    lastName: string;
    email: string;
  };
  referredUser: {
    firstName: string;
    lastName: string;
    email: string;
  };
  referralCode: {
    code: string;
  };
  status: "PENDING" | "REGISTERED" | "FIRST_VISIT" | "COMPLETED";
  createdAt: string;
  registeredAt?: string;
  firstVisitAt?: string;
  completedAt?: string;
  rewardAmount?: number;
  rewardType?: "POINTS" | "COUPON" | "CASH";
  firstVisitRestaurant?: {
    name: string;
  };
  progress: {
    step: number;
    stepName: string;
    nextStep: string;
    completedSteps: number;
    totalSteps: number;
    percentComplete: number;
  };
}

export interface ReferralsResponse {
  referrals: Referral[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Get all referrals with pagination and search
export const getAllReferrals = async (
  page: number = 1,
  limit: number = 20,
  status?: string,
  search?: string
): Promise<ReferralsResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (status) params.append("status", status);
  if (search) params.append("search", search);

  const response = await apiClient.get(
    `/api/sysadmin/referrals?${params.toString()}`
  );
  return response.data;
};

// Get referral statistics
export const getReferralStats = async (): Promise<ReferralStats> => {
  const response = await apiClient.get("/api/sysadmin/referrals/stats");
  return response.data;
};
