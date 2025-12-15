import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  supportTicketService,
  SupportTicket,
  SupportTicketFilters,
  SupportTicketStats,
  TICKET_CATEGORIES,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  TICKET_CATEGORY_COLORS,
} from "../services/supportTicketService";
import toast from "react-hot-toast";

const SupportTickets: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<SupportTicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SupportTicketFilters>({
    page: 1,
    limit: 50,
  });
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 0,
    currentPage: 1,
  });
  const navigate = useNavigate();

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ticketsResponse, statsResponse] = await Promise.all([
        supportTicketService.getTickets(filters),
        supportTicketService.getStats(),
      ]);
      setTickets(ticketsResponse.tickets);
      setStats(statsResponse);
      setPagination({
        totalCount: ticketsResponse.totalCount,
        totalPages: ticketsResponse.totalPages,
        currentPage: ticketsResponse.currentPage,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch tickets"
      );
      toast.error("Failed to fetch tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filters]);

  const handleFilterChange = (
    key: keyof SupportTicketFilters,
    value: string | number | undefined
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleTicketClick = (ticket: SupportTicket) => {
    navigate(`/support-tickets/${ticket.id}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("hr-HR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchTickets}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header with Stats */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Support Tickets
            {stats && stats.needsAttention > 0 && (
              <span className="ml-2 bg-red-100 text-red-800 text-sm px-3 py-1 rounded-full">
                {stats.needsAttention} needs attention
              </span>
            )}
          </h1>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-gray-900">
                {stats.total}
              </div>
              <div className="text-sm text-gray-500">Total Tickets</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg shadow border-l-4 border-yellow-400">
              <div className="text-2xl font-bold text-yellow-800">
                {stats.byStatus.open}
              </div>
              <div className="text-sm text-yellow-600">Open</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg shadow border-l-4 border-blue-400">
              <div className="text-2xl font-bold text-blue-800">
                {stats.byStatus.in_progress}
              </div>
              <div className="text-sm text-blue-600">In Progress</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg shadow border-l-4 border-green-400">
              <div className="text-2xl font-bold text-green-800">
                {stats.byStatus.resolved}
              </div>
              <div className="text-sm text-green-600">Resolved</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-gray-800">
                {stats.recentLast24h}
              </div>
              <div className="text-sm text-gray-500">Last 24h</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status || ""}
                onChange={(e) =>
                  handleFilterChange("status", e.target.value || undefined)
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={filters.category || ""}
                onChange={(e) =>
                  handleFilterChange("category", e.target.value || undefined)
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {Object.entries(TICKET_CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label.en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                placeholder="Search by subject, #number..."
                value={filters.search || ""}
                onChange={(e) =>
                  handleFilterChange("search", e.target.value || undefined)
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) =>
                  handleFilterChange("dateFrom", e.target.value || undefined)
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) =>
                  handleFilterChange("dateTo", e.target.value || undefined)
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tickets.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No tickets found
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className={`hover:bg-gray-50 cursor-pointer ${
                      ticket.status === "open" ? "bg-yellow-50/30" : ""
                    }`}
                    onClick={() => handleTicketClick(ticket)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-blue-600">
                        #{ticket.ticketNumber}
                      </div>
                      {ticket.relatedTicketNumber && (
                        <div className="text-xs text-gray-400">
                          re: #{ticket.relatedTicketNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {ticket.user?.name || "Unknown"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {ticket.user?.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          TICKET_CATEGORY_COLORS[ticket.category] ||
                          "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {TICKET_CATEGORIES[ticket.category]?.en ||
                          ticket.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {ticket.subject}
                      </div>
                      {ticket.relatedRestaurant && (
                        <div className="text-xs text-gray-400">
                          🏪 {ticket.relatedRestaurant.name}
                        </div>
                      )}
                      {ticket.relatedUser && (
                        <div className="text-xs text-gray-400">
                          👤 {ticket.relatedUser.name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          TICKET_STATUS_COLORS[ticket.status] ||
                          "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {TICKET_STATUS_LABELS[ticket.status]?.en ||
                          ticket.status}
                      </span>
                      {ticket.respondedAt && (
                        <div className="text-xs text-gray-400 mt-1">
                          Responded {getRelativeTime(ticket.respondedAt)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getRelativeTime(ticket.createdAt)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatDate(ticket.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTicketClick(ticket);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {ticket.status === "open" ||
                        ticket.status === "in_progress"
                          ? "Respond"
                          : "View"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">
                    {(pagination.currentPage - 1) * (filters.limit || 50) + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(
                      pagination.currentPage * (filters.limit || 50),
                      pagination.totalCount
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium">{pagination.totalCount}</span>{" "}
                  tickets
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {Array.from(
                    { length: Math.min(pagination.totalPages, 5) },
                    (_, i) => {
                      const startPage = Math.max(
                        1,
                        pagination.currentPage - 2
                      );
                      return startPage + i;
                    }
                  )
                    .filter((page) => page <= pagination.totalPages)
                    .map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pagination.currentPage
                            ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportTickets;
