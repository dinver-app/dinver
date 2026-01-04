import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  HeartIcon,
  BookmarkIcon,
  ChartBarIcon,
  PlayIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import experienceService, {
  UserExperienceStats as UserExperienceStatsType,
} from "../services/experienceService";

const UserExperienceStats: React.FC = () => {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserExperienceStatsType | null>(null);

  useEffect(() => {
    if (userId) {
      loadStats();
    }
  }, [userId]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await experienceService.getUserExperienceStats(userId!);
      setStats(response.data);
    } catch (error) {
      console.error("Error loading user stats:", error);
      alert(t("error_loading_stats"));
    } finally {
      setLoading(false);
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

  if (loading || !stats) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const {
    user,
    stats: userStats,
    engagement,
    topExperiences,
    recentExperiences,
  } = stats;

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
          {t("user_experience_statistics")}
        </h1>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-4">
          {user.profileImage ? (
            <img
              src={user.profileImage}
              alt={`${user.name}`}
              className="w-20 h-20 rounded-full"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
              <UserIcon className="h-10 w-10 text-gray-400" />
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t("total_experiences")}</p>
              <p className="text-3xl font-bold text-gray-900">
                {userStats.total}
              </p>
            </div>
            <ChartBarIcon className="h-10 w-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {t("approved_experiences")}
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {userStats.approved}
              </p>
            </div>
            <CheckCircleIcon className="h-10 w-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {t("rejected_experiences")}
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {userStats.rejected}
              </p>
            </div>
            <XCircleIcon className="h-10 w-10 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {t("pending_experiences")}
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {userStats.pending}
              </p>
            </div>
            <ClockIcon className="h-10 w-10 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Approval Rate & Engagement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Approval Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">{t("approval_rate")}</h3>
          <div className="flex items-center justify-center">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="10"
                  strokeDasharray={`${
                    userStats.approvalRate * 2.51327
                  } 251.327`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-gray-900">
                  {userStats.approvalRate.toFixed(1)}%
                </span>
                <span className="text-sm text-gray-600">{t("approved")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Engagement Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {t("engagement_statistics")}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <EyeIcon className="h-6 w-6 text-blue-600" />
                <span className="font-medium text-gray-700">
                  {t("total_views")}
                </span>
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {engagement.totalViews}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <HeartIcon className="h-6 w-6 text-green-600" />
                <span className="font-medium text-gray-700">
                  {t("total_likes")}
                </span>
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {engagement.totalLikes}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2">
                <BookmarkIcon className="h-6 w-6 text-yellow-600" />
                <span className="font-medium text-gray-700">
                  {t("total_saves")}
                </span>
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {engagement.totalSaves}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Average Engagement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-2">
            {t("avg_likes_per_experience")}
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {engagement.avgLikesPerExperience.toFixed(1)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-2">
            {t("avg_views_per_experience")}
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {engagement.avgViewsPerExperience.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Top Experiences */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">
          {t("top_experiences")} ({topExperiences.length})
        </h3>
        {topExperiences.length === 0 ? (
          <p className="text-gray-600 text-center py-8">
            {t("no_approved_experiences")}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topExperiences.map((exp) => (
              <div
                key={exp.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/experiences/${exp.id}`)}
              >
                <div className="relative w-full aspect-[9/16] bg-gray-200">
                  {exp.media?.[0]?.cdnUrl ? (
                    <img
                      src={exp.media[0].cdnUrl}
                      alt={exp.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {exp.mediaKind === "VIDEO" ? (
                        <PlayIcon className="h-12 w-12 text-gray-400" />
                      ) : (
                        <PhotoIcon className="h-12 w-12 text-gray-400" />
                      )}
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/70 to-transparent p-3">
                    <h4 className="text-white font-semibold text-sm truncate">
                      {exp.title}
                    </h4>
                    <p className="text-white/80 text-xs truncate">
                      {exp.restaurant?.name}
                    </p>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-gray-600">
                        <EyeIcon className="h-4 w-4" />
                        {exp.viewsCount || 0}
                      </span>
                      <span className="flex items-center gap-1 text-gray-600">
                        <HeartIcon className="h-4 w-4" />
                        {exp.likesCount || 0}
                      </span>
                      <span className="flex items-center gap-1 text-gray-600">
                        <BookmarkIcon className="h-4 w-4" />
                        {exp.savesCount || 0}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                        exp.status
                      )}`}
                    >
                      {t(exp.status.toLowerCase())}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Experiences */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">
          {t("recent_experiences")} ({recentExperiences.length})
        </h3>
        {recentExperiences.length === 0 ? (
          <p className="text-gray-600 text-center py-8">
            {t("no_experiences_yet")}
          </p>
        ) : (
          <div className="space-y-3">
            {recentExperiences.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/experiences/${exp.id}`)}
              >
                <div className="flex-shrink-0 w-20 h-28 bg-gray-200 rounded-lg overflow-hidden">
                  {exp.media?.[0]?.cdnUrl ? (
                    <img
                      src={exp.media[0].cdnUrl}
                      alt={exp.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {exp.mediaKind === "VIDEO" ? (
                        <PlayIcon className="h-6 w-6 text-gray-400" />
                      ) : (
                        <PhotoIcon className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {exp.title}
                    </h4>
                    <span
                      className={`ml-2 px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getStatusColor(
                        exp.status
                      )}`}
                    >
                      {t(exp.status.toLowerCase())}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate mb-2">
                    {exp.restaurant?.name}
                  </p>
                  {exp.description && (
                    <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                      {exp.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <EyeIcon className="h-4 w-4" />
                      {exp.viewsCount || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <HeartIcon className="h-4 w-4" />
                      {exp.likesCount || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookmarkIcon className="h-4 w-4" />
                      {exp.savesCount || 0}
                    </span>
                    <span className="text-gray-500">
                      {new Date(exp.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserExperienceStats;
