import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  supportTicketService,
  SupportTicket,
  TICKET_CATEGORIES,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  TICKET_CATEGORY_COLORS,
} from "../services/supportTicketService";
import toast from "react-hot-toast";

const SupportTicketDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Response form
  const [responseHr, setResponseHr] = useState("");
  const [responseEn, setResponseEn] = useState("");
  const [newStatus, setNewStatus] = useState<
    "open" | "in_progress" | "resolved" | "closed"
  >("resolved");

  const load = async () => {
    try {
      setLoading(true);
      if (!id) return;
      const t = await supportTicketService.getTicketById(id);
      setTicket(t);
      // Pre-fill existing responses if any
      if (t.adminResponseHr) setResponseHr(t.adminResponseHr);
      if (t.adminResponseEn) setResponseEn(t.adminResponseEn);
      if (t.status) setNewStatus(t.status);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load ticket");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleSubmitResponse = async () => {
    if (!ticket) return;

    if (!responseHr.trim() && !responseEn.trim()) {
      toast.error("Please enter a response in at least one language");
      return;
    }

    try {
      setSubmitting(true);
      await supportTicketService.respondToTicket(ticket.id, {
        adminResponseHr: responseHr,
        adminResponseEn: responseEn,
        status: newStatus,
      });
      toast.success("Response sent successfully");
      load();
    } catch (err) {
      toast.error("Failed to send response");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (
    status: "open" | "in_progress" | "resolved" | "closed"
  ) => {
    if (!ticket) return;
    try {
      await supportTicketService.updateStatus(ticket.id, status);
      toast.success("Status updated");
      load();
    } catch (err) {
      toast.error("Failed to update status");
    }
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-4" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-32 bg-gray-100 rounded" />
              <div className="h-48 bg-gray-100 rounded" />
            </div>
            <div className="h-64 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-6">
        <p className="text-red-600 mb-4">{error || "Ticket not found"}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Back
        </button>
      </div>
    );
  }

  const isResolved =
    ticket.status === "resolved" || ticket.status === "closed";

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Ticket #{ticket.ticketNumber}
            </h1>
            <p className="text-gray-500">{ticket.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              TICKET_CATEGORY_COLORS[ticket.category] ||
              "bg-gray-100 text-gray-800"
            }`}
          >
            {TICKET_CATEGORIES[ticket.category]?.en || ticket.category}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              TICKET_STATUS_COLORS[ticket.status] ||
              "bg-gray-100 text-gray-800"
            }`}
          >
            {TICKET_STATUS_LABELS[ticket.status]?.en || ticket.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Message */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-blue-500">💬</span>
              User Message
            </h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-800 whitespace-pre-wrap">
                {ticket.message}
              </p>
            </div>
            <div className="mt-3 text-sm text-gray-500">
              Submitted {formatDate(ticket.createdAt)}
            </div>
          </div>

          {/* Related Info */}
          {(ticket.relatedRestaurant || ticket.relatedUser) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Related Information</h2>
              {ticket.relatedRestaurant && (
                <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg mb-3">
                  <span className="text-2xl">🏪</span>
                  <div>
                    <div className="font-medium">
                      {ticket.relatedRestaurant.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {ticket.relatedRestaurant.address},{" "}
                      {ticket.relatedRestaurant.place}
                    </div>
                  </div>
                </div>
              )}
              {ticket.relatedUser && (
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <span className="text-2xl">👤</span>
                  <div>
                    <div className="font-medium">{ticket.relatedUser.name}</div>
                    <div className="text-sm text-gray-500">
                      {ticket.relatedUser.email}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Existing Response */}
          {(ticket.adminResponseHr || ticket.adminResponseEn) && (
            <div className="bg-green-50 rounded-lg shadow p-6 border-l-4 border-green-500">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>✅</span>
                Admin Response
              </h2>
              {ticket.adminResponseHr && (
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-500 mb-1">
                    🇭🇷 Croatian
                  </div>
                  <p className="text-gray-800 whitespace-pre-wrap">
                    {ticket.adminResponseHr}
                  </p>
                </div>
              )}
              {ticket.adminResponseEn && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">
                    🇬🇧 English
                  </div>
                  <p className="text-gray-800 whitespace-pre-wrap">
                    {ticket.adminResponseEn}
                  </p>
                </div>
              )}
              {ticket.respondedAt && (
                <div className="mt-3 text-sm text-gray-500">
                  Responded {formatDate(ticket.respondedAt)}
                  {ticket.responder?.user?.name &&
                    ` by ${ticket.responder.user.name}`}
                </div>
              )}
            </div>
          )}

          {/* Response Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">
              {isResolved ? "Update Response" : "Send Response"}
            </h2>

            <div className="space-y-4">
              {/* Croatian Response */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="mr-2">🇭🇷</span>
                  Response in Croatian
                </label>
                <textarea
                  value={responseHr}
                  onChange={(e) => setResponseHr(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Unesite odgovor na hrvatskom..."
                />
              </div>

              {/* English Response */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="mr-2">🇬🇧</span>
                  Response in English
                </label>
                <textarea
                  value={responseEn}
                  onChange={(e) => setResponseEn(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter response in English..."
                />
              </div>

              {/* Status Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Set Status
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(
                    ["open", "in_progress", "resolved", "closed"] as const
                  ).map((status) => (
                    <button
                      key={status}
                      onClick={() => setNewStatus(status)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        newStatus === status
                          ? status === "open"
                            ? "bg-yellow-500 text-white"
                            : status === "in_progress"
                            ? "bg-blue-500 text-white"
                            : status === "resolved"
                            ? "bg-green-500 text-white"
                            : "bg-gray-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {TICKET_STATUS_LABELS[status]?.en || status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => navigate(-1)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitResponse}
                  disabled={
                    submitting || (!responseHr.trim() && !responseEn.trim())
                  }
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Sending..." : "Send Response"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* User Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">User Information</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-500">Name</div>
                <div className="font-medium">{ticket.user?.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Email</div>
                <div className="font-medium text-blue-600">
                  <a href={`mailto:${ticket.user?.email}`}>
                    {ticket.user?.email}
                  </a>
                </div>
              </div>
              {ticket.user?.phone && (
                <div>
                  <div className="text-sm text-gray-500">Phone</div>
                  <div className="font-medium">{ticket.user.phone}</div>
                </div>
              )}
              {ticket.user?.username && (
                <div>
                  <div className="text-sm text-gray-500">Username</div>
                  <div className="font-medium">@{ticket.user.username}</div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => handleStatusChange("in_progress")}
                disabled={ticket.status === "in_progress"}
                className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Mark In Progress
              </button>
              <button
                onClick={() => handleStatusChange("resolved")}
                disabled={ticket.status === "resolved"}
                className="w-full px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Mark Resolved
              </button>
              <button
                onClick={() => handleStatusChange("closed")}
                disabled={ticket.status === "closed"}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Close Ticket
              </button>
            </div>
          </div>

          {/* Previous Tickets from User */}
          {ticket.relatedTickets && ticket.relatedTickets.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">
                Previous Tickets ({ticket.relatedTickets.length})
              </h2>
              <div className="space-y-2">
                {ticket.relatedTickets.map((rt) => (
                  <Link
                    key={rt.id}
                    to={`/support-tickets/${rt.id}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-600">
                        #{rt.ticketNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          TICKET_STATUS_COLORS[rt.status] ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {rt.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 truncate mt-1">
                      {rt.subject}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {formatDate(rt.createdAt)}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Ticket Metadata */}
          {ticket.metadata && Object.keys(ticket.metadata).length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Device Info</h2>
              <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-auto">
                {JSON.stringify(ticket.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportTicketDetails;
