import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  PlayIcon,
  PhotoIcon,
  EyeIcon,
  HeartIcon,
  BookmarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import experienceService, {
  ExperienceDetails as ExperienceDetailsType,
} from "../services/experienceService";

const ExperienceDetails: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<ExperienceDetailsType | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "views" | "likes" | "saves" | "reports"
  >("overview");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadDetails();
    }
  }, [id]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      const response = await experienceService.getExperienceDetails(id!);
      setDetails(response.data);
    } catch (error) {
      console.error("Error loading experience details:", error);
      alert(t("error_loading_details"));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm(t("confirm_approve_experience"))) return;

    try {
      setActionLoading(true);
      await experienceService.approveExperience(id!);
      await loadDetails();
    } catch (error) {
      console.error("Error approving experience:", error);
      alert(t("error_approving_experience"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = window.prompt(t("enter_rejection_reason"));
    if (!reason) return;

    if (!window.confirm(t("confirm_reject_experience"))) return;

    try {
      setActionLoading(true);
      await experienceService.rejectExperience(id!, reason);
      await loadDetails();
    } catch (error) {
      console.error("Error rejecting experience:", error);
      alert(t("error_rejecting_experience"));
    } finally {
      setActionLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  if (loading || !details) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const {
    experience,
    moderation,
    viewStats,
    recentViews,
    likes,
    saves,
    reports,
  } = details;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/experiences")}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          {t("back_to_queue")}
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {t("experience_details")}
        </h1>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Experience Content */}
        <div className="lg:col-span-1 space-y-6">
          {/* Media Gallery */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">{t("media")}</h2>
            <div className="space-y-2">
              {experience.media && experience.media.length > 0 ? (
                experience.media.map((media, index) => (
                  <div
                    key={media.id}
                    className="relative w-full aspect-[9/16] bg-gray-200 rounded-lg overflow-hidden"
                  >
                    {media.kind === "VIDEO" ? (
                      <video
                        src={media.cdnUrl}
                        controls
                        className="w-full h-full object-cover"
                        poster={media.thumbnails?.[0]}
                      />
                    ) : (
                      <img
                        src={media.cdnUrl}
                        alt={`${experience.title} - ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                ))
              ) : (
                <div className="w-full aspect-[9/16] bg-gray-100 rounded-lg flex items-center justify-center">
                  {experience.mediaKind === "VIDEO" ? (
                    <PlayIcon className="h-12 w-12 text-gray-400" />
                  ) : (
                    <PhotoIcon className="h-12 w-12 text-gray-400" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Experience Info */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">
              {t("experience_info")}
            </h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {experience.title}
                </h3>
                {experience.description && (
                  <p className="text-gray-700 mt-2">{experience.description}</p>
                )}
              </div>

              <div className="border-t pt-3">
                <h4 className="font-medium text-gray-700 mb-2">
                  {t("ratings")}
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {experience.foodRating && (
                    <div>
                      <span className="text-gray-600">{t("food")}:</span>{" "}
                      <span className="font-semibold">
                        {experience.foodRating}/5
                      </span>
                    </div>
                  )}
                  {experience.serviceRating && (
                    <div>
                      <span className="text-gray-600">{t("service")}:</span>{" "}
                      <span className="font-semibold">
                        {experience.serviceRating}/5
                      </span>
                    </div>
                  )}
                  {experience.atmosphereRating && (
                    <div>
                      <span className="text-gray-600">{t("atmosphere")}:</span>{" "}
                      <span className="font-semibold">
                        {experience.atmosphereRating}/5
                      </span>
                    </div>
                  )}
                  {experience.priceRating && (
                    <div>
                      <span className="text-gray-600">{t("price")}:</span>{" "}
                      <span className="font-semibold">
                        {experience.priceRating}/5
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-3">
                <h4 className="font-medium text-gray-700 mb-2">
                  {t("author")}
                </h4>
                <div className="flex items-center gap-3">
                  {experience.author?.profileImage ? (
                    <img
                      src={experience.author.profileImage}
                      alt={`${experience.author.firstName} ${experience.author.lastName}`}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <UserIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {experience.author?.firstName}{" "}
                      {experience.author?.lastName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {experience.author?.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    navigate(`/experiences/users/${experience.userId}/stats`)
                  }
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  {t("view_user_stats")} →
                </button>
              </div>

              <div className="border-t pt-3">
                <h4 className="font-medium text-gray-700 mb-2">
                  {t("restaurant")}
                </h4>
                <p className="font-medium text-gray-900">
                  {experience.restaurant?.name}
                </p>
                {experience.restaurant?.address && (
                  <p className="text-sm text-gray-600">
                    {experience.restaurant.address}
                  </p>
                )}
                {experience.restaurant?.city && (
                  <p className="text-sm text-gray-600">
                    {experience.restaurant.city}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Statistics & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Moderation Status */}
          {moderation && (
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">
                {t("moderation_status")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">{t("state")}</p>
                  <p className="font-semibold text-gray-900">
                    {t(moderation.state.toLowerCase())}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t("priority")}</p>
                  <p className="font-semibold text-gray-900">
                    {t(`${moderation.priority.toLowerCase()}_priority`)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t("sla_deadline")}</p>
                  <p
                    className={`font-semibold ${
                      moderation.slaViolated ? "text-red-600" : "text-gray-900"
                    }`}
                  >
                    {new Date(moderation.slaDeadline).toLocaleString()}
                    {moderation.slaViolated && ` (${t("violated")})`}
                  </p>
                </div>
              </div>

              {moderation.decision && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    {moderation.decision === "APPROVED" ? (
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    ) : (
                      <XCircleIcon className="h-6 w-6 text-red-600" />
                    )}
                    <span
                      className={`font-semibold ${
                        moderation.decision === "APPROVED"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {t(moderation.decision.toLowerCase())}
                    </span>
                  </div>
                  {moderation.decidedBy && (
                    <p className="text-sm text-gray-600">
                      {t("decided_by")}: {moderation.decidedBy.firstName}{" "}
                      {moderation.decidedBy.lastName}
                    </p>
                  )}
                  {moderation.decidedAt && (
                    <p className="text-sm text-gray-600">
                      {t("decided_at")}:{" "}
                      {new Date(moderation.decidedAt).toLocaleString()}
                    </p>
                  )}
                  {moderation.rejectionReason && (
                    <p className="text-sm text-gray-700 mt-2">
                      <span className="font-medium">{t("reason")}:</span>{" "}
                      {moderation.rejectionReason}
                    </p>
                  )}
                  {moderation.notes && (
                    <p className="text-sm text-gray-700 mt-2">
                      <span className="font-medium">{t("notes")}:</span>{" "}
                      {moderation.notes}
                    </p>
                  )}
                </div>
              )}

              {experience.status === "PENDING" && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t("approve")}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t("reject")}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Engagement Stats */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">
              {t("engagement_statistics")}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <EyeIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {viewStats.totalViews}
                </p>
                <p className="text-sm text-gray-600">{t("total_views")}</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <UserIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {viewStats.uniqueUsers}
                </p>
                <p className="text-sm text-gray-600">{t("unique_users")}</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <HeartIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {likes.length}
                </p>
                <p className="text-sm text-gray-600">{t("likes_count")}</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <BookmarkIcon className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {saves.length}
                </p>
                <p className="text-sm text-gray-600">{t("saves_count")}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">{t("avg_watch_time")}</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatDuration(viewStats.avgDuration)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  {t("avg_completion_rate")}
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {formatPercentage(viewStats.avgCompletionRate)}
                </p>
              </div>
            </div>

            {/* Source Breakdown */}
            <div className="mt-4 border-t pt-4">
              <h3 className="font-medium text-gray-700 mb-2">
                {t("traffic_sources")}
              </h3>
              <div className="space-y-2">
                {Object.entries(viewStats.sourceBreakdown).map(
                  ([source, count]) => (
                    <div
                      key={source}
                      className="flex justify-between items-center"
                    >
                      <span className="text-sm text-gray-600">
                        {t(source.toLowerCase())}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {count}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`px-6 py-3 font-medium ${
                    activeTab === "overview"
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {t("overview")}
                </button>
                <button
                  onClick={() => setActiveTab("views")}
                  className={`px-6 py-3 font-medium ${
                    activeTab === "views"
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {t("views")} ({recentViews.length})
                </button>
                <button
                  onClick={() => setActiveTab("likes")}
                  className={`px-6 py-3 font-medium ${
                    activeTab === "likes"
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {t("likes")} ({likes.length})
                </button>
                <button
                  onClick={() => setActiveTab("saves")}
                  className={`px-6 py-3 font-medium ${
                    activeTab === "saves"
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {t("saves")} ({saves.length})
                </button>
                <button
                  onClick={() => setActiveTab("reports")}
                  className={`px-6 py-3 font-medium ${
                    activeTab === "reports"
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {t("reports")} ({reports.length})
                </button>
              </nav>
            </div>

            <div className="p-4">
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <p className="text-gray-600">{t("overview_description")}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        {t("engagement_score")}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {experience.engagementScore.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">{t("media_type")}</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {t(experience.mediaKind.toLowerCase())}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Views Tab */}
              {activeTab === "views" && (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {recentViews.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">
                      {t("no_views_yet")}
                    </p>
                  ) : (
                    recentViews.map((view) => (
                      <div
                        key={view.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {view.user ? (
                            <>
                              {view.user.profileImage ? (
                                <img
                                  src={view.user.profileImage}
                                  alt={`${view.user.firstName} ${view.user.lastName}`}
                                  className="w-8 h-8 rounded-full"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                                  <UserIcon className="h-5 w-5 text-gray-600" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-gray-900">
                                  {view.user.firstName} {view.user.lastName}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {t(view.source.toLowerCase())}
                                </p>
                              </div>
                            </>
                          ) : (
                            <div>
                              <p className="font-medium text-gray-900">
                                {t("anonymous_user")}
                              </p>
                              <p className="text-xs text-gray-600">
                                {t(view.source.toLowerCase())}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-gray-900">
                            {formatDuration(view.durationMs)}
                          </p>
                          <p className="text-gray-600">
                            {formatPercentage(view.completionRate)}
                          </p>
                          <div className="flex gap-2 text-xs text-gray-500 mt-1">
                            {view.deviceId && (
                              <span className="flex items-center gap-1">
                                <DevicePhoneMobileIcon className="h-3 w-3" />
                                {view.deviceId.slice(0, 8)}
                              </span>
                            )}
                            {view.ipAddress && (
                              <span className="flex items-center gap-1">
                                <GlobeAltIcon className="h-3 w-3" />
                                {view.ipAddress}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Likes Tab */}
              {activeTab === "likes" && (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {likes.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">
                      {t("no_likes_yet")}
                    </p>
                  ) : (
                    likes.map((like) => (
                      <div
                        key={like.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {like.user?.profileImage ? (
                            <img
                              src={like.user.profileImage}
                              alt={`${like.user.firstName} ${like.user.lastName}`}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                              <UserIcon className="h-5 w-5 text-gray-600" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">
                              {like.user?.firstName} {like.user?.lastName}
                            </p>
                            <p className="text-xs text-gray-600">
                              {new Date(like.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {like.deviceId && (
                            <span className="flex items-center gap-1">
                              <DevicePhoneMobileIcon className="h-3 w-3" />
                              {like.deviceId.slice(0, 8)}
                            </span>
                          )}
                          {like.ipAddress && (
                            <span className="flex items-center gap-1 mt-1">
                              <GlobeAltIcon className="h-3 w-3" />
                              {like.ipAddress}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Saves Tab */}
              {activeTab === "saves" && (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {saves.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">
                      {t("no_saves_yet")}
                    </p>
                  ) : (
                    saves.map((save) => (
                      <div
                        key={save.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {save.user?.profileImage ? (
                            <img
                              src={save.user.profileImage}
                              alt={`${save.user.firstName} ${save.user.lastName}`}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                              <UserIcon className="h-5 w-5 text-gray-600" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">
                              {save.user?.firstName} {save.user?.lastName}
                            </p>
                            <p className="text-xs text-gray-600">
                              {new Date(save.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {save.deviceId && (
                            <span className="flex items-center gap-1">
                              <DevicePhoneMobileIcon className="h-3 w-3" />
                              {save.deviceId.slice(0, 8)}
                            </span>
                          )}
                          {save.ipAddress && (
                            <span className="flex items-center gap-1 mt-1">
                              <GlobeAltIcon className="h-3 w-3" />
                              {save.ipAddress}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Reports Tab */}
              {activeTab === "reports" && (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {reports.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">
                      {t("no_reports")}
                    </p>
                  ) : (
                    reports.map((report) => (
                      <div
                        key={report.id}
                        className="p-4 bg-red-50 border border-red-200 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                            <span className="font-medium text-gray-900">
                              {t(report.reasonCode.toLowerCase())}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              report.state === "OPEN"
                                ? "bg-red-100 text-red-800"
                                : report.state === "RESOLVED"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {t(report.state.toLowerCase())}
                          </span>
                        </div>
                        {report.description && (
                          <p className="text-sm text-gray-700 mb-2">
                            {report.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span>
                            {t("reported_by")}: {report.reporter?.firstName}{" "}
                            {report.reporter?.lastName}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(report.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExperienceDetails;
