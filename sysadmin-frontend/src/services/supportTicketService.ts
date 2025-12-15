import { apiClient } from "./authService";

export interface SupportTicket {
  id: string;
  ticketNumber: number;
  formattedNumber?: string;
  userId: string;
  category:
    | "question"
    | "bug_report"
    | "report_user"
    | "report_restaurant"
    | "account_issue"
    | "points_issue"
    | "feature_request"
    | "other";
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  adminResponseHr?: string;
  adminResponseEn?: string;
  respondedBy?: string;
  respondedAt?: string;
  relatedUserId?: string;
  relatedRestaurantId?: string;
  relatedTicketNumber?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // Relations
  user?: {
    id: string;
    name: string;
    email: string;
    username?: string;
    phone?: string;
  };
  responder?: {
    id: string;
    user?: {
      id: string;
      name: string;
    };
  };
  relatedUser?: {
    id: string;
    name: string;
    email: string;
    username?: string;
  };
  relatedRestaurant?: {
    id: string;
    name: string;
    address?: string;
    place?: string;
  };
  relatedTickets?: Array<{
    id: string;
    ticketNumber: number;
    subject: string;
    status: string;
    createdAt: string;
  }>;
}

export interface SupportTicketFilters {
  status?: string;
  category?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface SupportTicketsResponse {
  tickets: SupportTicket[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export interface SupportTicketStats {
  total: number;
  byStatus: {
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
  };
  byCategory: Record<string, number>;
  recentLast24h: number;
  needsAttention: number;
}

export interface RespondToTicketData {
  adminResponseHr: string;
  adminResponseEn: string;
  status?: "open" | "in_progress" | "resolved" | "closed";
}

class SupportTicketService {
  /**
   * Get all tickets with filters
   */
  async getTickets(
    filters: SupportTicketFilters = {}
  ): Promise<SupportTicketsResponse> {
    const params = new URLSearchParams();

    if (filters.status) params.append("status", filters.status);
    if (filters.category) params.append("category", filters.category);
    if (filters.search) params.append("search", filters.search);
    if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.append("dateTo", filters.dateTo);
    if (filters.page) params.append("page", filters.page.toString());
    if (filters.limit) params.append("limit", filters.limit.toString());

    const response = await apiClient.get<SupportTicketsResponse>(
      `/api/sysadmin/support/tickets?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Get single ticket by ID
   */
  async getTicketById(id: string): Promise<SupportTicket> {
    const response = await apiClient.get<SupportTicket>(
      `/api/sysadmin/support/tickets/${id}`
    );
    return response.data;
  }

  /**
   * Get ticket statistics
   */
  async getStats(): Promise<SupportTicketStats> {
    const response = await apiClient.get<SupportTicketStats>(
      `/api/sysadmin/support/stats`
    );
    return response.data;
  }

  /**
   * Respond to ticket (bilingual)
   */
  async respondToTicket(
    id: string,
    data: RespondToTicketData
  ): Promise<{ message: string; ticket: SupportTicket }> {
    const response = await apiClient.put<{
      message: string;
      ticket: SupportTicket;
    }>(`/api/sysadmin/support/tickets/${id}/respond`, data);
    return response.data;
  }

  /**
   * Update ticket status only
   */
  async updateStatus(
    id: string,
    status: "open" | "in_progress" | "resolved" | "closed"
  ): Promise<{ message: string; ticket: SupportTicket }> {
    const response = await apiClient.put<{
      message: string;
      ticket: SupportTicket;
    }>(`/api/sysadmin/support/tickets/${id}/status`, { status });
    return response.data;
  }
}

export const supportTicketService = new SupportTicketService();

// Export category labels for UI
export const TICKET_CATEGORIES: Record<string, { hr: string; en: string }> = {
  question: { hr: "Pitanje", en: "Question" },
  bug_report: { hr: "Prijava greške", en: "Bug Report" },
  report_user: { hr: "Prijava korisnika", en: "Report User" },
  report_restaurant: { hr: "Prijava restorana", en: "Report Restaurant" },
  account_issue: { hr: "Problem s računom", en: "Account Issue" },
  points_issue: { hr: "Problem s bodovima", en: "Points Issue" },
  feature_request: { hr: "Prijedlog", en: "Feature Request" },
  other: { hr: "Ostalo", en: "Other" },
};

export const TICKET_STATUS_LABELS: Record<string, { hr: string; en: string }> =
  {
    open: { hr: "Otvoren", en: "Open" },
    in_progress: { hr: "U obradi", en: "In Progress" },
    resolved: { hr: "Riješen", en: "Resolved" },
    closed: { hr: "Zatvoren", en: "Closed" },
  };

export const TICKET_STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

export const TICKET_CATEGORY_COLORS: Record<string, string> = {
  question: "bg-blue-100 text-blue-800",
  bug_report: "bg-red-100 text-red-800",
  report_user: "bg-orange-100 text-orange-800",
  report_restaurant: "bg-orange-100 text-orange-800",
  account_issue: "bg-purple-100 text-purple-800",
  points_issue: "bg-yellow-100 text-yellow-800",
  feature_request: "bg-teal-100 text-teal-800",
  other: "bg-gray-100 text-gray-800",
};
