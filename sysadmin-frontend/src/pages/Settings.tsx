import { useEffect, useState, useRef } from "react";
import {
  listSysadmins,
  addSysadmin,
  removeSysadmin,
} from "../services/sysadminService";
import { updateUserLanguage, getUserLanguage } from "../services/userService";
import {
  listBackups,
  restoreBackup,
  downloadBackup,
} from "../services/backupService";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { Sysadmin, Backup, Restaurant } from "../interfaces/Interfaces";
import i18n from "i18next";
import { useTranslation } from "react-i18next";
import { getAllRestaurants } from "../services/restaurantService";

const Settings = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("general");
  const [sysadmins, setSysadmins] = useState<Sysadmin[]>([]);
  const [newSysadminEmail, setNewSysadminEmail] = useState("");
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedSysadmin, setSelectedSysadmin] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [backups, setBackups] = useState<Backup[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchAllData = async () => {
      const loadingToastId = toast.loading(t("loading"));
      try {
        const [sysadmins, userLanguage, backups, restaurants] =
          await Promise.all([
            listSysadmins(),
            getUserLanguage(),
            listBackups(searchTerm),
            getAllRestaurants(),
          ]);

        setSysadmins(sysadmins);
        setSelectedLanguage(userLanguage.language);
        setBackups(backups);
        setRestaurants(restaurants);
      } catch (error) {
        console.error("Failed to fetch data", error);
        toast.error(t("failed_to_fetch_data"));
      } finally {
        toast.dismiss(loadingToastId);
      }
    };

    fetchAllData();
  }, []);

  const fetchSysadmins = async () => {
    const loadingToastId = toast.loading(t("loading"));
    try {
      const data = await listSysadmins();
      setSysadmins(data);
    } catch (error: any) {
      toast.error(error.message);
      console.error("Failed to fetch sysadmins", error);
    } finally {
      toast.dismiss(loadingToastId);
    }
  };

  const handleAddSysadmin = async () => {
    try {
      await addSysadmin(newSysadminEmail);
      setNewSysadminEmail("");
      setModalOpen(false);
      fetchSysadmins();
      toast.success("Sysadmin added successfully");
    } catch (error: any) {
      toast.error(error.message);
      console.error("Error object:", error.message);
    }
  };

  const handleRemoveSysadmin = async (userId: string) => {
    try {
      await removeSysadmin(
        sysadmins.find((sysadmin) => sysadmin.id === userId)?.user.email || ""
      );
      fetchSysadmins();
      toast.success("Sysadmin removed successfully");
    } catch (error: any) {
      toast.error(error.message);
      console.error("Failed to remove sysadmin");
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setSelectedSysadmin(null);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  const handleRestoreBackup = async (
    restaurantId: string,
    backupDate: string
  ) => {
    try {
      await restoreBackup(restaurantId, backupDate);
      toast.success(t("backup_restored_successfully"));
    } catch (error: any) {
      toast.error(error.message);
      console.error("Failed to restore backup", error);
    }
  };

  const handleDownloadBackup = async (
    restaurantId: string,
    backupDate: string
  ) => {
    try {
      const blob = await downloadBackup(restaurantId, backupDate);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${backupDate}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error.message);
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
        <button
          onClick={() => handleTabChange("sysadmins")}
          className={`py-2 px-4 border-b-2 text-sm ${
            activeTab === "sysadmins"
              ? "border-b-2 border-black"
              : "text-gray-500"
          }`}
        >
          {t("system_users")}
        </button>
        <button
          onClick={() => handleTabChange("backups")}
          className={`py-2 px-4 border-b-2 text-sm ${
            activeTab === "backups"
              ? "border-b-2 border-black"
              : "text-gray-500"
          }`}
        >
          {t("backups")}
        </button>
      </div>

      {activeTab === "general" && (
        <div className="flex flex-col gap-1">
          <h2 className="section-title">{t("general_settings")}</h2>
          <h3 className="section-subtitle">
            {t("general_settings_content_goes_here")}
          </h3>
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

      {activeTab === "sysadmins" && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col gap-1">
              <h2 className="section-title">{t("sysadmin_management")}</h2>
              <h3 className="section-subtitle">
                {t("list_of_all_system_admins")}
              </h3>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="primary-button"
            >
              {t("add_sysadmin")}
            </button>
          </div>
          <div className="rounded-lg border border-gray-200">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr className="text-sm text-black">
                  <th className="py-2 px-4 text-left font-normal">
                    {t("email")}
                  </th>
                  <th className="py-2 px-4 text-left font-normal">
                    {t("first_name")}
                  </th>
                  <th className="py-2 px-4 text-left font-normal">
                    {t("last_name")}
                  </th>
                  <th className="py-2 px-4 text-left font-normal">
                    {t("added_on")}
                  </th>
                  <th className="py-2 px-4 text-left font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {sysadmins.map((sysadmin) => (
                  <tr
                    key={sysadmin.id}
                    className="hover:bg-gray-100 border-b border-gray-200"
                  >
                    <td className="py-2 px-4 text-sm">{sysadmin.user.email}</td>
                    <td className="py-2 px-4 text-sm text-gray-600">
                      {sysadmin.user.firstName}
                    </td>
                    <td className="py-2 px-4 text-sm text-gray-600">
                      {sysadmin.user.lastName}
                    </td>
                    <td className="py-2 px-4 text-sm text-gray-600">
                      {format(new Date(sysadmin.createdAt), "dd.MM.yyyy.")}
                    </td>
                    <td className="py-2 px-4">
                      <div className="relative" ref={menuRef}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSysadmin(
                              selectedSysadmin === sysadmin.id
                                ? null
                                : sysadmin.id
                            );
                          }}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          &#x22EE;
                        </button>
                        {selectedSysadmin === sysadmin.id && (
                          <div className="absolute top-5 right-0 mt-2 w-48 z-50 bg-white border rounded shadow-lg">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSysadmin(sysadmin.id);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                            >
                              {t("remove")}
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
        </div>
      )}

      {activeTab === "backups" && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col gap-1">
              <h2 className="section-title">{t("backups")}</h2>
              <h3 className="section-subtitle">{t("list_of_all_backups")}</h3>
            </div>
            <input
              type="text"
              placeholder={t("search_backups")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 text-xs border border-gray-300 rounded outline-gray-300"
            />
          </div>
          <div className="rounded-lg border border-gray-200">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr className="text-sm text-black">
                  <th className="py-2 px-4 text-left font-normal">
                    {t("restaurant_name")}
                  </th>
                  <th className="py-2 px-4 text-left font-normal">
                    {t("backup_date")}
                  </th>
                  <th className="py-2 px-4 text-left font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {backups
                  .filter((backup) => {
                    const restaurant = restaurants.find(
                      (r) => r.id === backup.restaurantId
                    );
                    return restaurant
                      ? restaurant.name
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase())
                      : false;
                  })
                  .map((backup) => {
                    const restaurant = restaurants.find(
                      (r) => r.id === backup.restaurantId
                    );
                    return (
                      <tr
                        key={backup.key}
                        className="hover:bg-gray-100 border-b border-gray-200"
                      >
                        <td className="py-2 px-4 text-sm">
                          {restaurant
                            ? restaurant.name
                            : t("unknown_restaurant")}
                        </td>
                        <td className="py-2 px-4 text-sm text-gray-600">
                          {format(
                            new Date(backup.backupDate),
                            "dd.MM.yyyy. HH:mm"
                          )}
                        </td>
                        <td className="py-2 px-4 text-right">
                          <button
                            onClick={() =>
                              handleRestoreBackup(
                                backup.restaurantId,
                                backup.backupDate
                              )
                            }
                            className="text-black border border-gray-400 rounded px-2 py-1 text-xs mr-2 transition-colors duration-200 hover:bg-gray-200"
                          >
                            {t("restore")}
                          </button>
                          <button
                            onClick={() =>
                              handleDownloadBackup(
                                backup.restaurantId,
                                backup.backupDate
                              )
                            }
                            className="text-black border border-gray-400 rounded px-2 py-1 text-xs transition-colors duration-200 hover:bg-gray-200"
                          >
                            {t("download")}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                src="/images/sysadmin_icon.svg"
                alt="Sysadmin Icon"
                className="w-12 h-12 mr-2 border border-gray-200 rounded-lg p-3"
              />
              <div>
                <h2 className="text-lg font-semibold">{t("add_sysadmin")}</h2>
                <p className="text-sm text-gray-500">
                  {t("add_sysadmin_description")}
                </p>
              </div>
            </div>
            <div className="h-line"></div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={newSysadminEmail}
                onChange={(e) => setNewSysadminEmail(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
              />
            </div>
            <div className="h-line" />

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setModalOpen(false)}
                className="secondary-button"
              >
                {t("cancel")}
              </button>
              <button onClick={handleAddSysadmin} className="primary-button">
                {t("add_sysadmin")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
