import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  PlayIcon,
  PhotoIcon,
  ClockIcon,
  EyeIcon,
  HeartIcon,
  BookmarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import experienceService, {
  ModerationQueue,
  ModerationStats,
} from "../services/experienceService";

const Experiences: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [queue, setQueue] = useState<ModerationQueue[]>([]);
  const [selectedState, setSelectedState] = useState<
    "PENDING" | "IN_REVIEW" | "DECIDED" | "ESCALATED"
  >("PENDING");
  const [selectedPriority, setSelectedPriority] = useState<
    "LOW" | "NORMAL" | "HIGH" | "URGENT" | undefined
  >(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedState, selectedPriority, currentPage]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load stats
      const statsResponse = await experienceService.getModerationStats();
      setStats(statsResponse.data);

      // Load queue
      const queueResponse = await experienceService.getModerationQueue(
        selectedState,
        selectedPriority,
        currentPage,
        20
      );
      setQueue(queueResponse.data.queue);
      setTotalPages(queueResponse.pagination.totalPages);
    } catch (error) {
      console.error("Error loading experiences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToMe = async (experienceId: string) => {
    try {
      setActionLoading(experienceId);
      await experienceService.assignModerator(experienceId);
      await loadData();
    } catch (error) {
      console.error("Error assigning moderator:", error);
      alert(t("error_assigning_moderator"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (experienceId: string) => {
    if (!window.confirm(t("confirm_approve_experience"))) return;

    try {
      setActionLoading(experienceId);
      await experienceService.approveExperience(experienceId);
      await loadData();
    } catch (error) {
      console.error("Error approving experience:", error);
      alert(t("error_approving_experience"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (experienceId: string) => {
    const reason = window.prompt(t("enter_rejection_reason"));
    if (!reason) return;

    if (!window.confirm(t("confirm_reject_experience"))) return;

    try {
      setActionLoading(experienceId);
      await experienceService.rejectExperience(experienceId, reason);
      await loadData();
    } catch (error) {
      console.error("Error rejecting experience:", error);
      alert(t("error_rejecting_experience"));
    } finally {
      setActionLoading(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-100 text-red-800 border-red-300";
      case "HIGH":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "NORMAL":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "LOW":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} ${t("minutes_ago")}`;
    if (diffHours < 24) return `${diffHours} ${t("hours_ago")}`;
    return `${diffDays} ${t("days_ago")}`;
  };

  const formatDeadline = (dateString: string) => {
    const deadline = new Date(dateString);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffHours < 0) return t("sla_overdue");
    if (diffHours < 1) return t("less_than_1_hour");
    if (diffHours < 24) return `${diffHours} ${t("hours_remaining")}`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ${t("days_remaining")}`;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("experience_moderation")}
        </h1>
        <p className="text-gray-600 mt-1">{t("manage_experience_posts")}</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t("pending_queue")}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.queue.pending}
                </p>
              </div>
              <ClockIcon className="h-10 w-10 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t("in_review")}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.queue.inReview}
                </p>
              </div>
              <ArrowPathIcon className="h-10 w-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t("sla_violated")}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.queue.slaViolated}
                </p>
              </div>
              <ExclamationTriangleIcon className="h-10 w-10 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t("total_approved")}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.experiences.totalApproved}
                </p>
              </div>
              <CheckCircleIcon className="h-10 w-10 text-green-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("filter_by_state")}
            </label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(
                  e.target.value as
                    | "PENDING"
                    | "IN_REVIEW"
                    | "DECIDED"
                    | "ESCALATED"
                );
                setCurrentPage(1);
              }}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="PENDING">{t("pending")}</option>
              <option value="IN_REVIEW">{t("in_review")}</option>
              <option value="DECIDED">{t("decided")}</option>
              <option value="ESCALATED">{t("escalated")}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("filter_by_priority")}
            </label>
            <select
              value={selectedPriority || ""}
              onChange={(e) => {
                setSelectedPriority(
                  e.target.value
                    ? (e.target.value as "LOW" | "NORMAL" | "HIGH" | "URGENT")
                    : undefined
                );
                setCurrentPage(1);
              }}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t("all_priorities")}</option>
              <option value="LOW">{t("low_priority")}</option>
              <option value="NORMAL">{t("normal_priority")}</option>
              <option value="HIGH">{t("high_priority")}</option>
              <option value="URGENT">{t("urgent_priority")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Queue List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <ArrowPathIcon className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
      ) : queue.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">{t("no_experiences_in_queue")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  {/* Thumbnail */}
                  <div
                    className="flex-shrink-0 w-24 h-32 bg-gray-200 rounded-lg overflow-hidden cursor-pointer"
                    onClick={() =>
                      navigate(`/experiences/${item.experienceId}`)
                    }
                  >
                    {item.experience?.media?.[0]?.cdnUrl ? (
                      <img
                        src={item.experience.media[0].cdnUrl}
                        alt={item.experience.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {item.experience?.mediaKind === "VIDEO" ? (
                          <PlayIcon className="h-8 w-8 text-gray-400" />
                        ) : (
                          <PhotoIcon className="h-8 w-8 text-gray-400" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3
                          className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                          onClick={() =>
                            navigate(`/experiences/${item.experienceId}`)
                          }
                        >
                          {item.experience?.title || t("untitled_experience")}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {item.experience?.author?.name}•{" "}
                          {item.experience?.restaurant?.name}
                        </p>
                      </div>

                      {/* Priority & Status Badges */}
                      <div className="flex gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(
                            item.priority
                          )}`}
                        >
                          {t(`${item.priority.toLowerCase()}_priority`)}
                        </span>
                        {item.experience?.status && (
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              item.experience.status
                            )}`}
                          >
                            {t(item.experience.status.toLowerCase())}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    {item.experience?.description && (
                      <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                        {item.experience.description}
                      </p>
                    )}

                    {/* Ratings */}
                    {item.experience && (
                      <div className="flex gap-4 mb-3 text-sm text-gray-600">
                        {item.experience.foodRating && (
                          <span>
                            {t("food")}: {item.experience.foodRating}/5
                          </span>
                        )}
                        {item.experience.serviceRating && (
                          <span>
                            {t("service")}: {item.experience.serviceRating}/5
                          </span>
                        )}
                        {item.experience.atmosphereRating && (
                          <span>
                            {t("atmosphere")}:{" "}
                            {item.experience.atmosphereRating}/5
                          </span>
                        )}
                      </div>
                    )}

                    {/* Engagement Stats */}
                    <div className="flex gap-6 mb-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <EyeIcon className="h-4 w-4" />
                        <span>{item.experience?.viewsCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <HeartIcon className="h-4 w-4" />
                        <span>{item.experience?.likesCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BookmarkIcon className="h-4 w-4" />
                        <span>{item.experience?.savesCount || 0}</span>
                      </div>
                      {item.reportCount > 0 && (
                        <div className="flex items-center gap-1 text-red-600">
                          <ExclamationTriangleIcon className="h-4 w-4" />
                          <span>
                            {item.reportCount} {t("reports")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        {t("created")}: {formatTimeAgo(item.createdAt)}
                      </span>
                      <span
                        className={
                          item.slaViolated ? "text-red-600 font-medium" : ""
                        }
                      >
                        {t("sla_deadline")}: {formatDeadline(item.slaDeadline)}
                      </span>
                      {item.assignedTo && (
                        <span>
                          {t("assigned_to")}: {item.assignedTo.name}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    {selectedState === "PENDING" && (
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleAssignToMe(item.experienceId)}
                          disabled={
                            actionLoading === item.experienceId ||
                            !!item.assignedToId
                          }
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          {item.assignedToId
                            ? t("assigned")
                            : t("assign_to_me")}
                        </button>
                        <button
                          onClick={() => handleApprove(item.experienceId)}
                          disabled={actionLoading === item.experienceId}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          {t("approve")}
                        </button>
                        <button
                          onClick={() => handleReject(item.experienceId)}
                          disabled={actionLoading === item.experienceId}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          {t("reject")}
                        </button>
                        <button
                          onClick={() =>
                            navigate(`/experiences/${item.experienceId}`)
                          }
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          {t("view_details")}
                        </button>
                      </div>
                    )}

                    {selectedState === "DECIDED" && (
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() =>
                            navigate(`/experiences/${item.experienceId}`)
                          }
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          {t("view_details")}
                        </button>
                        {item.decidedBy && (
                          <span className="text-sm text-gray-600 px-4 py-2">
                            {t("decided_by")}: {item.decidedBy.name}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("previous")}
          </button>
          <span className="text-gray-600">
            {t("page")} {currentPage} {t("of")} {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("next")}
          </button>
        </div>
      )}
    </div>
  );
};

export default Experiences;
