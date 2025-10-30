import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  leaderboardCycleService,
  LeaderboardCycle,
  CycleParticipant,
  CycleWinner,
} from "../services/leaderboardCycleService";
import toast from "react-hot-toast";
import {
  ArrowLeftIcon,
  PencilIcon,
  XMarkIcon,
  CheckCircleIcon,
  UserGroupIcon,
  TrophyIcon,
  CalendarIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import EditCycleModal from "../components/modals/EditCycleModal";

const LeaderboardCycleDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [cycle, setCycle] = useState<LeaderboardCycle | null>(null);
  const [participants, setParticipants] = useState<CycleParticipant[]>([]);
  const [winners, setWinners] = useState<CycleWinner[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [loadingWinners, setLoadingWinners] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"participants" | "winners">(
    "participants"
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [countdownText, setCountdownText] = useState<string>("");

  const loadCycle = async () => {
    try {
      setLoading(true);
      if (!id) return;
      const cycleData = await leaderboardCycleService.getCycleById(id);
      setCycle(cycleData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load cycle");
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async () => {
    if (!id) return;
    try {
      setLoadingParticipants(true);
      const response = await leaderboardCycleService.getParticipants(
        id,
        1,
        100
      );
      setParticipants(response.participants);
    } catch (e) {
      console.error("Failed to load participants:", e);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const loadWinners = async () => {
    if (!id) return;
    try {
      setLoadingWinners(true);
      const response = await leaderboardCycleService.getWinners(id);
      setWinners(response.winners);
    } catch (e) {
      console.error("Failed to load winners:", e);
    } finally {
      setLoadingWinners(false);
    }
  };

  useEffect(() => {
    loadCycle();
  }, [id]);

  useEffect(() => {
    if (cycle) {
      loadParticipants();
      if (cycle.status === "completed") {
        loadWinners();
      }
    }
  }, [cycle]);

  // Live countdown to cycle end
  useEffect(() => {
    if (!cycle || cycle.status !== "active") return;

    const endTime = new Date(cycle.endDate).getTime();

    const formatTwo = (n: number) => String(Math.max(0, n)).padStart(2, "0");

    const compute = () => {
      const now = Date.now();
      let diff = Math.max(0, endTime - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      diff -= days * 24 * 60 * 60 * 1000;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      diff -= hours * 60 * 60 * 1000;
      const minutes = Math.floor(diff / (1000 * 60));
      diff -= minutes * 60 * 1000;
      const seconds = Math.floor(diff / 1000);

      let text = "";
      if (days >= 1) {
        text = `${formatTwo(days)} days ${formatTwo(hours)} hours`;
      } else if (hours >= 1) {
        text = `${formatTwo(hours)} hours ${formatTwo(minutes)} minutes`;
      } else if (minutes >= 1) {
        text = `${formatTwo(minutes)} minutes ${formatTwo(seconds)} seconds`;
      } else {
        text = `${formatTwo(seconds)} seconds`;
      }

      setCountdownText(text);
    };

    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [cycle]);

  const handleCancelCycle = async () => {
    if (!cycle || !window.confirm(t("are_you_sure_cancel_cycle"))) return;

    try {
      await leaderboardCycleService.cancelCycle(cycle.id);
      toast.success(t("cycle_cancelled_successfully"));
      loadCycle();
    } catch (err) {
      toast.error(t("failed_to_cancel_cycle"));
    }
  };

  const handleCompleteCycle = async () => {
    if (!cycle || !window.confirm(t("are_you_sure_complete_cycle"))) return;

    try {
      const result = await leaderboardCycleService.completeCycle(cycle.id);
      toast.success(
        `${t("cycle_completed_successfully")} - ${result.winners} ${t(
          "winners"
        )}`
      );
      loadCycle();
      loadWinners();
    } catch (err) {
      toast.error(t("failed_to_complete_cycle"));
    }
  };

  const handleCycleUpdated = () => {
    loadCycle();
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-3 py-1 rounded-full text-sm font-medium";
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
    // Parse as timezone-naive by removing 'Z' and treating as local
    const date = new Date(dateString.replace("Z", ""));
    return date.toLocaleString("hr-HR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateProgress = () => {
    if (!cycle) return 0;
    const now = new Date().getTime();
    const start = new Date(cycle.startDate).getTime();
    const end = new Date(cycle.endDate).getTime();

    if (now < start) return 0;
    if (now > end) return 100;

    return Math.round(((now - start) / (end - start)) * 100);
  };

  // getRemainingDays replaced by live countdown

  const getRankOrdinal = (rank: number) => {
    const j = rank % 10;
    const k = rank % 100;
    if (j === 1 && k !== 11) {
      return rank + "st";
    }
    if (j === 2 && k !== 12) {
      return rank + "nd";
    }
    if (j === 3 && k !== 13) {
      return rank + "rd";
    }
    return rank + "th";
  };

  const formatPoints = (points?: number | string) => {
    if (!points) return "-";

    // Convert to number if it's a string
    const numPoints = typeof points === "string" ? parseFloat(points) : points;

    // Check if it's a valid number
    if (isNaN(numPoints) || !isFinite(numPoints)) return "-";

    return numPoints.toFixed(2);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse h-6 w-40 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-gray-100 rounded" />
          <div className="space-y-3">
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !cycle) {
    return (
      <div className="p-6">
        <p className="text-red-600 mb-4">{error || "Cycle not found"}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-200 rounded"
        >
          Back
        </button>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{cycle.name}</h1>
              <div className="flex items-center mt-2">
                <span className={getStatusBadge(cycle.status)}>
                  {t(cycle.status)}
                </span>
                {cycle.status === "active" && countdownText && (
                  <span className="ml-3 text-sm text-gray-600">
                    <ClockIcon className="h-4 w-4 inline mr-1" />
                    {countdownText}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            {(cycle.status === "scheduled" || cycle.status === "active") && (
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                {t("edit_cycle")}
              </button>
            )}
            {cycle.status === "active" && (
              <button
                onClick={handleCompleteCycle}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                {t("complete_cycle")}
              </button>
            )}
            {(cycle.status === "scheduled" || cycle.status === "active") && (
              <button
                onClick={handleCancelCycle}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <XMarkIcon className="h-4 w-4 mr-2" />
                {t("cancel_cycle")}
              </button>
            )}
          </div>
        </div>

        {/* Header Image */}
        {cycle.headerImageUrl && (
          <div className="mb-6">
            <img
              src={cycle.headerImageUrl}
              alt="Cycle header"
              className="w-full h-48 object-cover rounded-lg"
            />
          </div>
        )}

        {/* Progress Bar */}
        {cycle.status === "active" && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {t("cycle_progress")}
              </span>
              <span className="text-sm text-gray-500">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Cycle Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CalendarIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <div className="text-sm font-medium text-gray-500">
                {t("start_date")}
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {formatDate(cycle.startDate)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CalendarIcon className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <div className="text-sm font-medium text-gray-500">
                {t("end_date")}
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {formatDate(cycle.endDate)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TrophyIcon className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <div className="text-sm font-medium text-gray-500">
                {t("number_of_winners")}
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {cycle.numberOfWinners}
                {cycle.guaranteeFirstPlace && (
                  <span className="text-xs text-gray-500 ml-1">
                    (+1st guaranteed)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {cycle.description && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            {t("cycle_description")}
          </h3>
          <div
            className="prose max-w-none text-gray-700 prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700"
            dangerouslySetInnerHTML={{ __html: cycle.description }}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab("participants")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "participants"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <UserGroupIcon className="h-5 w-5 inline mr-2" />
              {t("participants")} ({participants.length})
            </button>
            {cycle.status === "completed" && (
              <button
                onClick={() => setActiveTab("winners")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "winners"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <TrophyIcon className="h-5 w-5 inline mr-2" />
                {t("winners")} ({winners.length})
              </button>
            )}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "participants" && (
            <div>
              {loadingParticipants ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : participants.length === 0 ? (
                <div className="text-center py-8">
                  <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <div className="text-lg font-medium text-gray-900 mb-2">
                    {t("no_participants_yet")}
                  </div>
                  <div className="text-sm text-gray-500">
                    Users will appear here when they earn points during this
                    cycle.
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("rank")}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("user_name")}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("email")}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("city")}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("total_points")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {participants.map((participant, index) => (
                        <tr key={participant.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {participant.userName ||
                              `${participant.user?.firstName} ${participant.user?.lastName}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {participant.user?.email || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {participant.user?.city || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatPoints(participant.totalPoints)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "winners" && (
            <div>
              {loadingWinners ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : winners.length === 0 ? (
                <div className="text-center py-8">
                  <TrophyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <div className="text-lg font-medium text-gray-900 mb-2">
                    {t("no_winners_yet")}
                  </div>
                  <div className="text-sm text-gray-500">
                    Winners will be selected when the cycle ends.
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("rank")}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("user_name")}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("email")}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("city")}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("points_at_selection")}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("is_guaranteed_winner")}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("selected_at")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {winners.map((winner) => (
                        <tr key={winner.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {getRankOrdinal(winner.rank)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {winner.userName ||
                              `${winner.user?.firstName} ${winner.user?.lastName}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {winner.user?.email || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {winner.user?.city || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatPoints(winner.pointsAtSelection)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {winner.isGuaranteedWinner ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                Yes
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                Random
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(winner.selectedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <EditCycleModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onCycleUpdated={handleCycleUpdated}
        cycle={cycle}
      />
    </div>
  );
};

export default LeaderboardCycleDetails;
