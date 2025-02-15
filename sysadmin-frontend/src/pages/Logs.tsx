import { useState, useEffect } from "react";
import { getAuditLogs } from "../services/auditLogsService";
import { listAllUsers } from "../services/userService";
import { getAllRestaurants } from "../services/restaurantService"; // Pretpostavljam da postoji ovaj servis
import { useTranslation } from "react-i18next";
import { AuditLog, User, Restaurant } from "../interfaces/Interfaces"; // Pretpostavi da su definirani
import { format } from "date-fns";
import ReactJson from "react-json-view";

const Logs = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [actionFilter, setActionFilter] = useState("ALL");

  useEffect(() => {
    fetchData();
  }, [currentPage, searchTerm, actionFilter]);

  const fetchData = async () => {
    try {
      const [logsData, usersData, restaurantsData] = await Promise.all([
        getAuditLogs(
          currentPage,
          searchTerm,
          actionFilter !== "ALL" ? actionFilter : ""
        ),
        listAllUsers(),
        getAllRestaurants(),
      ]);
      setLogs(logsData.logs);
      setTotalPages(logsData.totalPages);
      setUsers(usersData);
      setRestaurants(restaurantsData);
    } catch (error) {
      console.error("Failed to fetch data", error);
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

  const handleCloseModal = () => {
    setSelectedLog(null);
  };

  return (
    <div className="mx-auto p-4">
      <div className="flex flex-col justify-between items-start mb-4">
        <h1 className="page-title">{t("logs")}</h1>
        <h3 className="page-subtitle">{t("list_of_all_logs")}</h3>
      </div>
      <div className="h-line mb-4"></div>
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder={t("search_logs")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
                      {format(new Date(log.createdAt), "dd.MM.yyyy HH:mm")}
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

      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative overflow-y-auto max-h-full">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <div className="flex items-center mb-4 gap-1">
              <img
                src="/images/log_details.svg"
                alt="Log Details Icon"
                className="w-12 h-12 mr-2 border border-gray-200 rounded-lg p-3"
              />
              <div>
                <h2 className="text-lg font-semibold">{t("log_details")}</h2>
                <p className="text-sm text-gray-500">{t("view_log_details")}</p>
              </div>
            </div>
            <div className="h-line mb-4"></div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold">{t("userId")}</h3>
              <p className="text-xs text-gray-600">{selectedLog.userId}</p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold">{t("userEmail")}</h3>
              <p className="text-xs text-gray-600">
                {getUserEmail(selectedLog.userId)}
              </p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold">{t("action")}</h3>
              <p className="text-xs text-gray-600">{t(selectedLog.action)}</p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold">{t("entity")}</h3>
              <p className="text-xs text-gray-600">{t(selectedLog.entity)}</p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold">{t("restaurantId")}</h3>
              <p className="text-xs text-gray-600">
                {selectedLog.restaurantId}
              </p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold">{t("restaurantName")}</h3>
              <p className="text-xs text-gray-600">
                {getRestaurantName(selectedLog.restaurantId)}
              </p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold">{t("date")}</h3>
              <p className="text-xs text-gray-600">
                {format(new Date(selectedLog.createdAt), "dd.MM.yyyy HH:mm")}
              </p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold">{t("changes")}</h3>
              <ReactJson
                src={JSON.parse(selectedLog.changes)}
                name={false}
                collapsed={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logs;
