import { useEffect, useState, useRef } from "react";
import {
  listSysadmins,
  removeSysadmin,
  addSysadmin,
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
  const [isAddModalOpen, setModalOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleAddSysadmin = async () => {
    if (!newAdminEmail) return;
    setIsSubmitting(true);
    try {
      await addSysadmin(newAdminEmail);
      await fetchSysadmins();
      toast.success(t("sysadmin_added_successfully"));
      setNewAdminEmail("");
      setModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || t("failed_to_add_sysadmin"));
    } finally {
      setIsSubmitting(false);
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
                      {sysadmin.user.name}
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

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {t("log_details")}
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">
                    {t("user")}
                  </h4>
                  <p className="text-gray-900">
                    {getUserEmail(selectedLog.userId)}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">
                    {t("restaurant")}
                  </h4>
                  <p className="text-gray-900">
                    {getRestaurantName(selectedLog.restaurantId)}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">
                    {t("action")}
                  </h4>
                  <p className="text-gray-900">{t(selectedLog.action)}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">
                    {t("entity")}
                  </h4>
                  <p className="text-gray-900">{t(selectedLog.entity)}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">
                    {t("date")}
                  </h4>
                  <p className="text-gray-900">
                    {format(
                      new Date(selectedLog.createdAt),
                      "dd.MM.yyyy. HH:mm"
                    )}
                  </p>
                </div>
              </div>

              {/* Changes */}
              {selectedLog.changes && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">
                    {t("changes")}
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                      {selectedLog.changes}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedLog(null)}
                className="secondary-button px-6 py-3"
              >
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Sysadmin Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{t("add_sysadmin")}</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                &times;
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("email")}
              </label>
              <input
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newAdminEmail && !isSubmitting) {
                    handleAddSysadmin();
                  }
                }}
                placeholder="name@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded outline-gray-300"
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="secondary-button px-4 py-2"
                disabled={isSubmitting}
              >
                {t("close")}
              </button>
              <button
                onClick={handleAddSysadmin}
                className="primary-button px-4 py-2 disabled:opacity-50"
                disabled={!newAdminEmail || isSubmitting}
              >
                {isSubmitting ? t("loading") : t("add_sysadmin")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
