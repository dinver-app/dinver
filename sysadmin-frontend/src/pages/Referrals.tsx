import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import {
  type Referral,
  type ReferralStats,
  type ReferralsResponse,
  getAllReferrals,
  getReferralStats,
} from "../services/referralService";

const Referrals = () => {
  const { t } = useTranslation();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  useEffect(() => {
    fetchReferralStats();
    fetchReferrals();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
    fetchReferrals();
  }, [statusFilter, debouncedSearchTerm]);

  useEffect(() => {
    fetchReferrals();
  }, [currentPage]);

  const fetchReferralStats = async () => {
    try {
      const stats = await getReferralStats();
      setReferralStats(stats);
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      toast.error("Failed to fetch referral statistics");
    }
  };

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      const response: ReferralsResponse = await getAllReferrals(
        currentPage,
        20,
        statusFilter === "ALL" ? undefined : statusFilter,
        debouncedSearchTerm || undefined
      );
      setReferrals(response.referrals);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      toast.error("Failed to fetch referrals");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "REGISTERED":
        return "bg-blue-100 text-blue-800";

      case "COMPLETED":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return "⏳";
      case "REGISTERED":
        return "✅";

      case "COMPLETED":
        return "🎁";
      default:
        return "❓";
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

  const getProgressBarColor = (percentComplete: number) => {
    if (percentComplete <= 25) return "bg-red-500";
    if (percentComplete <= 50) return "bg-yellow-500";
    if (percentComplete <= 75) return "bg-blue-500";
    return "bg-green-500";
  };

  return (
    <div className="mx-auto p-4">
      <div className="flex flex-col justify-between items-start mb-4">
        <h1 className="page-title">{t("referral_management")}</h1>
        <h3 className="page-subtitle">
          {t("referral_management_description")}
        </h3>
      </div>
      <div className="h-line mb-4"></div>

      {/* Statistics Cards */}
      {referralStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  {t("total_referrals")}
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {referralStats.totalReferrals}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-2xl">⏳</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  {t("pending")}
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {referralStats.statusBreakdown.pending}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  {t("registered")}
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {referralStats.statusBreakdown.registered}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">🎁</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  {t("completed")}
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {referralStats.statusBreakdown.completed}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Stats Row */}
      {referralStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">
                {t("total_rewards_paid")}
              </p>
              <p className="text-3xl font-bold text-green-600">
                {referralStats.totalRewardsPaid} pts
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">
                {t("active_referral_codes")}
              </p>
              <p className="text-3xl font-bold text-blue-600">
                {referralStats.activeCodes}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">
                {t("conversion_rate")}
              </p>
              <p className="text-3xl font-bold text-purple-600">
                {referralStats.conversionRate}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md border mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <h3 className="text-lg font-medium text-gray-900">
              {t("referrals")}
            </h3>
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">
                  {t("status")}:
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="p-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="ALL">{t("all_statuses")}</option>
                  <option value="PENDING">{t("pending")}</option>
                  <option value="REGISTERED">{t("registered")}</option>
                  <option value="COMPLETED">{t("completed")}</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">
                  {t("search")}:
                </label>
                <input
                  type="text"
                  placeholder={t("search_by_name_or_email")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="p-2 border border-gray-300 rounded-md text-sm w-64"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Referrals Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("referrer")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("referred_user")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("code")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("status")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("progress")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("created")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("reward")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2">{t("loading_referrals")}</p>
                    </div>
                  </td>
                </tr>
              ) : referrals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        {t("no_referrals_found")}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {t("no_referrals_match_filters")}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                referrals.map((referral) => (
                  <tr key={referral.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {referral.referrer.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {referral.referrer.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {referral.referredUser.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {referral.referredUser.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {referral.referralCode.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          referral.status
                        )}`}
                      >
                        <span className="mr-1">
                          {getStatusIcon(referral.status)}
                        </span>
                        {referral.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-32">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>{referral.progress.completedSteps}</span>
                          <span>{referral.progress.totalSteps}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getProgressBarColor(
                              referral.progress.percentComplete
                            )}`}
                            style={{
                              width: `${referral.progress.percentComplete}%`,
                            }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {referral.progress.stepName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(referral.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {referral.rewardAmount ? (
                        <div className="text-sm">
                          <span className="font-medium text-green-600">
                            +{referral.rewardAmount} pts
                          </span>
                          {referral.firstVisitRestaurant && (
                            <div className="text-xs text-gray-500">
                              at {referral.firstVisitRestaurant.name}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                {t("page")} {currentPage} {t("of")} {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    currentPage === 1
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                  }`}
                >
                  {t("previous")}
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    currentPage === totalPages
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                  }`}
                >
                  {t("next")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Referrals;
