import { useState, useEffect } from "react";
import {
  getAllRestaurants,
  handleClaimStatus,
  getAllClaimLogs,
} from "../services/restaurantService";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";

interface ClaimLog {
  id: string;
  restaurantId: string;
  userId: string;
  offer: string;
  createdAt: string;
  restaurant?: {
    id: string;
    name: string;
    address?: string;
    place?: string;
    images?: string;
  };
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

const Claim = () => {
  const { t } = useTranslation();
  const [claimLogs, setClaimLogs] = useState<ClaimLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ClaimLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOffer, setSelectedOffer] = useState("all");

  // Add new claim modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [restaurantSearch, setRestaurantSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(
    null
  );
  const [newOffer, setNewOffer] = useState("basic");

  // Unclaim modal
  const [isUnclaimModalOpen, setIsUnclaimModalOpen] = useState(false);
  const [restaurantToUnclaim, setRestaurantToUnclaim] = useState<ClaimLog | null>(
    null
  );

  // Change offer modal
  const [isChangeOfferModalOpen, setIsChangeOfferModalOpen] = useState(false);
  const [restaurantToChangeOffer, setRestaurantToChangeOffer] = useState<ClaimLog | null>(
    null
  );
  const [updatedOffer, setUpdatedOffer] = useState("basic");

  useEffect(() => {
    fetchClaimLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [claimLogs, searchTerm, selectedOffer]);

  useEffect(() => {
    if (restaurantSearch) {
      searchRestaurants();
    } else {
      setSearchResults([]);
    }
  }, [restaurantSearch]);

  const fetchClaimLogs = async () => {
    try {
      setLoading(true);
      const data = await getAllClaimLogs();
      setClaimLogs(data);
    } catch (error) {
      console.error("Failed to fetch claim logs", error);
      toast.error(t("claim.errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const searchRestaurants = async () => {
    try {
      const data = await getAllRestaurants(1, restaurantSearch);
      setSearchResults(data.restaurants || []);
    } catch (error) {
      console.error("Failed to search restaurants", error);
    }
  };

  const filterLogs = () => {
    let filtered = [...claimLogs];

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.restaurant?.name.toLowerCase().includes(search) ||
          log.restaurant?.place?.toLowerCase().includes(search) ||
          log.user?.email.toLowerCase().includes(search)
      );
    }

    // Filter by offer
    if (selectedOffer !== "all") {
      filtered = filtered.filter((log) => log.offer === selectedOffer);
    }

    setFilteredLogs(filtered);
  };

  const handleAddClaim = async () => {
    if (!selectedRestaurant) {
      toast.error(t("claim.errors.selectRestaurant"));
      return;
    }

    const loadingToastId = toast.loading(t("claim.toast.addingClaim"));

    try {
      await handleClaimStatus(selectedRestaurant.id, newOffer, true);
      toast.success(t("claim.toast.claimSuccess"));
      setIsAddModalOpen(false);
      resetAddModal();
      fetchClaimLogs();
    } catch (error: any) {
      console.error("Failed to claim restaurant", error);
      toast.error(error.response?.data?.error || t("claim.errors.claimFailed"));
    } finally {
      toast.dismiss(loadingToastId);
    }
  };

  const handleUnclaim = async () => {
    if (!restaurantToUnclaim) return;

    const loadingToastId = toast.loading(t("claim.toast.removingClaim"));

    try {
      await handleClaimStatus(
        restaurantToUnclaim.restaurantId,
        restaurantToUnclaim.offer,
        false
      );
      toast.success(t("claim.toast.unclaimSuccess"));
      setIsUnclaimModalOpen(false);
      setRestaurantToUnclaim(null);
      fetchClaimLogs();
    } catch (error: any) {
      console.error("Failed to unclaim restaurant", error);
      toast.error(
        error.response?.data?.error || t("claim.errors.unclaimFailed")
      );
    } finally {
      toast.dismiss(loadingToastId);
    }
  };

  const handleChangeOffer = async () => {
    if (!restaurantToChangeOffer) return;

    const loadingToastId = toast.loading(t("claim.toast.updatingOffer"));

    try {
      // First unclaim, then reclaim with new offer
      await handleClaimStatus(
        restaurantToChangeOffer.restaurantId,
        restaurantToChangeOffer.offer,
        false
      );
      await handleClaimStatus(
        restaurantToChangeOffer.restaurantId,
        updatedOffer,
        true
      );
      toast.success(t("claim.toast.offerSuccess"));
      setIsChangeOfferModalOpen(false);
      setRestaurantToChangeOffer(null);
      fetchClaimLogs();
    } catch (error: any) {
      console.error("Failed to change offer", error);
      toast.error(error.response?.data?.error || t("claim.errors.offerFailed"));
    } finally {
      toast.dismiss(loadingToastId);
    }
  };

  const resetAddModal = () => {
    setSelectedRestaurant(null);
    setRestaurantSearch("");
    setSearchResults([]);
    setNewOffer("basic");
  };

  const getOfferBadgeColor = (offer: string) => {
    switch (offer.toLowerCase()) {
      case "basic":
        return "bg-blue-100 text-blue-800";
      case "premium":
        return "bg-purple-100 text-purple-800";
      case "enterprise":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const stats = {
    total: claimLogs.length,
    basic: claimLogs.filter((l) => l.offer === "basic").length,
    premium: claimLogs.filter((l) => l.offer === "premium").length,
    enterprise: claimLogs.filter((l) => l.offer === "enterprise").length,
  };

  // Group by city
  const byCity: Record<string, number> = {};
  claimLogs.forEach((log) => {
    const city = log.restaurant?.place || "Unknown";
    byCity[city] = (byCity[city] || 0) + 1;
  });
  const topCities = Object.entries(byCity)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t("claim.title")}
          </h1>
          <p className="text-gray-600 mt-1">
            {t("claim.description")}
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5" />
          {t("claim.addClaim")}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t("claim.stats.totalClaimed")}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <BuildingOfficeIcon className="h-12 w-12 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t("claim.stats.basic")}</p>
              <p className="text-2xl font-bold text-blue-600">{stats.basic}</p>
            </div>
            <ShieldCheckIcon className="h-12 w-12 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t("claim.stats.premium")}</p>
              <p className="text-2xl font-bold text-purple-600">
                {stats.premium}
              </p>
            </div>
            <ShieldCheckIcon className="h-12 w-12 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t("claim.stats.enterprise")}</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats.enterprise}
              </p>
            </div>
            <ShieldCheckIcon className="h-12 w-12 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Top Cities */}
      {topCities.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {t("claim.topCities")}
          </h2>
          <div className="space-y-3">
            {topCities.map(([city, count]) => (
              <div key={city} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPinIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    {city}
                  </span>
                </div>
                <span className="text-sm text-gray-600">{count} {t("claim.claimed")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={t("claim.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Offer Filter */}
          <select
            value={selectedOffer}
            onChange={(e) => setSelectedOffer(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t("claim.allOffers")}</option>
            <option value="basic">{t("claim.stats.basic")}</option>
            <option value="premium">{t("claim.stats.premium")}</option>
            <option value="enterprise">{t("claim.stats.enterprise")}</option>
          </select>
        </div>
      </div>

      {/* Claimed Restaurants Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <BuildingOfficeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">{t("claim.noClaimedRestaurants")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              {/* Restaurant Image */}
              <div className="h-48 bg-gray-200 rounded-t-lg overflow-hidden">
                {log.restaurant?.images ? (
                  <img
                    src={`https://dinver.eu${
                      JSON.parse(log.restaurant.images)[0]
                    }`}
                    alt={log.restaurant.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BuildingOfficeIcon className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Restaurant Name & Offer Badge */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-900 flex-1">
                    {log.restaurant?.name || "Unknown"}
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${getOfferBadgeColor(
                      log.offer
                    )}`}
                  >
                    {log.offer.toUpperCase()}
                  </span>
                </div>

                {/* Location */}
                {log.restaurant?.place && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <MapPinIcon className="h-4 w-4" />
                    <span>{log.restaurant.place}</span>
                  </div>
                )}

                {/* Claimed By */}
                <div className="text-sm text-gray-600 mb-3">
                  <span className="font-medium">{t("claim.claimedBy")}:</span>{" "}
                  {log.user?.email || t("claim.unknown")}
                </div>

                {/* Date */}
                <div className="text-xs text-gray-500 mb-4">
                  {format(new Date(log.createdAt), "dd MMM yyyy, HH:mm")}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setRestaurantToChangeOffer(log);
                      setUpdatedOffer(log.offer);
                      setIsChangeOfferModalOpen(true);
                    }}
                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium"
                  >
                    {t("claim.changeOffer")}
                  </button>
                  <button
                    onClick={() => {
                      setRestaurantToUnclaim(log);
                      setIsUnclaimModalOpen(true);
                    }}
                    className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium"
                  >
                    {t("claim.unclaim")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Claim Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {t("claim.modal.addNewClaim")}
              </h2>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  resetAddModal();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Search Restaurant */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("claim.modal.searchRestaurant")}
              </label>
              <input
                type="text"
                placeholder={t("claim.modal.restaurantPlaceholder")}
                value={restaurantSearch}
                onChange={(e) => setRestaurantSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchResults.length > 0 && (
                <div className="mt-2 border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                  {searchResults.map((restaurant) => (
                    <button
                      key={restaurant.id}
                      onClick={() => {
                        setSelectedRestaurant(restaurant);
                        setRestaurantSearch("");
                        setSearchResults([]);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                    >
                      <div className="font-medium">{restaurant.name}</div>
                      {restaurant.place && (
                        <div className="text-xs text-gray-500">
                          {restaurant.place}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Restaurant */}
            {selectedRestaurant && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    {selectedRestaurant.name}
                  </span>
                </div>
                {selectedRestaurant.place && (
                  <div className="text-sm text-blue-700">
                    {selectedRestaurant.place}
                  </div>
                )}
              </div>
            )}

            {/* Select Offer */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("claim.modal.selectOffer")}
              </label>
              <select
                value={newOffer}
                onChange={(e) => setNewOffer(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="basic">{t("claim.stats.basic")}</option>
                <option value="premium">{t("claim.stats.premium")}</option>
                <option value="enterprise">{t("claim.stats.enterprise")}</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  resetAddModal();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                {t("claim.modal.cancel")}
              </button>
              <button
                onClick={handleAddClaim}
                disabled={!selectedRestaurant}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {t("claim.addClaim")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unclaim Confirmation Modal */}
      {isUnclaimModalOpen && restaurantToUnclaim && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-12 w-12 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {t("claim.modal.unclaimTitle")}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {t("claim.modal.unclaimDescription")}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="font-medium text-gray-900">
                {restaurantToUnclaim.restaurant?.name || t("claim.unknown")}
              </p>
              {restaurantToUnclaim.restaurant?.place && (
                <p className="text-sm text-gray-600">
                  {restaurantToUnclaim.restaurant.place}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsUnclaimModalOpen(false);
                  setRestaurantToUnclaim(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                {t("claim.modal.cancel")}
              </button>
              <button
                onClick={handleUnclaim}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {t("claim.modal.yesUnclaim")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Offer Modal */}
      {isChangeOfferModalOpen && restaurantToChangeOffer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{t("claim.changeOffer")}</h2>
              <button
                onClick={() => {
                  setIsChangeOfferModalOpen(false);
                  setRestaurantToChangeOffer(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="font-medium text-gray-900">
                {restaurantToChangeOffer.restaurant?.name || t("claim.unknown")}
              </p>
              {restaurantToChangeOffer.restaurant?.place && (
                <p className="text-sm text-gray-600">
                  {restaurantToChangeOffer.restaurant.place}
                </p>
              )}
              <p className="text-sm text-gray-600 mt-2">
                {t("claim.modal.currentOffer")}:{" "}
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold ${getOfferBadgeColor(
                    restaurantToChangeOffer.offer
                  )}`}
                >
                  {restaurantToChangeOffer.offer.toUpperCase()}
                </span>
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("claim.modal.newOffer")}
              </label>
              <select
                value={updatedOffer}
                onChange={(e) => setUpdatedOffer(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="basic">{t("claim.stats.basic")}</option>
                <option value="premium">{t("claim.stats.premium")}</option>
                <option value="enterprise">{t("claim.stats.enterprise")}</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsChangeOfferModalOpen(false);
                  setRestaurantToChangeOffer(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                {t("claim.modal.cancel")}
              </button>
              <button
                onClick={handleChangeOffer}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t("claim.modal.updateOffer")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Claim;
