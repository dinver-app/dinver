import { apiClient } from "./authService";

export interface MenuItem {
  id: string;
  name: string;
  price: string;
  imageUrl?: string;
  translations?: any[];
}

export interface Restaurant {
  id: string;
  name: string;
  address?: string;
  place?: string;
}

export interface CreateCouponData {
  source: "DINVER" | "RESTAURANT";
  restaurantId: string;
  title: string;
  description?: string;
  type: "REWARD_ITEM" | "PERCENT_DISCOUNT" | "FIXED_DISCOUNT";
  rewardItemId?: string;
  percentOff?: number;
  fixedOff?: number;
  totalLimit?: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "EXPIRED";
  imageFile?: File;
  conditionKind?:
    | "POINTS_AT_LEAST"
    | "REFERRALS_AT_LEAST"
    | "VISITS_DIFFERENT_RESTAURANTS_AT_LEAST"
    | "VISITS_CITIES_AT_LEAST";
  conditionValue?: number;
  conditionRestaurantScopeId?: string;
}

export interface UpdateCouponData {
  source: "DINVER" | "RESTAURANT";
  restaurantId: string;
  title: string;
  description?: string;
  type: "REWARD_ITEM" | "PERCENT_DISCOUNT" | "FIXED_DISCOUNT";
  rewardItemId?: string;
  percentOff?: number;
  fixedOff?: number;
  totalLimit?: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "EXPIRED";
  imageFile?: File;
  conditionKind?:
    | "POINTS_AT_LEAST"
    | "REFERRALS_AT_LEAST"
    | "VISITS_DIFFERENT_RESTAURANTS_AT_LEAST"
    | "VISITS_CITIES_AT_LEAST";
  conditionValue?: number;
  conditionRestaurantScopeId?: string;
}

export interface Coupon {
  id: string;
  source: "DINVER" | "RESTAURANT";
  restaurantId: string;
  title: string;
  description?: string;
  imageUrl: string;
  type: "REWARD_ITEM" | "PERCENT_DISCOUNT" | "FIXED_DISCOUNT";
  rewardItemId?: string;
  percentOff?: number;
  fixedOff?: number;
  totalLimit?: number;
  perUserLimit: number;
  startsAt: string | null;
  expiresAt: string | null;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "EXPIRED";
  claimedCount: number;
  createdBy: string;
  conditionKind?:
    | "POINTS_AT_LEAST"
    | "REFERRALS_AT_LEAST"
    | "VISITS_DIFFERENT_RESTAURANTS_AT_LEAST"
    | "VISITS_CITIES_AT_LEAST";
  conditionValue?: number;
  conditionRestaurantScopeId?: string;
  createdAt: string;
  updatedAt: string;
  menuItem?: MenuItem;
  restaurant?: Restaurant;
}

export interface CouponStats {
  totalCoupons: number;
  activeCoupons: number;
  totalClaims: number;
  totalRedemptions: number;
}

// Get all system coupons
export const getSystemCoupons = async (): Promise<Coupon[]> => {
  const response = await apiClient.get("/api/sysadmin/coupons");
  return response.data;
};

// Get available coupons for users
export const getAvailableCoupons = async (): Promise<Coupon[]> => {
  const response = await apiClient.get("/api/sysadmin/coupons/available");
  return response.data;
};

// Get coupon statistics
export const getCouponStats = async (): Promise<CouponStats> => {
  const response = await apiClient.get("/api/sysadmin/coupons/stats");
  return response.data;
};

// Create a new coupon
export const createCoupon = async (data: CreateCouponData): Promise<Coupon> => {
  const formData = new FormData();

  formData.append("source", data.source);
  formData.append("restaurantId", data.restaurantId);
  formData.append("title", data.title);
  if (data.description) {
    formData.append("description", data.description);
  }
  if (data.imageFile) {
    formData.append("imageFile", data.imageFile);
  }
  formData.append("type", data.type);
  if (data.rewardItemId) {
    formData.append("rewardItemId", data.rewardItemId);
  }
  if (data.percentOff !== undefined && data.percentOff !== null) {
    formData.append("percentOff", data.percentOff.toString());
  }
  if (data.fixedOff !== undefined && data.fixedOff !== null) {
    formData.append("fixedOff", data.fixedOff.toString());
  }
  if (data.totalLimit !== undefined && data.totalLimit !== null) {
    formData.append("totalLimit", data.totalLimit.toString());
  }
  if (data.startsAt) {
    formData.append("startsAt", data.startsAt);
  }
  if (data.expiresAt) {
    formData.append("expiresAt", data.expiresAt);
  }
  formData.append("status", data.status);

  // Send single condition fields
  if (data.conditionKind) {
    formData.append("conditionKind", data.conditionKind);
  }
  if (data.conditionValue !== undefined && data.conditionValue !== null) {
    formData.append("conditionValue", data.conditionValue.toString());
  }
  if (data.conditionRestaurantScopeId) {
    formData.append(
      "conditionRestaurantScopeId",
      data.conditionRestaurantScopeId
    );
  }

  const response = await apiClient.post("/api/sysadmin/coupons", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// Update an existing coupon
export const updateCoupon = async (
  id: string,
  data: UpdateCouponData
): Promise<Coupon> => {
  const formData = new FormData();

  formData.append("source", data.source);
  formData.append("restaurantId", data.restaurantId);
  formData.append("title", data.title);
  if (data.description) {
    formData.append("description", data.description);
  }
  if (data.imageFile) {
    formData.append("imageFile", data.imageFile);
  }
  formData.append("type", data.type);
  if (data.rewardItemId) {
    formData.append("rewardItemId", data.rewardItemId);
  }
  if (data.percentOff !== undefined && data.percentOff !== null) {
    formData.append("percentOff", data.percentOff.toString());
  }
  if (data.fixedOff !== undefined && data.fixedOff !== null) {
    formData.append("fixedOff", data.fixedOff.toString());
  }
  if (data.totalLimit !== undefined && data.totalLimit !== null) {
    formData.append("totalLimit", data.totalLimit.toString());
  }
  if (data.startsAt) {
    formData.append("startsAt", data.startsAt);
  }
  if (data.expiresAt) {
    formData.append("expiresAt", data.expiresAt);
  }
  formData.append("status", data.status);

  // Send single condition fields
  if (data.conditionKind) {
    formData.append("conditionKind", data.conditionKind);
  }
  if (data.conditionValue !== undefined && data.conditionValue !== null) {
    formData.append("conditionValue", data.conditionValue.toString());
  }
  if (data.conditionRestaurantScopeId) {
    formData.append(
      "conditionRestaurantScopeId",
      data.conditionRestaurantScopeId
    );
  }

  const response = await apiClient.put(
    `/api/sysadmin/coupons/${id}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

// Delete system-wide coupon
export const deleteCoupon = async (id: string): Promise<void> => {
  const response = await apiClient.delete(`/api/sysadmin/coupons/${id}`);
  return response.data;
};
