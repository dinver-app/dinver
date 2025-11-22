import { apiClient } from "./authService";

export interface Experience {
  id: string;
  userId: string;
  restaurantId: string;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  mediaKind: "VIDEO" | "CAROUSEL";
  title: string;
  description?: string;
  foodRating?: number;
  serviceRating?: number;
  atmosphereRating?: number;
  priceRating?: number;
  engagementScore: number;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    profileImage?: string;
  };
  restaurant?: {
    id: string;
    name: string;
    address?: string;
    city?: string;
  };
  media?: ExperienceMedia[];
  likesCount?: number;
  savesCount?: number;
  viewsCount?: number;
}

export interface ExperienceMedia {
  id: string;
  experienceId: string;
  kind: "IMAGE" | "VIDEO";
  storageKey: string;
  cdnUrl: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  orderIndex: number;
  transcodingStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  thumbnails?: string[];
}

export interface ModerationQueue {
  id: string;
  experienceId: string;
  state: "PENDING" | "IN_REVIEW" | "DECIDED" | "ESCALATED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  assignedToId?: string;
  decidedById?: string;
  decision?: "APPROVED" | "REJECTED";
  rejectionReason?: string;
  notes?: string;
  reportCount: number;
  slaDeadline: string;
  slaViolated: boolean;
  createdAt: string;
  experience?: Experience;
  assignedTo?: {
    id: string;
    name: string;
  };
  decidedBy?: {
    id: string;
    name: string;
  };
}

export interface ModerationStats {
  queue: {
    pending: number;
    inReview: number;
    slaViolated: number;
  };
  experiences: {
    totalApproved: number;
    totalRejected: number;
  };
  reports: {
    open: number;
  };
}

export interface ViewStats {
  totalViews: number;
  uniqueUsers: number;
  anonymousViews: number;
  avgDuration: number;
  avgCompletionRate: number;
  sourceBreakdown: {
    [key: string]: number;
  };
}

export interface ExperienceView {
  id: string;
  userId?: string;
  durationMs: number;
  completionRate: number;
  source: string;
  deviceId?: string;
  ipAddress?: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    profileImage?: string;
  };
}

export interface ExperienceLike {
  id: string;
  userId: string;
  experienceId: string;
  cycleId?: string;
  deviceId?: string;
  ipAddress?: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    profileImage?: string;
  };
}

export interface ExperienceSave {
  id: string;
  userId: string;
  restaurantId: string;
  deviceId?: string;
  ipAddress?: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    profileImage?: string;
  };
}

export interface ExperienceReport {
  id: string;
  experienceId: string;
  reporterId: string;
  reasonCode: string;
  description?: string;
  state: "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  reporter?: {
    id: string;
    name: string;
  };
}

export interface ExperienceDetails {
  experience: Experience;
  moderation?: {
    state: string;
    priority: string;
    decision?: string;
    rejectionReason?: string;
    notes?: string;
    assignedTo?: {
      id: string;
      name: string;
    };
    decidedBy?: {
      id: string;
      name: string;
    };
    decidedAt?: string;
    slaDeadline: string;
    slaViolated: boolean;
  };
  viewStats: ViewStats;
  recentViews: ExperienceView[];
  likes: ExperienceLike[];
  saves: ExperienceSave[];
  reports: ExperienceReport[];
}

export interface UserExperienceStats {
  user: {
    id: string;
    name: string;
    email: string;
    profileImage?: string;
  };
  stats: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    approvalRate: number;
  };
  engagement: {
    totalLikes: number;
    totalSaves: number;
    totalViews: number;
    avgLikesPerExperience: number;
    avgViewsPerExperience: number;
  };
  topExperiences: Experience[];
  recentExperiences: Experience[];
}

export interface PaginatedResponse<T> {
  data: T;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const experienceService = {
  /**
   * Get moderation queue
   */
  async getModerationQueue(
    state?: "PENDING" | "IN_REVIEW" | "DECIDED" | "ESCALATED",
    priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT",
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<{ queue: ModerationQueue[] }>> {
    const params = new URLSearchParams();
    if (state) params.append("state", state);
    if (priority) params.append("priority", priority);
    params.append("page", page.toString());
    params.append("limit", limit.toString());

    const response = await apiClient.get(
      `/sysadmin/experiences/moderation/queue?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get moderation statistics
   */
  async getModerationStats(): Promise<{ data: ModerationStats }> {
    const response = await apiClient.get(
      "/sysadmin/experiences/moderation/stats"
    );
    return response.data;
  },

  /**
   * Assign moderator to experience
   */
  async assignModerator(
    experienceId: string,
    moderatorId?: string
  ): Promise<{ data: ModerationQueue }> {
    const response = await apiClient.post(
      `/sysadmin/experiences/moderation/${experienceId}/assign`,
      { moderatorId }
    );
    return response.data;
  },

  /**
   * Approve experience
   */
  async approveExperience(
    experienceId: string,
    notes?: string
  ): Promise<{ data: ModerationQueue }> {
    const response = await apiClient.post(
      `/sysadmin/experiences/moderation/${experienceId}/approve`,
      { notes }
    );
    return response.data;
  },

  /**
   * Reject experience
   */
  async rejectExperience(
    experienceId: string,
    reason: string,
    notes?: string
  ): Promise<{ data: ModerationQueue }> {
    const response = await apiClient.post(
      `/sysadmin/experiences/moderation/${experienceId}/reject`,
      { reason, notes }
    );
    return response.data;
  },

  /**
   * Get detailed information about an experience
   */
  async getExperienceDetails(
    experienceId: string
  ): Promise<{ data: ExperienceDetails }> {
    const response = await apiClient.get(
      `/sysadmin/experiences/${experienceId}/details`
    );
    return response.data;
  },

  /**
   * Get user experience statistics
   */
  async getUserExperienceStats(
    userId: string
  ): Promise<{ data: UserExperienceStats }> {
    const response = await apiClient.get(
      `/sysadmin/experiences/users/${userId}/stats`
    );
    return response.data;
  },

  /**
   * Get reports
   */
  async getReports(
    state?: "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED",
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<{ reports: ExperienceReport[] }>> {
    const params = new URLSearchParams();
    if (state) params.append("state", state);
    params.append("page", page.toString());
    params.append("limit", limit.toString());

    const response = await apiClient.get(
      `/sysadmin/experiences/reports?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Review a report
   */
  async reviewReport(
    reportId: string,
    state: "RESOLVED" | "DISMISSED",
    resolution: string,
    actionTaken:
      | "NONE"
      | "CONTENT_REMOVED"
      | "USER_WARNED"
      | "USER_SUSPENDED"
      | "FALSE_REPORT"
  ): Promise<{ data: ExperienceReport }> {
    const response = await apiClient.post(
      `/sysadmin/experiences/reports/${reportId}/review`,
      { state, resolution, actionTaken }
    );
    return response.data;
  },
};

export default experienceService;
