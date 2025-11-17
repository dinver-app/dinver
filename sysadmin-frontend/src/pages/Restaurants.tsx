import { useState, useEffect, useRef } from "react";
import {
  getRestaurants,
  createRestaurant,
  deleteRestaurant,
} from "../services/restaurantService";
import { Restaurant } from "../interfaces/Interfaces";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  getRestaurantAdmins,
  addRestaurantAdmin,
  updateRestaurantAdmin,
  removeRestaurantAdmin,
} from "../services/sysadminService";
import ImportRestaurantModal from "../components/ImportRestaurantModal";

const formatRating = (rating: number | undefined, language: string) => {
  if (rating === undefined) return "-";
  return language === "hr"
    ? rating.toFixed(1).replace(".", ",")
    : rating.toFixed(1);
};

const Restaurants = () => {
  const { t, i18n } = useTranslation();
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

  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    string | null
  >(null);
  const [isAdminModalOpen, setAdminModalOpen] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState("admin");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isAddAdminModalOpen, setAddAdminModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<{
    userId: string;
    email: string;
  } | null>(null);
  const [isDeleteAdminModalOpen, setDeleteAdminModalOpen] = useState(false);
  const [isDeleteRestaurantModalOpen, setDeleteRestaurantModalOpen] =
    useState(false);
  const [restaurantToDelete, setRestaurantToDelete] =
    useState<Restaurant | null>(null);
  const [isEditAdminModalOpen, setEditAdminModalOpen] = useState(false);
  const [adminToEdit, setAdminToEdit] = useState<any | null>(null);
  const [isImportModalOpen, setImportModalOpen] = useState(false);

  useEffect(() => {
    fetchRestaurants(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  const fetchRestaurants = async (page: number, search: string) => {
    try {
      const data = await getRestaurants(page, search);
      console.log(data);
      setRestaurants(data.restaurants);
      setTotalPages(data.totalPages);
      setTotalRestaurants(data.totalRestaurants);
      setClaimedRestaurantsCount(data.claimedRestaurantsCount);
      setTotalRestaurantsCount(data.totalRestaurantsCount);
    } catch (error) {
      console.error("Failed to fetch restaurants", error);
    }
  };

  useEffect(() => {
    const fetchInitialRestaurants = async () => {
      const loadingToastId = toast.loading(t("loading"));
      try {
        const data = await getRestaurants(currentPage, searchTerm);
        setRestaurants(data.restaurants);
        setTotalPages(data.totalPages);
        setTotalRestaurants(data.totalRestaurants);
        setClaimedRestaurantsCount(data.claimedRestaurantsCount);
        setTotalRestaurantsCount(data.totalRestaurantsCount);
      } catch (error) {
        console.error("Failed to fetch restaurants", error);
      } finally {
        toast.dismiss(loadingToastId);
      }
    };

    fetchInitialRestaurants();
  }, []);

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

  const fetchAdmins = async (restaurantId: string) => {
    try {
      const data = await getRestaurantAdmins(restaurantId);
      setAdmins(data);
    } catch (error) {
      console.error("Failed to fetch admins", error);
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setIsMenuOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const handleManageAdmins = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId);
    fetchAdmins(restaurantId);
    setAdminModalOpen(true);
    setIsMenuOpen(false);
  };

  const handleAddAdmin = async () => {
    console.log(selectedRestaurantId);
    if (selectedRestaurantId) {
      try {
        await addRestaurantAdmin(
          selectedRestaurantId,
          newAdminEmail,
          newAdminRole
        );
        fetchAdmins(selectedRestaurantId);
        setNewAdminEmail("");
        setNewAdminRole("admin");
        toast.success(t("admin_added_successfully"));
        setAddAdminModalOpen(false);
      } catch (error: any) {
        console.error("Failed to add admin", error);
        toast.error(t(error.message));
      }
    }
  };

  const handleDeleteAdmin = async () => {
    if (selectedRestaurantId && adminToDelete) {
      try {
        await removeRestaurantAdmin(selectedRestaurantId, adminToDelete.userId);
        fetchAdmins(selectedRestaurantId);
        toast.success(t("admin_removed_successfully"));
      } catch (error: any) {
        console.error("Failed to remove admin", error);
        toast.error(t(error.message));
      } finally {
        setDeleteAdminModalOpen(false);
        setAdminToDelete(null);
      }
    }
  };

  const handleDeleteRestaurant = async () => {
    if (restaurantToDelete) {
      try {
        await deleteRestaurant(restaurantToDelete.id || "");
        fetchRestaurants(currentPage, searchTerm);
        toast.success(t("restaurant_deleted_successfully"));
      } catch (error) {
        console.error("Failed to delete restaurant", error);
        toast.error(t("failed_to_delete_restaurant"));
      } finally {
        setDeleteRestaurantModalOpen(false);
        setRestaurantToDelete(null);
      }
    }
  };

  const handleEditButtonClick = (admin: any) => {
    setAdminToEdit(admin);
    setEditAdminModalOpen(true);
  };

  const handleEditAdmin = async () => {
    if (selectedRestaurantId && adminToEdit) {
      try {
        await updateRestaurantAdmin(
          selectedRestaurantId,
          adminToEdit.userId,
          adminToEdit.role
        );
        fetchAdmins(selectedRestaurantId);
        toast.success(t("admin_updated_successfully"));
      } catch (error: any) {
        console.error("Failed to update admin", error);
        toast.error(t(error.message));
      } finally {
        setEditAdminModalOpen(false);
        setAdminToEdit(null);
      }
    }
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
        <button
          onClick={() => setImportModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition font-medium"
        >
          Import from Google
        </button>
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
              <th className="py-2 px-4 text-left font-normal w-32">
                {t("place")}
              </th>
              <th className="py-2 px-4 text-center font-normal w-20">
                {t("claimed")}
              </th>
              <th className="py-2 px-4 text-center font-normal w-20">
                {t("open")}
              </th>
              <th className="py-2 px-4 text-center font-normal w-20">
                {t("rating")}
              </th>
              <th className="py-2 px-4 text-left w-10"></th>
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
                <td className="py-3 px-4 text-sm w-32">{restaurant.place}</td>

                <td className="py-3 px-4 text-sm w-20 text-center">
                  {restaurant.isClaimed ? t("yes") : t("no")}
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
                <td className="py-3 px-4 text-sm w-20 text-center">
                  {restaurant.reviewRating !== null
                    ? formatRating(restaurant.reviewRating, i18n.language)
                    : "-"}
                </td>
                <td className="py-2 px-4 w-10">
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRestaurantId(restaurant.id || null);
                        setIsMenuOpen(!isMenuOpen);
                      }}
                      className="text-gray-500 hover:text-gray-700 px-2"
                    >
                      &#x22EE;
                    </button>
                    {isMenuOpen && selectedRestaurantId === restaurant.id && (
                      <div className="absolute top-5 right-0 mt-2 w-48 z-50 bg-white border rounded shadow-lg">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleManageAdmins(restaurant.id || "");
                          }}
                          className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        >
                          {t("manage_admins")}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRestaurantToDelete(restaurant);
                            setDeleteRestaurantModalOpen(true);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          {t("delete_restaurant")}
                        </button>
                      </div>
                    )}
                  </div>
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

      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative">
            <button
              onClick={() => setAdminModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <div className="flex items-center mb-4 gap-1">
              <img
                src="/images/admin.svg"
                alt="Admin Icon"
                className="w-12 h-12 mr-2 border border-gray-200 rounded-lg p-3"
              />
              <div>
                <h2 className="text-lg font-semibold">{t("manage_admins")}</h2>
                <p className="text-sm text-gray-500">
                  {t("manage_admins_description")}
                </p>
              </div>
            </div>
            <div className="h-line mb-4"></div>
            <div className="rounded-lg border border-gray-200">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100">
                  <tr className="text-sm text-black">
                    <th className="py-2 px-4 text-left font-normal w-64">
                      {t("email")}
                    </th>
                    <th className="py-2 px-4 text-left font-normal w-48">
                      {t("role")}
                    </th>
                    <th className="py-2 px-4 text-left w-32"></th>
                  </tr>
                </thead>
                <tbody>
                  {admins.length > 0 ? (
                    admins.map((admin: any) => (
                      <tr
                        key={admin.userId}
                        className="hover:bg-gray-100 border-b border-gray-200"
                      >
                        <td className="py-2 px-4 text-sm w-64">
                          {admin.user.email}
                        </td>
                        <td className="py-2 px-4 text-sm text-gray-600 w-48">
                          {t(admin.role)}
                        </td>
                        <td className="py-2 px-4 w-32">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditButtonClick(admin)}
                              className="text-gray-500 hover:text-gray-700 text-sm"
                            >
                              {t("edit")}
                            </button>
                            <button
                              onClick={() => {
                                setAdminToDelete({
                                  userId: admin.userId,
                                  email: admin.user.email,
                                });
                                setDeleteAdminModalOpen(true);
                              }}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              {t("remove")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-2 px-4 text-start text-sm">
                        {t("no_admins")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setAddAdminModalOpen(true)}
                className="primary-button"
              >
                {t("add_admin")}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddAdminModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setAddAdminModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <div className="flex items-center mb-4 gap-1">
              <img
                src="/images/admin.svg"
                alt="Add Admin Icon"
                className="w-12 h-12 mr-2 border border-gray-200 rounded-lg p-3"
              />
              <div>
                <h2 className="text-lg font-semibold">{t("add_admin")}</h2>
                <p className="text-sm text-gray-500">
                  {t("add_admin_description")}
                </p>
              </div>
            </div>
            <div className="h-line mb-4"></div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("admin_email")}
              </label>
              <input
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("role")}
              </label>
              <select
                value={newAdminRole}
                onChange={(e) => setNewAdminRole(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
              >
                <option value="owner">{t("owner")}</option>
                <option value="admin">{t("admin")}</option>
                <option value="helper">{t("helper")}</option>
              </select>
            </div>
            <div className="h-line"></div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setAddAdminModalOpen(false)}
                className="secondary-button"
              >
                {t("cancel")}
              </button>
              <button onClick={handleAddAdmin} className="primary-button">
                {t("add_admin")}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteAdminModalOpen && adminToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setDeleteAdminModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <div className="flex items-center mb-4 gap-1">
              <img
                src="/images/admin_delete.svg"
                alt="Warning Icon"
                className="w-12 h-12 mr-2 border border-gray-200 rounded-lg p-3"
              />
              <div>
                <h2 className="text-lg font-semibold">{t("confirm_delete")}</h2>
                <p className="text-sm text-gray-500">
                  {t("are_you_sure_you_want_to_delete_admin", {
                    email: adminToDelete.email,
                  })}
                  <span className="font-bold">{adminToDelete.email}</span>?
                </p>
              </div>
            </div>
            <div className="h-line"></div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteAdminModalOpen(false)}
                className="secondary-button"
              >
                {t("cancel")}
              </button>
              <button onClick={handleDeleteAdmin} className="delete-button">
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteRestaurantModalOpen && restaurantToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setDeleteRestaurantModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <div className="flex items-center mb-4 gap-1">
              <div className="w-12 h-12 mr-2 border border-gray-200 rounded-lg p-3 flex items-center justify-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z"
                    fill="black"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {t("delete_restaurant")}
                </h2>
                <p className="text-sm text-gray-500">
                  {t(
                    "are_you_sure_you_want_to_delete_the_restaurant_with_name"
                  )}{" "}
                  <span className="font-bold">{restaurantToDelete.name}</span>
                </p>
              </div>
            </div>
            <div className="h-line"></div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteRestaurantModalOpen(false)}
                className="secondary-button"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleDeleteRestaurant}
                className="delete-button"
              >
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditAdminModalOpen && adminToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setEditAdminModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <div className="flex items-center mb-4 gap-1">
              <img
                src="/images/admin.svg"
                alt="Edit Admin Icon"
                className="w-12 h-12 mr-2 border border-gray-200 rounded-lg p-3"
              />
              <div>
                <h2 className="text-lg font-semibold">{t("edit_admin")}</h2>
                <p className="text-sm text-gray-500">
                  {t("edit_admin_description")}
                </p>
              </div>
            </div>
            <div className="h-line mb-4"></div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("role")}
              </label>
              <select
                value={adminToEdit.role}
                onChange={(e) =>
                  setAdminToEdit({ ...adminToEdit, role: e.target.value })
                }
                className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
              >
                <option value="owner">{t("owner")}</option>
                <option value="admin">{t("admin")}</option>
                <option value="helper">{t("helper")}</option>
              </select>
            </div>
            <div className="h-line"></div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setEditAdminModalOpen(false)}
                className="secondary-button"
              >
                {t("cancel")}
              </button>
              <button onClick={handleEditAdmin} className="primary-button">
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import from Google Modal */}
      <ImportRestaurantModal
        isOpen={isImportModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          fetchRestaurants(currentPage, searchTerm);
        }}
      />
    </div>
  );
};

export default Restaurants;
