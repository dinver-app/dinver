import { useState, useEffect } from "react";
import {
  getAllRestaurants,
  createRestaurant,
} from "../services/restaurantService";
import { Restaurant } from "../interfaces/Interfaces";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Restaurants = () => {
  const { t } = useTranslation();
  const [restaurants, setRestaurants] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setModalOpen] = useState(false);
  const [totalRestaurants, setTotalRestaurants] = useState(0);
  const [claimedRestaurantsCount, setClaimedRestaurantsCount] = useState(0);
  const [totalRestaurantsCount, setTotalRestaurantsCount] = useState(0);
  const [newRestaurant, setNewRestaurant] = useState<Restaurant>({
    name: "",
    address: "",
  });

  const [searchTerm, setSearchTerm] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    fetchRestaurants(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  const fetchRestaurants = async (page: number, search: string) => {
    try {
      const data = await getAllRestaurants(page, search);
      console.log(data.restaurants.length);
      setRestaurants(data.restaurants);
      setTotalPages(data.totalPages);
      setTotalRestaurants(data.totalRestaurants);
      setClaimedRestaurantsCount(data.claimedRestaurantsCount);
      setTotalRestaurantsCount(data.totalRestaurantsCount);
    } catch (error) {
      console.error("Failed to fetch restaurants", error);
    }
  };

  const handleCreateRestaurant = async () => {
    try {
      await createRestaurant(newRestaurant);
      setModalOpen(false);
      fetchRestaurants(currentPage, searchTerm);
      toast.success("Restaurant added successfully");
    } catch (error) {
      console.error("Failed to create restaurant", error);
      toast.error("Failed to create restaurant");
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="mx-auto p-4">
      <div className="flex flex-col justify-between items-start mb-4">
        <h1 className="page-title">{t("restaurants")}</h1>
        <h3 className="page-subtitle">
          {t("manage_your_restaurant_listings")}
        </h3>
      </div>
      <div className="h-line mb-4"></div>
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t("search_restaurants")}
          className="px-3 py-2 text-xs border border-gray-300 rounded outline-gray-300"
        />
        <button onClick={() => setModalOpen(true)} className="primary-button">
          {t("add_restaurant")}
        </button>
      </div>
      <div className="rounded-lg border border-gray-200">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr className="text-sm text-black">
              <th className="py-2 px-4 text-left font-normal w-32">
                {t("name")}
              </th>
              <th className="py-2 px-4 text-left font-normal w-48">
                {t("address")}
              </th>
              <th className="py-2 px-4 text-center font-normal w-20">
                {t("rating")}
              </th>
              <th className="py-2 px-4 text-center font-normal w-20">
                {t("claimed")}
              </th>
              <th className="py-2 px-4 text-center font-normal w-20">
                {t("open")}
              </th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((restaurant: Restaurant) => (
              <tr
                key={restaurant.slug}
                className="hover:bg-gray-100 border-b border-gray-200 cursor-pointer"
                onClick={() => navigate(`/restaurants/${restaurant.slug}`)}
              >
                <td className="py-3 px-4 text-sm w-32">{restaurant.name}</td>
                <td className="py-3 px-4 text-sm w-48">{restaurant.address}</td>
                <td className="py-3 px-4 text-sm text-center w-20">
                  {restaurant.rating !== undefined && restaurant.rating !== null
                    ? restaurant.rating.toFixed(1)
                    : "-"}
                </td>
                <td className="py-3 px-4 text-sm w-20 text-center">
                  {restaurant.isClaimed ? "Yes" : "No"}
                </td>
                <td className="py-3 px-4 text-sm w-20">
                  <div
                    className={`w-4 h-4 mx-auto rounded-full ${
                      restaurant.isOpen === "true"
                        ? "bg-green-500"
                        : restaurant.isOpen === "false"
                        ? "bg-red-500"
                        : "bg-gray-500"
                    }`}
                  ></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-4">
        <span className="text-sm">
          {totalRestaurants !== 0
            ? (currentPage - 1) * 10 + 1
            : totalRestaurants}{" "}
          - {Math.min(currentPage * 10, totalRestaurants)} {t("of")}{" "}
          {totalRestaurants}
        </span>
        <div className="flex space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            &lt;
          </button>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            &gt;
          </button>
        </div>
      </div>
      <div className="flex justify-between items-center mt-4">
        <span className="text-sm">
          {t("claimed_restaurants")}: {claimedRestaurantsCount} {t("of")}{" "}
          {totalRestaurantsCount}
        </span>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <div className="flex items-center mb-4 gap-1">
              <img
                src="/images/restaurant.svg"
                alt="Restaurant Icon"
                className="w-12 h-12 mr-2 border border-gray-200 rounded-lg p-3"
              />
              <div>
                <h2 className="text-lg font-semibold">{t("add_restaurant")}</h2>
                <p className="text-sm text-gray-500">
                  {t("add_restaurant_description")}
                </p>
              </div>
            </div>
            <div className="h-line"></div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("restaurant_name")}
              </label>
              <input
                type="text"
                value={newRestaurant.name}
                onChange={(e) =>
                  setNewRestaurant({ ...newRestaurant, name: e.target.value })
                }
                className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("address")}
              </label>
              <input
                type="text"
                value={newRestaurant.address}
                onChange={(e) =>
                  setNewRestaurant({
                    ...newRestaurant,
                    address: e.target.value,
                  })
                }
                className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
              />
            </div>

            <div className="h-line"></div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setModalOpen(false)}
                className="secondary-button"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRestaurant}
                className="primary-button"
              >
                {t("add_restaurant")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Restaurants;
