import { useEffect, useState, useRef } from "react";
import {
  listSysadmins,
  addSysadmin,
  removeSysadmin,
} from "../services/sysadminService";
import {
  updateUserLanguage,
  getUserLanguage,
  listAllUsers,
} from "../services/userService";
import {
  listBackups,
  restoreBackup,
  downloadBackup,
} from "../services/backupService";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import {
  Sysadmin,
  Backup,
  Restaurant,
  User,
  AuditLog,
} from "../interfaces/Interfaces";
import i18n from "i18next";
import { useTranslation } from "react-i18next";
import { getRestaurantsList } from "../services/restaurantService";
import { getAuditLogs } from "../services/auditLogsService";

const getInitialLanguage = () => {
  return i18n.language || localStorage.getItem("language") || "en";
};

const Settings = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("general");
  const [sysadmins, setSysadmins] = useState<Sysadmin[]>([]);
  const [newSysadminEmail, setNewSysadminEmail] = useState("");
  const [_, setModalOpen] = useState(false);
  const [selectedSysadmin, setSelectedSysadmin] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState(
    getInitialLanguage()
  );
  const [backups, setBackups] = useState<Backup[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [logsSearchTerm, setLogsSearchTerm] = useState("");

  useEffect(() => {
    const fetchAllData = async () => {
      const loadingToastId = toast.loading(t("loading"));
      try {
        const [sysadmins, userLanguage, backups, restaurants, usersData] =
          await Promise.all([
            listSysadmins(),
            getUserLanguage(),
            listBackups(searchTerm),
            getRestaurantsList(),
            listAllUsers(),
          ]);

        setSysadmins(sysadmins);
        setSelectedLanguage(userLanguage.language);
        setBackups(backups);
        setRestaurants(restaurants);
        setUsers(usersData);
      } catch (error) {
        console.error("Failed to fetch data", error);
        toast.error(t("failed_to_fetch_data"));
      } finally {
        toast.dismiss(loadingToastId);
      }
    };

    fetchAllData();
  }, []);

  useEffect(() => {
    if (activeTab === "logs") {
      fetchLogs();
    }
  }, [currentPage, logsSearchTerm, actionFilter, activeTab]);

  const fetchLogs = async () => {
    const loadingToastId = toast.loading(t("loading"));
    try {
      const logsData = await getAuditLogs(
        currentPage,
        logsSearchTerm,
        actionFilter !== "ALL" ? actionFilter : ""
      );
      setLogs(logsData.logs);
      setTotalPages(logsData.totalPages);
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      toast.dismiss(loadingToastId);
    }
  };

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

  const getUserEmail = (userId: string) => {
    const user = users.find((user) => user.id === userId);
    return user ? user.email : t("unknown_user");
  };

  const getRestaurantName = (restaurantId: string) => {
    const restaurant = restaurants.find(
      (restaurant) => restaurant.id === restaurantId
    );
    return restaurant ? restaurant.name : t("unknown_restaurant");
  };

  const handleOpenModal = (log: AuditLog) => {
    setSelectedLog(log);
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
        <button
          onClick={() => handleTabChange("logs")}
          className={`py-2 px-4 border-b-2 text-sm ${
            activeTab === "logs" ? "border-b-2 border-black" : "text-gray-500"
          }`}
        >
          {t("logs")}
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

      {activeTab === "logs" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <input
              type="text"
              placeholder={t("search_logs")}
              value={logsSearchTerm}
              onChange={(e) => setLogsSearchTerm(e.target.value)}
              className="px-3 py-2 text-xs border border-gray-300 rounded outline-gray-300"
            />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-gray-300 rounded outline-gray-300"
            >
              <option value="all">{t("all_actions")}</option>
              <option value="created">{t("created")}</option>
              <option value="updated">{t("updated")}</option>
              <option value="deleted">{t("deleted")}</option>
            </select>
          </div>
          {logs.length === 0 ? (
            <div className="text-center text-gray-500">
              {t("no_logs_available")}
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-gray-200">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-100">
                    <tr className="text-sm text-black">
                      <th className="py-2 px-4 text-left font-normal w-64">
                        {t("user")}
                      </th>
                      <th className="py-2 px-4 text-left font-normal w-40">
                        {t("action")}
                      </th>
                      <th className="py-2 px-4 text-left font-normal w-40">
                        {t("entity")}
                      </th>
                      <th className="py-2 px-4 text-left font-normal w-64">
                        {t("restaurant")}
                      </th>
                      <th className="py-2 px-4 text-left font-normal w-48">
                        {t("date")}
                      </th>
                      <th className="py-2 px-4 text-left font-normal w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-gray-100 border-b border-gray-200"
                      >
                        <td className="py-2 px-4 text-sm w-64">
                          {getUserEmail(log.userId)}
                        </td>
                        <td className="py-2 px-4 text-sm text-gray-600 w-40">
                          {t(log.action)}
                        </td>
                        <td className="py-2 px-4 text-sm text-gray-600 w-40">
                          {t(log.entity)}
                        </td>
                        <td className="py-2 px-4 text-sm text-gray-600 w-64">
                          {getRestaurantName(log.restaurantId)}
                        </td>
                        <td className="py-2 px-4 text-sm text-gray-600 w-48">
                          {format(new Date(log.createdAt), "dd.MM.yyyy. HH:mm")}
                        </td>
                        <td className="py-2 px-4 text-sm text-gray-600 w-10">
                          <button
                            onClick={() => handleOpenModal(log)}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            ...
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center mt-4">
                <span className="text-sm">
                  {t("page")} {currentPage} {t("of")} {totalPages}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    &lt;
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "jsonMenuImport" && (
        <div>
          <div className="flex flex-col gap-1 mb-6">
            <h2 className="section-title">JSON Menu Import</h2>
            <h3 className="section-subtitle">
              Import menus from JSON files stored in the data/menus folder
            </h3>
          </div>

          {/* Progress Steps */}
          <div className="mb-6">
            <div className="flex items-center space-x-4">
              <div
                className={`flex items-center ${
                  selectedRestaurantSlug ? "text-blue-600" : "text-gray-400"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    selectedRestaurantSlug
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  1
                </div>
                <span className="ml-2 text-sm font-medium">
                  Select Restaurant
                </span>
              </div>

              <div className="w-8 h-1 bg-gray-200"></div>

              <div
                className={`flex items-center ${
                  selectedFilename ? "text-blue-600" : "text-gray-400"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    selectedFilename
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  2
                </div>
                <span className="ml-2 text-sm font-medium">Select File</span>
              </div>

              <div className="w-8 h-1 bg-gray-200"></div>

              <div
                className={`flex items-center ${
                  selectedRestaurantSlug && selectedFilename
                    ? "text-blue-600"
                    : "text-gray-400"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    selectedRestaurantSlug && selectedFilename
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  3
                </div>
                <span className="ml-2 text-sm font-medium">Import</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Step 1: Select Restaurant */}
            <div>
              <h4 className="text-md font-semibold mb-4">
                Step 1: Select Restaurant
              </h4>
              <button
                onClick={fetchAvailableMenus}
                disabled={isLoadingMenus}
                className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingMenus
                  ? "Loading..."
                  : "Refresh Available Restaurants"}
              </button>

              {isLoadingMenus ? (
                <div className="text-gray-500 text-sm">
                  Loading available restaurants...
                </div>
              ) : availableMenus.length === 0 ? (
                <div className="text-gray-500 text-sm">
                  No restaurants found. Create folders in data/menus/ with
                  restaurant slugs.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableMenus.map((menu) => (
                    <div
                      key={menu.slug}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedRestaurantSlug === menu.slug
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => {
                        setSelectedRestaurantSlug(menu.slug);
                        setSelectedFilename(""); // Reset filename when changing restaurant
                      }}
                    >
                      <h5 className="font-medium text-gray-900">
                        {menu.restaurantName}
                      </h5>
                      <p className="text-sm text-gray-600">Slug: {menu.slug}</p>
                      <p className="text-sm text-gray-600">
                        Available files: {menu.fileCount}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2: Select File (only if restaurant is selected) */}
            {selectedRestaurantSlug && (
              <div>
                <h4 className="text-md font-semibold mb-4">
                  Step 2: Select File for{" "}
                  {
                    availableMenus.find(
                      (m) => m.slug === selectedRestaurantSlug
                    )?.restaurantName
                  }
                </h4>

                {(() => {
                  const selectedMenu = availableMenus.find(
                    (m) => m.slug === selectedRestaurantSlug
                  );
                  if (!selectedMenu) {
                    return (
                      <div className="text-gray-500 text-sm">
                        Loading restaurant data...
                      </div>
                    );
                  }

                  if (
                    !selectedMenu.jsonFiles ||
                    selectedMenu.jsonFiles.length === 0
                  ) {
                    return (
                      <div className="text-gray-500 text-sm">
                        No JSON files found for this restaurant.
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedMenu.jsonFiles.map((file: string) => (
                        <div
                          key={file}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedFilename === file
                              ? "border-green-500 bg-green-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                          onClick={() => setSelectedFilename(file)}
                        >
                          <h5 className="font-medium text-gray-900">{file}</h5>
                          <p className="text-sm text-gray-600">JSON file</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Step 3: Import Settings (only if both restaurant and file are selected) */}
            {selectedRestaurantSlug && selectedFilename && (
              <div>
                <h4 className="text-md font-semibold mb-4">
                  Step 3: Import Settings
                </h4>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="mb-4">
                    <h5 className="font-medium text-gray-900 mb-2">
                      Selected:
                    </h5>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <strong>Restaurant:</strong>{" "}
                        {
                          availableMenus.find(
                            (m) => m.slug === selectedRestaurantSlug
                          )?.restaurantName
                        }
                      </p>
                      <p>
                        <strong>File:</strong> {selectedFilename}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Menu Type
                      </label>
                      <select
                        value={selectedMenuType}
                        onChange={(e) =>
                          setSelectedMenuType(
                            e.target.value as "food" | "drink"
                          )
                        }
                        className="w-full p-2 border border-gray-300 rounded outline-gray-300"
                      >
                        <option value="food">Food Menu</option>
                        <option value="drink">Drink Menu</option>
                      </select>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={handleImportMenu}
                        disabled={isImportingMenu}
                        className="primary-button disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isImportingMenu
                          ? "Importing..."
                          : `Import ${selectedFilename}`}
                      </button>
                      <button
                        onClick={clearSelections}
                        className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                      >
                        Start Over
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Import Results */}
            {importResult && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h4 className="text-md font-semibold mb-4 text-green-800">
                  ✅ Import Successful!
                </h4>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {importResult.results.categories.created}
                    </div>
                    <div className="text-sm text-gray-600">
                      Categories Created
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {importResult.results.categories.existing}
                    </div>
                    <div className="text-sm text-gray-600">
                      Categories Existing
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {importResult.results.items.created}
                    </div>
                    <div className="text-sm text-gray-600">Items Created</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {importResult.results.items.errors}
                    </div>
                    <div className="text-sm text-gray-600">Items Errors</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="font-medium">Files Processed:</h5>
                  {importResult.results.files.map(
                    (file: any, index: number) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium">{file.filename}:</span>
                        {file.error ? (
                          <span className="text-red-600 ml-2">
                            Error: {file.error}
                          </span>
                        ) : (
                          <span className="text-gray-600 ml-2">
                            {file.categories.created} categories,{" "}
                            {file.items.created} items
                          </span>
                        )}
                      </div>
                    )
                  )}
                </div>

                {importResult.results.errors.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-medium text-red-600">Errors:</h5>
                    <ul className="text-sm text-red-600 list-disc list-inside">
                      {importResult.results.errors.map(
                        (error: string, index: number) => (
                          <li key={index}>{error}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-green-200">
                  <button
                    onClick={clearSelections}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Import Another Menu
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
