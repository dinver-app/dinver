import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  leaderboardCycleService,
  LeaderboardCycle,
  CycleFilters,
} from "../services/leaderboardCycleService";
import toast from "react-hot-toast";
import {
  PlusIcon,
  EyeIcon,
  PencilIcon,
  XMarkIcon,
  CheckCircleIcon,
  PlayIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import CreateCycleModal from "../components/modals/CreateCycleModal";
import EditCycleModal from "../components/modals/EditCycleModal";

const LeaderboardCycles: React.FC = () => {
  const { t } = useTranslation();
  const [cycles, setCycles] = useState<LeaderboardCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CycleFilters>({
    page: 1,
    limit: 20,
  });
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 0,
    currentPage: 1,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<LeaderboardCycle | null>(
    null
  );
  const [isTriggering, setIsTriggering] = useState(false);
  const navigate = useNavigate();

  const refreshCycles = async () => {
    try {
      const response = await leaderboardCycleService.getCycles(filters);
      setCycles(response.cycles);
      setPagination({
        totalCount: response.pagination.total,
        totalPages: response.pagination.totalPages,
        currentPage: response.pagination.page,
      });
    } catch (err) {
      console.error("Error refreshing cycles:", err);
    }
  };

  const fetchCycles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await leaderboardCycleService.getCycles(filters);
      setCycles(response.cycles);
      setPagination({
        totalCount: response.pagination.total,
        totalPages: response.pagination.totalPages,
        currentPage: response.pagination.page,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch cycles");
      toast.error(t("failed_to_create_cycle"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCycles();
  }, [filters]);

  const handleFilterChange = (key: keyof CycleFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleCycleClick = async (cycle: LeaderboardCycle) => {
    navigate(`/leaderboard-cycles/${cycle.id}`);
  };

  const handleCancelCycle = async (cycleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t("are_you_sure_cancel_cycle"))) {
      try {
        await leaderboardCycleService.cancelCycle(cycleId);
        toast.success(t("cycle_cancelled_successfully"));
        fetchCycles();
      } catch (err) {
        toast.error(t("failed_to_cancel_cycle"));
      }
    }
  };

  const handleCompleteCycle = async (cycleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t("are_you_sure_complete_cycle"))) {
      try {
        const result = await leaderboardCycleService.completeCycle(cycleId);
        toast.success(
          `${t("cycle_completed_successfully")} - ${result.winners} ${t(
            "winners"
          )}`
        );
        fetchCycles();
      } catch (err) {
        toast.error(t("failed_to_complete_cycle"));
      }
    }
  };

  const handleEditCycle = (cycle: LeaderboardCycle, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCycle(cycle);
    setShowEditModal(true);
  };

  const handleCycleCreated = () => {
    refreshCycles();
  };

  const handleCycleUpdated = () => {
    refreshCycles();
  };

  const handleTriggerCycleCheck = async () => {
    try {
      setIsTriggering(true);
      const result = await leaderboardCycleService.triggerCycleCheck();

      toast.success(result.message);

      // Refresh cycles to show any status changes
      await refreshCycles();

      // Show stats if available
      if (result.stats) {
        console.log("Cycle check stats:", result.stats);
      }
    } catch (error: any) {
      console.error("Error triggering cycle check:", error);
      toast.error(
        error.response?.data?.error || "Failed to trigger cycle check"
      );
    } finally {
      setIsTriggering(false);
    }
  };

  const handleDeleteCycle = async (cycle: LeaderboardCycle) => {
    if (cycle.status !== "cancelled") {
      toast.error("Only cancelled cycles can be deleted");
      return;
    }

    if (!window.confirm(t("are_you_sure_delete_cycle"))) {
      return;
    }

    try {
      await leaderboardCycleService.deleteCycle(cycle.id);
      toast.success("Cycle deleted successfully");

      // Refresh cycles without loading state
      await refreshCycles();
    } catch (error: any) {
      console.error("Error deleting cycle:", error);
      toast.error(error.response?.data?.error || "Failed to delete cycle");
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case "scheduled":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case "active":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "completed":
        return `${baseClasses} bg-gray-100 text-gray-800`;
      case "cancelled":
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("hr-HR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Zagreb",
    });
  };

  const getActiveCount = () => {
    return cycles.filter((c) => c.status === "active").length;
  };

  const getScheduledCount = () => {
    return cycles.filter((c) => c.status === "scheduled").length;
  };

  const getCompletedCount = () => {
    return cycles.filter((c) => c.status === "completed").length;
  };

  if (loading) {
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
          onClick={fetchCycles}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("leaderboard_cycle_management")}
            {getActiveCount() > 0 && (
              <span className="ml-2 bg-green-100 text-green-800 text-sm px-2 py-1 rounded-full">
                {getActiveCount()} {t("active")}
              </span>
            )}
          </h1>
          <div className="flex space-x-3">
            <button
              onClick={handleTriggerCycleCheck}
              disabled={isTriggering}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              {isTriggering ? t("checking") : t("trigger_check")}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              {t("create_cycle")}
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">
              {cycles.length}
            </div>
            <div className="text-sm text-gray-500">{t("all_cycles")}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">
              {getActiveCount()}
            </div>
            <div className="text-sm text-gray-500">{t("active_cycles")}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">
              {getScheduledCount()}
            </div>
            <div className="text-sm text-gray-500">{t("scheduled_cycles")}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-600">
              {getCompletedCount()}
            </div>
            <div className="text-sm text-gray-500">{t("completed_cycles")}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("filter_by_status")}
              </label>
              <select
                value={filters.status || ""}
                onChange={(e) =>
                  handleFilterChange("status", e.target.value || undefined)
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t("all_cycles")}</option>
                <option value="scheduled">{t("scheduled")}</option>
                <option value="active">{t("active")}</option>
                <option value="completed">{t("completed")}</option>
                <option value="cancelled">{t("cancelled")}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("start_date")}
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
                {t("end_date")}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("search_cycles")}
              </label>
              <input
                type="text"
                placeholder={t("search_cycles")}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cycles Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("cycle_name")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("cycle_status")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("start_date")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("end_date")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("participant_count")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cycles.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center">
                      <div className="text-lg font-medium mb-2">
                        {t("no_cycles_found")}
                      </div>
                      <div className="text-sm mb-4">
                        {t("create_your_first_cycle")}
                      </div>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        {t("create_cycle")}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                cycles.map((cycle) => (
                  <tr
                    key={cycle.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleCycleClick(cycle)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {cycle.headerImageUrl && (
                          <img
                            src={cycle.headerImageUrl}
                            alt="Cycle header"
                            className="h-10 w-10 object-cover rounded mr-3"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {cycle.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(cycle.status)}>
                        {t(cycle.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(cycle.startDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(cycle.endDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {cycle.participantCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCycleClick(cycle);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title={t("view_participants")}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        {(cycle.status === "scheduled" ||
                          cycle.status === "active") && (
                          <button
                            onClick={(e) => handleEditCycle(cycle, e)}
                            className="text-yellow-600 hover:text-yellow-900"
                            title={t("edit_cycle")}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        )}
                        {cycle.status === "active" && (
                          <button
                            onClick={(e) => handleCompleteCycle(cycle.id, e)}
                            className="text-green-600 hover:text-green-900"
                            title={t("complete_cycle")}
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                          </button>
                        )}
                        {(cycle.status === "scheduled" ||
                          cycle.status === "active") && (
                          <button
                            onClick={(e) => handleCancelCycle(cycle.id, e)}
                            className="text-red-600 hover:text-red-900"
                            title={t("cancel_cycle")}
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        )}
                        {cycle.status === "cancelled" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCycle(cycle);
                            }}
                            className="text-red-600 hover:text-red-900"
                            title={t("delete_cycle")}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
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
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">
                    {(pagination.currentPage - 1) * (filters.limit || 20) + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(
                      pagination.currentPage * (filters.limit || 20),
                      pagination.totalCount
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium">{pagination.totalCount}</span>{" "}
                  results
                </p>
              </div>
              <div>
                <nav
                  className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                  aria-label="Pagination"
                >
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {Array.from(
                    { length: pagination.totalPages },
                    (_, i) => i + 1
                  )
                    .filter(
                      (page) =>
                        page === 1 ||
                        page === pagination.totalPages ||
                        Math.abs(page - pagination.currentPage) <= 2
                    )
                    .map((page, index, array) => (
                      <React.Fragment key={page}>
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            ...
                          </span>
                        )}
                        <button
                          onClick={() => handlePageChange(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === pagination.currentPage
                              ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                              : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
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

      {/* Modals */}
      <CreateCycleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCycleCreated={handleCycleCreated}
      />

      <EditCycleModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedCycle(null);
        }}
        onCycleUpdated={handleCycleUpdated}
        cycle={selectedCycle}
      />
    </div>
  );
};

export default LeaderboardCycles;
