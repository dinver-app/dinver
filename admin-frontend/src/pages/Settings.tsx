import { useEffect, useState } from "react";
import { updateUserLanguage, getUserLanguage } from "../services/userService";
import { toast } from "react-hot-toast";
import i18n from "i18next";
import { useTranslation } from "react-i18next";
import {
  getRestaurantAdmins,
  addRestaurantAdmin,
  removeRestaurantAdmin,
  updateRestaurantAdmin,
} from "../services/adminService";
import { canAccess } from "../utils/permissions";
import { useRole } from "../context/RoleContext";
import { useNavigate } from "react-router-dom";
import { QrCodeIcon } from "@heroicons/react/24/outline";

const Settings = () => {
  const { t } = useTranslation();
  const { role } = useRole();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("general");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [admins, setAdmins] = useState([]);
  const [isAddAdminModalOpen, setAddAdminModalOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState("admin");
  const [adminToDelete, setAdminToDelete] = useState<any | null>(null);
  const [isDeleteAdminModalOpen, setDeleteAdminModalOpen] = useState(false);
  const [isEditAdminModalOpen, setEditAdminModalOpen] = useState(false);
  const [adminToEdit, setAdminToEdit] = useState<any | null>(null);

  const currentRestaurant = JSON.parse(
    localStorage.getItem("currentRestaurant") || "{}"
  );
  const restaurantId = currentRestaurant.id;

  useEffect(() => {
    fetchUserLanguage();
    if (activeTab === "administrators") {
      fetchAdmins();
    }
  }, [activeTab, restaurantId]);

  const fetchUserLanguage = async () => {
    const loadingToastId = toast.loading(t("loading"));
    try {
      const { language } = await getUserLanguage();
      setSelectedLanguage(language);
    } catch (error: any) {
      console.error("Failed to fetch user language", error);
    } finally {
      toast.dismiss(loadingToastId);
    }
  };

  const fetchAdmins = async () => {
    const loadingToastId = toast.loading(t("loading"));
    try {
      const data = await getRestaurantAdmins(restaurantId);
      setAdmins(data);
    } catch (error) {
      console.error("Failed to fetch admins", error);
    } finally {
      toast.dismiss(loadingToastId);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleLanguageChange = async (language: string) => {
    try {
      await updateUserLanguage(language);
      setSelectedLanguage(language);
      localStorage.setItem("language", language);
      i18n.changeLanguage(language);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAddAdmin = async () => {
    try {
      await addRestaurantAdmin(restaurantId, {
        email: newAdminEmail,
        role: newAdminRole,
      });
      fetchAdmins();
      setNewAdminEmail("");
      setNewAdminRole("admin");
      toast.success(t("admin_added_successfully"));
      setAddAdminModalOpen(false);
    } catch (error: any) {
      console.error("Failed to add admin", error);
      toast.error(t(error.response.data.error));
    }
  };

  const handleDeleteAdmin = async () => {
    if (adminToDelete) {
      try {
        await removeRestaurantAdmin(restaurantId, adminToDelete.userId);
        fetchAdmins();
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

  const handleDeleteButtonClick = (admin: any) => {
    setAdminToDelete(admin);
    setDeleteAdminModalOpen(true);
  };

  const handleEditButtonClick = (admin: any) => {
    setAdminToEdit(admin);
    setEditAdminModalOpen(true);
  };

  const handleEditAdmin = async () => {
    if (adminToEdit) {
      try {
        await updateRestaurantAdmin(restaurantId, adminToEdit.userId, {
          role: adminToEdit.role,
        });
        fetchAdmins();
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
        <h1 className="page-title">{t("settings")}</h1>
        <h3 className="page-subtitle">{t("manage_your_account_settings")}</h3>
      </div>
      <div className="h-line mb-4"></div>
      <div className="flex mb-6">
        <button
          onClick={() => handleTabChange("general")}
          className={`py-2 px-4 border-b-2 text-sm ${
            activeTab === "general"
              ? "border-b-2 border-black"
              : "text-gray-500"
          }`}
        >
          {t("general_settings")}
        </button>
        {role && canAccess(role, "viewAdmins") && (
          <button
            onClick={() => handleTabChange("administrators")}
            className={`py-2 px-4 border-b-2 text-sm ${
              activeTab === "administrators"
                ? "border-b-2 border-black"
                : "text-gray-500"
            }`}
          >
            {t("administrators")}
          </button>
        )}
      </div>

      {activeTab === "general" && (
        <div className="flex flex-col gap-1">
          <h2 className="section-title">{t("general_settings")}</h2>
          <h3 className="section-subtitle">
            {t("general_settings_content_goes_here")}
          </h3>

          {/* QR Generator Link */}
          <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <QrCodeIcon className="w-5 h-5 text-blue-600" />
                  {t("qr_generator_title")}
                </h3>
                <p className="text-gray-600 mb-4">
                  {t("qr_generator_description")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {t("qr_generator_features_templates")}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {t("qr_generator_features_premium")}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {t("qr_generator_features_bulk")}
                  </span>
                </div>
              </div>
              <button
                onClick={() => navigate("/qr-generator")}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {t("qr_generator_open_button")}
              </button>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">
              {t("language")}
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="mt-1 block w-48 p-2 border border-gray-300 rounded outline-gray-300"
            >
              <option value="en">English</option>
              <option value="hr">Hrvatski</option>
            </select>
          </div>
        </div>
      )}

      {activeTab === "administrators" && (
        <div className="flex flex-col gap-1">
          <h2 className="section-title">{t("administrators")}</h2>
          <h3 className="section-subtitle">
            {t("manage_your_restaurant_administrators")}
          </h3>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setAddAdminModalOpen(true)}
              className="primary-button"
            >
              {t("add_admin")}
            </button>
          </div>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr className="text-sm text-black">
                  <th className="py-2 px-4 text-left font-normal w-64">
                    {t("email")}
                  </th>
                  <th className="py-2 px-4 text-left font-normal w-48">
                    {t("role")}
                  </th>
                  <th className="py-2 px-4 text-left w-20"></th>
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
                      <td className="py-2 px-4 w-20 flex space-x-2">
                        <button
                          onClick={() => handleEditButtonClick(admin)}
                          className="text-gray-500 hover:text-gray-700 text-sm"
                        >
                          {t("edit")}
                        </button>
                        <button
                          onClick={() => handleDeleteButtonClick(admin)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          {t("delete")}
                        </button>
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
                    email: adminToDelete.user.email,
                  })}
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
    </div>
  );
};

export default Settings;
