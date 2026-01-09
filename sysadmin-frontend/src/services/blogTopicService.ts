import { apiClient } from "./authService";

// Blog Topic interfaces
// Blog translation interface (for multi-language support)
export interface BlogTranslation {
  id: string;
  blogId: string;
  language: "hr-HR" | "en-US";
  title: string;
  slug: string;
  content?: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  tags?: string[];
  readingTimeMinutes?: number;
}

// Blog interface (shared data across all translations)
export interface Blog {
  id: string;
  authorId: string;
  featuredImage?: string;
  featuredImageUrl?: string;
  status: string;
  publishedAt?: string;
  category?: string;
  viewCount: number;
  likesCount: number;
  dislikesCount: number;
  blogTopicId?: string;
  translations?: BlogTranslation[];
  // Legacy fields
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  language?: string;
}

// Blog version for UI (HR or EN version with all data flattened)
export interface BlogVersion {
  id: string;
  title: string;
  slug: string;
  status: string;
  content?: string;
  excerpt?: string;
  featuredImage?: string;
  featuredImageUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  tags?: string[];
  category?: string;
  language?: string;
}

export interface BlogTopic {
  id: string;
  title: string;
  topicType: string;
  description?: string;
  targetKeywords: string[];
  targetAudience?: string;
  primaryLanguage: "hr-HR" | "en-US";
  generateBothLanguages: boolean;
  scheduledFor?: string;
  priority: number;
  status: string;
  currentStage?: string;
  blogIdHr?: string;
  blogIdEn?: string;
  linkedInPostHr?: string;
  linkedInPostEn?: string;
  lastError?: string;
  retryCount: number;
  maxRetries: number;
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  creator?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  approver?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  // NEW: Single blog with multiple translations
  blog?: Blog;
  // Generated from blog.translations for backward compatibility
  blogHr?: BlogVersion;
  blogEn?: BlogVersion;
  readingTimeMinutes?: number;
  generationLogs?: BlogGenerationLog[];
  checkpointData?: Record<string, unknown>;
  completedStages?: string[];
  lastCheckpointAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogGenerationLog {
  id: string;
  blogTopicId: string;
  stage: string;
  agentName: string;
  inputData?: object;
  outputData?: object;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  durationMs?: number;
  modelUsed?: string;
  status: "started" | "completed" | "failed";
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface BlogTopicStats {
  statusCounts: Record<string, number>;
  tokenUsage: {
    totalTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
    avgDurationMs?: number;
  };
  recentTopics: BlogTopic[];
}

export interface TokenUsageReport {
  byStage: Array<{
    stage: string;
    totalTokens: string;
    promptTokens: string;
    completionTokens: string;
    count: string;
    avgDurationMs: string;
  }>;
  byModel: Array<{
    modelUsed: string;
    totalTokens: string;
    count: string;
  }>;
}

// API functions
export const getTopics = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  topicType?: string;
}): Promise<{ topics: BlogTopic[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> => {
  const response = await apiClient.get("/api/sysadmin/blog-topics", { params });
  return response.data;
};

export const getTopic = async (id: string): Promise<BlogTopic> => {
  const response = await apiClient.get(`/api/sysadmin/blog-topics/${id}`);
  return response.data;
};

export const createTopic = async (data: Partial<BlogTopic>): Promise<BlogTopic> => {
  const response = await apiClient.post("/api/sysadmin/blog-topics", data);
  return response.data;
};

export const updateTopic = async (id: string, data: Partial<BlogTopic>): Promise<BlogTopic> => {
  const response = await apiClient.put(`/api/sysadmin/blog-topics/${id}`, data);
  return response.data;
};

export const deleteTopic = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/sysadmin/blog-topics/${id}`);
};

export const processTopic = async (id: string): Promise<{ message: string; topic: BlogTopic }> => {
  const response = await apiClient.post(`/api/sysadmin/blog-topics/${id}/process`);
  return response.data;
};

export const retryTopic = async (id: string): Promise<{ message: string; topic: BlogTopic }> => {
  const response = await apiClient.post(`/api/sysadmin/blog-topics/${id}/retry`);
  return response.data;
};

export const fullResetTopic = async (id: string): Promise<{ message: string; topic: BlogTopic }> => {
  const response = await apiClient.post(`/api/sysadmin/blog-topics/${id}/full-reset`);
  return response.data;
};

export const approveTopic = async (id: string): Promise<{ message: string; topic: BlogTopic }> => {
  const response = await apiClient.post(`/api/sysadmin/blog-topics/${id}/approve`);
  return response.data;
};

export const rejectTopic = async (id: string, feedback?: string): Promise<{ message: string; topic: BlogTopic }> => {
  const response = await apiClient.post(`/api/sysadmin/blog-topics/${id}/reject`, { feedback });
  return response.data;
};

export const getTopicLogs = async (id: string): Promise<BlogGenerationLog[]> => {
  const response = await apiClient.get(`/api/sysadmin/blog-topics/${id}/logs`);
  return response.data;
};

export const getStats = async (): Promise<BlogTopicStats> => {
  const response = await apiClient.get("/api/sysadmin/blog-topics/stats");
  return response.data;
};

export const getTokenUsage = async (startDate?: string, endDate?: string): Promise<TokenUsageReport> => {
  const response = await apiClient.get("/api/sysadmin/blog-topics/token-usage", {
    params: { startDate, endDate },
  });
  return response.data;
};

// AI-generated topic interface
export interface GeneratedTopicDetails {
  title: string;
  titleEn?: string;
  topicType: string;
  description: string;
  targetKeywords: string[];
  targetAudience: string;
  primaryLanguage: "hr-HR" | "en-US";
  generateBothLanguages: boolean;
  priority: number;
  suggestedAngle?: string;
  estimatedValue?: string;
}

export const generateTopicFromPrompt = async (prompt: string): Promise<{ success: boolean; topic: GeneratedTopicDetails }> => {
  const response = await apiClient.post("/api/sysadmin/blog-topics/generate-from-prompt", { prompt });
  return response.data;
};

// Topic types for dropdown
export const TOPIC_TYPES = [
  { value: "restaurant_guide", label: "Restaurant Guide", labelHr: "Vodič za restorane" },
  { value: "food_trend", label: "Food Trend", labelHr: "Gastronomski trend" },
  { value: "seasonal", label: "Seasonal", labelHr: "Sezonski sadržaj" },
  { value: "cuisine_spotlight", label: "Cuisine Spotlight", labelHr: "Kuhinja u fokusu" },
  { value: "neighborhood_guide", label: "Neighborhood Guide", labelHr: "Vodič po četvrti" },
  { value: "tips", label: "Tips & How-To", labelHr: "Savjeti i upute" },
  { value: "industry_news", label: "Industry News", labelHr: "Novosti iz industrije" },
  { value: "dinver_feature", label: "Dinver Feature", labelHr: "Dinver funkcionalnost" },
];

// Status colors for badges
export const STATUS_COLORS: Record<string, string> = {
  queued: "bg-gray-100 text-gray-800",
  processing: "bg-blue-100 text-blue-800",
  research: "bg-blue-100 text-blue-800",
  outline: "bg-blue-100 text-blue-800",
  writing: "bg-yellow-100 text-yellow-800",
  editing: "bg-yellow-100 text-yellow-800",
  seo: "bg-purple-100 text-purple-800",
  image: "bg-pink-100 text-pink-800",
  linkedin: "bg-indigo-100 text-indigo-800",
  review_ready: "bg-green-100 text-green-800",
  approved: "bg-green-200 text-green-900",
  published: "bg-green-500 text-white",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-200 text-gray-600",
};
