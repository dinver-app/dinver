import { useState, useEffect } from "react";
import {
  getRestaurants,
  handleClaimStatus,
  getAllClaimLogs,
  getRestaurantById,
} from "../services/restaurantService";
import { getUserById } from "../services/userService";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

const Claim = () => {
  const { t } = useTranslation();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [claimLogs, setClaimLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(
    null
  );
  const [isClaimed, setIsClaimed] = useState(false);
  const [offer, setOffer] = useState("basic");
  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchClaimLogs();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      fetchRestaurants(1, searchTerm);
    } else {
      setRestaurants([]);
    }
  }, [searchTerm]);

  const fetchRestaurants = async (page: number, search: string) => {
    const loadingToastId = toast.loading(t("loading"));
    try {
      const data = await getRestaurants(page, search);
      setRestaurants(data.restaurants);
    } catch (error) {
      console.error("Failed to fetch restaurants", error);
    } finally {
      toast.dismiss(loadingToastId);
    }
  };

  const fetchClaimLogs = async () => {
    const loadingToastId = toast.loading(t("loading"));
    try {
      const data = await getAllClaimLogs();
      const enrichedLogs = await Promise.all(
        data.map(async (log: any) => {
          const restaurant = await getRestaurantById(log.restaurantId);
          const user = await getUserById(log.userId);
          return {
            ...log,
            restaurantName: restaurant.name,
            userEmail: user.email,
          };
        })
      );
      setClaimLogs(enrichedLogs);
    } catch (error) {
      console.error("Failed to fetch claim logs", error);
    } finally {
      toast.dismiss(loadingToastId);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRestaurant) {
      toast.error(t("please_select_a_restaurant"));
      return;
    }

    const loadingToastId = toast.loading(t("loading"));

    try {
      await handleClaimStatus(selectedRestaurant.id, offer, isClaimed);
      toast.success(
        isClaimed
          ? t("restaurant_claimed_successfully")
          : t("restaurant_unclaimed_successfully")
      );
      setSelectedRestaurant(null);
      setSearchTerm("");
      setIsClaimed(false);
      setModalOpen(false);
      fetchClaimLogs();
    } catch (error: any) {
      console.error("Failed to update restaurant claim status", error);
      toast.error(t(error.response.data.error));
    } finally {
      toast.dismiss(loadingToastId);
    }
  };

  const resetModalState = () => {
    setSelectedRestaurant(null);
    setSearchTerm("");
    setRestaurants([]);
    setIsClaimed(false);
    setOffer("basic");
    setModalOpen(false);
  };

  return (
    <div className="mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="page-title">{t("claim_restaurants")}</h1>
          <h3 className="page-subtitle">{t("manage_restaurant_claims")}</h3>
        </div>
        <button onClick={() => setModalOpen(true)} className="primary-button">
          {t("add_claim")}
        </button>
      </div>
      <div className="h-line mb-4"></div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">{t("current_claims")}</h2>
        <div className="rounded-lg border border-gray-200">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr className="text-sm text-black">
                <th className="py-2 px-4 text-left font-normal">
                  {t("restaurant_name")}
                </th>
                <th className="py-2 px-4 text-left font-normal">
                  {t("offer")}
                </th>
                <th className="py-2 px-4 text-left font-normal">
                  {t("claimed_by")}
                </th>
                <th className="py-2 px-4 text-left font-normal">
                  {t("date_claimed")}
                </th>
              </tr>
            </thead>
            <tbody>
              {claimLogs.length > 0 ? (
                claimLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-100 border-b border-gray-200"
                  >
                    <td className="py-2 px-4 text-sm">{log.restaurantName}</td>
                    <td className="py-2 px-4 text-sm">
                      {t(log.offer.toLowerCase())}
                    </td>
                    <td className="py-2 px-4 text-sm">{log.userEmail}</td>
                    <td className="py-2 px-4 text-sm">
                      {format(new Date(log.createdAt), "dd.MM.yyyy.")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="py-2 px-4 text-center text-sm text-gray-500"
                  >
                    {t("no_confirmed_restaurants")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={resetModalState}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <div className="flex items-center mb-4">
              <img
                src="/public/images/verified.svg"
                alt="Verified Icon"
                className="w-12 h-12 mr-2 border border-gray-200 rounded-lg p-3"
              />
              <div>
                <h2 className="text-lg font-semibold">{t("add_new_claim")}</h2>
                <p className="text-sm text-gray-500">
                  {t("add_claim_description")}
                </p>
              </div>
            </div>
            <div className="h-line mb-4"></div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("search_for_restaurant")}
            </label>
            <input
              type="text"
              placeholder={t("enter_restaurant_name")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded outline-gray-300"
            />
            {restaurants.length > 0 && (
              <ul className="border border-gray-300 rounded mt-2 max-h-40 overflow-y-auto">
                {restaurants.map((restaurant) => (
                  <li
                    key={restaurant.id}
                    onClick={() => {
                      setSelectedRestaurant(restaurant);
                      setSearchTerm("");
                      setRestaurants([]);
                    }}
                    className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                  >
                    {restaurant.name}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700">
                {t("selected_restaurant")}:{" "}
                {selectedRestaurant
                  ? selectedRestaurant.name
                  : t("none_selected")}
              </h4>
              <div className="mt-2">
                <label className="text-sm text-gray-700">
                  {t("claim_status")}
                </label>
                <div>
                  <select
                    value={isClaimed ? "claimed" : "unclaimed"}
                    onChange={(e) => setIsClaimed(e.target.value === "claimed")}
                    className="form-select mt-1 block w-48 pl-2 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="claimed">{t("claimed")}</option>
                    <option value="unclaimed">{t("unclaimed")}</option>
                  </select>
                </div>
              </div>
              {isClaimed && (
                <div className="mt-2">
                  <label className="text-sm text-gray-700">{t("offer")}</label>
                  <div>
                    <select
                      value={offer}
                      onChange={(e) => setOffer(e.target.value)}
                      className="form-select mt-1 block w-48 pl-2 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      <option value="basic">{t("basic")}</option>
                      <option value="premium">{t("premium")}</option>
                      <option value="enterprise">{t("enterprise")}</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
            <div className="h-line mt-4 mb-4"></div>
            <div className="flex justify-end space-x-3">
              <button onClick={resetModalState} className="secondary-button">
                {t("cancel")}
              </button>
              <button
                onClick={() => {
                  handleSubmit();
                  resetModalState();
                }}
                className="primary-button"
                disabled={!selectedRestaurant}
              >
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Claim;
