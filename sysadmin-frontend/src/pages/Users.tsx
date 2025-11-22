import { useState, useEffect, useRef } from "react";
import { listUsers, createUser, deleteUser } from "../services/userService";
import { getSubscribers } from "../services/newsletterService";
import {
  getWaitListEntries,
  getWaitListStats,
  WaitListEntry,
  WaitListStats,
} from "../services/waitListService";
import { format } from "date-fns";
import { User } from "../interfaces/Interfaces";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { setUserBanStatus } from "../services/sysadminService";

interface Subscriber {
  id: string;
  email: string;
  status: string;
  source: string;
  subscribedAt: string;
  unsubscribedAt: string | null;
  createdAt: string;
}

const Users = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState<User[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [waitListEntries, setWaitListEntries] = useState<WaitListEntry[]>([]);
  const [waitListStats, setWaitListStats] = useState<WaitListStats | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [subscribersPage, setSubscribersPage] = useState(1);
  const [waitListPage, setWaitListPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [subscribersTotalPages, setSubscribersTotalPages] = useState(1);
  const [waitListTotalPages, setWaitListTotalPages] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalSubscribers, setTotalSubscribers] = useState(0);
  const [totalWaitListEntries, setTotalWaitListEntries] = useState(0);
  const [newUser, setNewUser] = useState({
    email: "",
    name: "",
    password: "",
    banned: false,
  });
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [subscriberStatus, setSubscriberStatus] = useState<string>("");
  const [waitListType, setWaitListType] = useState<string>("");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [userToBan, setUserToBan] = useState<User | null>(null);
  const [isBanModalOpen, setBanModalOpen] = useState(false);

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers(currentPage, searchTerm);
    } else if (activeTab === "subscribers") {
      fetchSubscribers(subscribersPage, subscriberStatus);
    } else if (activeTab === "waitlist") {
      fetchWaitListEntries(waitListPage, waitListType);
    }
  }, [
    currentPage,
    subscribersPage,
    waitListPage,
    searchTerm,
    subscriberStatus,
    waitListType,
    activeTab,
  ]);

  const fetchSubscribers = async (page: number, status: string) => {
    const loadingToastId = toast.loading(t("loading"));
    try {
      const data = await getSubscribers(page, status);
      setSubscribers(data.subscribers);
      setSubscribersTotalPages(data.pagination.totalPages);
      setTotalSubscribers(data.pagination.total);
    } catch (error) {
      console.error("Failed to fetch subscribers", error);
      toast.error(t("failed_to_fetch_subscribers"));
    } finally {
      toast.dismiss(loadingToastId);
    }
  };

  const fetchWaitListEntries = async (page: number, type: string) => {
    const loadingToastId = toast.loading(t("loading"));
    try {
      const data = await getWaitListEntries(page, type);
      setWaitListEntries(data.data.entries);
      setWaitListTotalPages(data.data.pagination.totalPages);
      setTotalWaitListEntries(data.data.pagination.total);
    } catch (error) {
      console.error("Failed to fetch wait list entries", error);
      toast.error("Failed to fetch wait list entries");
    } finally {
      toast.dismiss(loadingToastId);
    }
  };

  const fetchWaitListStats = async () => {
    try {
      const stats = await getWaitListStats();
      setWaitListStats(stats);
    } catch (error) {
      console.error("Failed to fetch wait list stats", error);
    }
  };

  const fetchUsers = async (page: number, search: string) => {
    const loadingToastId = toast.loading(t("loading"));
    try {
      const data = await listUsers(page, search);
      setTotalUsers(data.totalUsers);
      setUsers(data.users);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      toast.dismiss(loadingToastId);
    }
  };

  const handlePageChange = (page: number) => {
    if (activeTab === "users") {
      setCurrentPage(page);
    } else if (activeTab === "subscribers") {
      setSubscribersPage(page);
    } else if (activeTab === "waitlist") {
      setWaitListPage(page);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchTerm("");
    if (tab === "users") {
      setCurrentPage(1);
    } else if (tab === "subscribers") {
      setSubscribersPage(1);
    } else if (tab === "waitlist") {
      setWaitListPage(1);
      fetchWaitListStats();
    }
  };

  const handleDeleteUser = async (email: string) => {
    try {
      await deleteUser(email);
      fetchUsers(currentPage, searchTerm);
      setDeleteModalOpen(false);
      toast.success(t("user_deleted_successfully"));
    } catch (error) {
      console.error("Failed to delete user", error);
    }
  };

  const handleCreateUser = async () => {
    try {
      const userToCreate = {
        ...newUser,
        role: "user",
      };
      await createUser(userToCreate);
      setModalOpen(false);
      setNewUser({
        email: "",
        name: "",
        password: "",
        banned: false,
      });
      fetchUsers(currentPage, searchTerm);
      toast.success(t("user_created_successfully"));
    } catch (error) {
      console.error("Failed to create user", error);
    }
  };

  const handleBanUser = async (email: string, banned: boolean) => {
    try {
      await setUserBanStatus(email, banned);
      fetchUsers(currentPage, searchTerm);
      setBanModalOpen(false);
      toast.success(
        banned ? t("user_banned_successfully") : t("user_unbanned_successfully")
      );
    } catch (error) {
      console.error(
        banned ? `Failed to ban user` : `Failed to unban user`,
        error
      );
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setSelectedUserId(null);
    }
  };

  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  return (
    <div className="mx-auto p-4">
      <div className="flex flex-col justify-between items-start mb-4">
        <h1 className="page-title">{t("users")}</h1>
        <h3 className="page-subtitle">{t("manage_users_and_subscribers")}</h3>
      </div>
      <div className="h-line mb-4"></div>

      <div className="flex mb-6">
        <button
          onClick={() => handleTabChange("users")}
          className={`py-2 px-4 border-b-2 text-sm ${
            activeTab === "users" ? "border-b-2 border-black" : "text-gray-500"
          }`}
        >
          {t("users")}
        </button>
        <button
          onClick={() => handleTabChange("subscribers")}
          className={`py-2 px-4 border-b-2 text-sm ${
            activeTab === "subscribers"
              ? "border-b-2 border-black"
              : "text-gray-500"
          }`}
        >
          {t("subscribers")}
        </button>
        <button
          onClick={() => handleTabChange("waitlist")}
          className={`py-2 px-4 border-b-2 text-sm ${
            activeTab === "waitlist"
              ? "border-b-2 border-black"
              : "text-gray-500"
          }`}
        >
          Wait List
        </button>
      </div>

      {activeTab === "users" ? (
        <>
          <div className="flex justify-between items-center mb-4">
            <input
              type="text"
              placeholder={t("search_users")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 text-xs border border-gray-300 rounded outline-gray-300"
            />
            <button
              onClick={() => setModalOpen(true)}
              className="primary-button"
            >
              {t("add_user")}
            </button>
          </div>
          <div className="rounded-lg border border-gray-200">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr className="text-sm text-black">
                  <th className="py-2 px-4 text-left font-normal w-64">
                    {t("email")}
                  </th>
                  <th className="py-2 px-4 text-left font-normal w-48">
                    {t("first_name")}
                  </th>
                  <th className="py-2 px-4 text-left font-normal w-48">
                    {t("last_name")}
                  </th>
                  <th className="py-2 px-4 text-left font-normal w-48">
                    {t("banned")}
                  </th>
                  <th className="py-2 px-4 text-left font-normal w-48">
                    {t("added_on")}
                  </th>
                  <th className="py-2 px-4 text-left w-10"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-100 border-b border-gray-200"
                  >
                    <td className="py-2 px-4 text-sm w-64">{user.email}</td>
                    <td className="py-2 px-4 text-sm text-gray-600 w-48">
                      {user.name}
                    </td>
                    <td className="py-2 px-4 text-sm text-gray-600 w-48">
                      {user.banned ? t("yes") : t("no")}
                    </td>
                    <td className="py-2 px-4 text-sm text-gray-600 w-48">
                      {format(new Date(user.createdAt || ""), "dd.MM.yyyy.")}
                    </td>
                    <td className="py-2 px-4 w-10">
                      <div className="relative" ref={menuRef}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUserId(
                              selectedUserId === user.id
                                ? null
                                : user.id || null
                            );
                          }}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          &#x22EE;
                        </button>
                        {selectedUserId === user.id && (
                          <div className="absolute top-5 right-0 mt-2 w-48 z-50 bg-white border rounded shadow-lg">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTimeout(() => {
                                  setUserToDelete(user.email);
                                  setDeleteModalOpen(true);
                                }, 0);
                                setSelectedUserId(null);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                            >
                              {t("delete_user")}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTimeout(() => {
                                  setUserToBan(user);
                                  setBanModalOpen(true);
                                }, 0);
                                setSelectedUserId(null);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                            >
                              {user.banned ? t("unban_user") : t("ban_user")}
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
              {(currentPage - 1) * 10 + 1} -{" "}
              {Math.min(currentPage * 10, totalUsers)} {t("of")} {totalUsers}
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
        </>
      ) : activeTab === "subscribers" ? (
        <>
          <div className="flex justify-between items-center mb-4">
            <select
              value={subscriberStatus}
              onChange={(e) => setSubscriberStatus(e.target.value)}
              className="px-3 py-2 text-xs border border-gray-300 rounded outline-gray-300"
            >
              <option value="">{t("all_subscribers")}</option>
              <option value="active">{t("active_subscribers")}</option>
              <option value="unsubscribed">{t("unsubscribed")}</option>
            </select>
          </div>
          <div className="rounded-lg border border-gray-200">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr className="text-sm text-black">
                  <th className="py-2 px-4 text-left font-normal">
                    {t("email")}
                  </th>
                  <th className="py-2 px-4 text-left font-normal">
                    {t("status")}
                  </th>
                  <th className="py-2 px-4 text-left font-normal">
                    {t("source")}
                  </th>
                  <th className="py-2 px-4 text-left font-normal">
                    {t("subscribed_at")}
                  </th>
                  <th className="py-2 px-4 text-left font-normal">
                    {t("unsubscribed_at")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((subscriber) => (
                  <tr
                    key={subscriber.id}
                    className="hover:bg-gray-100 border-b border-gray-200"
                  >
                    <td className="py-2 px-4 text-sm">{subscriber.email}</td>
                    <td className="py-2 px-4 text-sm">{subscriber.status}</td>
                    <td className="py-2 px-4 text-sm">{subscriber.source}</td>
                    <td className="py-2 px-4 text-sm">
                      {subscriber.subscribedAt
                        ? format(
                            new Date(subscriber.subscribedAt),
                            "dd.MM.yyyy."
                          )
                        : "-"}
                    </td>
                    <td className="py-2 px-4 text-sm">
                      {subscriber.unsubscribedAt
                        ? format(
                            new Date(subscriber.unsubscribedAt),
                            "dd.MM.yyyy."
                          )
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center mt-4">
            <span className="text-sm">
              {(subscribersPage - 1) * 10 + 1} -{" "}
              {Math.min(subscribersPage * 10, totalSubscribers)} {t("of")}{" "}
              {totalSubscribers}
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(subscribersPage - 1)}
                disabled={subscribersPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                &lt;
              </button>
              <button
                onClick={() => handlePageChange(subscribersPage + 1)}
                disabled={subscribersPage === subscribersTotalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                &gt;
              </button>
            </div>
          </div>
        </>
      ) : activeTab === "waitlist" ? (
        <>
          {/* Wait List Stats */}
          {waitListStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-blue-600">
                  {waitListStats.totalUsers}
                </div>
                <div className="text-sm text-gray-600">Total Users</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-green-600">
                  {waitListStats.totalRestaurants}
                </div>
                <div className="text-sm text-gray-600">Total Restaurants</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-purple-600">
                  {waitListStats.totalEntries}
                </div>
                <div className="text-sm text-gray-600">Total Entries</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-orange-600">
                  {waitListStats.cityStats.length}
                </div>
                <div className="text-sm text-gray-600">Cities</div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-4">
            <select
              value={waitListType}
              onChange={(e) => setWaitListType(e.target.value)}
              className="px-3 py-2 text-xs border border-gray-300 rounded outline-gray-300"
            >
              <option value="">All Types</option>
              <option value="user">Users</option>
              <option value="restaurant">Restaurants</option>
            </select>
          </div>
          <div className="rounded-lg border border-gray-200">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr className="text-sm text-black">
                  <th className="py-2 px-4 text-left font-normal">Email</th>
                  <th className="py-2 px-4 text-left font-normal">City</th>
                  <th className="py-2 px-4 text-left font-normal">Type</th>
                  <th className="py-2 px-4 text-left font-normal">
                    Restaurant Name
                  </th>
                  <th className="py-2 px-4 text-left font-normal">
                    Created At
                  </th>
                </tr>
              </thead>
              <tbody>
                {waitListEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-gray-100 border-b border-gray-200"
                  >
                    <td className="py-2 px-4 text-sm">{entry.email}</td>
                    <td className="py-2 px-4 text-sm">{entry.city}</td>
                    <td className="py-2 px-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          entry.type === "user"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {entry.type}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-sm">
                      {entry.restaurantName || "-"}
                    </td>
                    <td className="py-2 px-4 text-sm">
                      {format(new Date(entry.createdAt), "dd.MM.yyyy.")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center mt-4">
            <span className="text-sm">
              {(waitListPage - 1) * 10 + 1} -{" "}
              {Math.min(waitListPage * 10, totalWaitListEntries)} of{" "}
              {totalWaitListEntries}
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(waitListPage - 1)}
                disabled={waitListPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                &lt;
              </button>
              <button
                onClick={() => handlePageChange(waitListPage + 1)}
                disabled={waitListPage === waitListTotalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                &gt;
              </button>
            </div>
          </div>
        </>
      ) : null}

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
                src="/images/user.svg"
                alt="User Icon"
                className="w-12 h-12 mr-2 border border-gray-200 rounded-lg p-3"
              />
              <div>
                <h2 className="text-lg font-semibold">{t("add_user")}</h2>
                <p className="text-sm text-gray-500">
                  {t("add_user_description")}
                </p>
              </div>
            </div>
            <div className="h-line"></div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("email")}
              </label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
                className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("first_name")}
              </label>
              <input
                type="text"
                value={newUser.name}
                onChange={(e) =>
                  setNewUser({ ...newUser, name: e.target.value })
                }
                className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("password")}
              </label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) =>
                  setNewUser({ ...newUser, password: e.target.value })
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
                {t("cancel")}
              </button>
              <button onClick={handleCreateUser} className="primary-button">
                {t("add_user")}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setDeleteModalOpen(false)}
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
                <h2 className="text-lg font-semibold">{t("delete_user")}</h2>
                <p className="text-sm text-gray-500">
                  {t("delete_user_description")}
                </p>
              </div>
            </div>
            <div className="h-line"></div>
            <div className="mb-4">
              <p className="text-sm text-black">
                {t("are_you_sure_you_want_to_delete_the_user_with_email")}
                <span className="font-bold">{userToDelete}</span>?
              </p>
            </div>
            <div className="h-line"></div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="secondary-button"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => handleDeleteUser(userToDelete)}
                className="delete-button"
              >
                {t("delete_user")}
              </button>
            </div>
          </div>
        </div>
      )}

      {isBanModalOpen && userToBan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setBanModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <div className="flex items-center mb-4 gap-1">
              <img
                src="/images/block.svg"
                alt="Block Icon"
                className="w-12 h-12 mr-2 border border-gray-200 rounded-lg p-3"
              />
              <div>
                <h2 className="text-lg font-semibold">
                  {userToBan.banned === true ? t("unban_user") : t("ban_user")}
                </h2>
                <p className="text-sm text-gray-500">
                  {userToBan.banned === true
                    ? t("unban_user_description")
                    : t("ban_user_description")}
                </p>
              </div>
            </div>
            <div className="h-line"></div>
            <div className="mb-4">
              <p className="text-sm text-black">
                {userToBan.banned === true
                  ? t("are_you_sure_you_want_to_unban_the_user_with_email")
                  : t("are_you_sure_you_want_to_ban_the_user_with_email")}
                <span className="font-bold"> {userToBan.email}</span>?
              </p>
            </div>
            <div className="h-line"></div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setBanModalOpen(false)}
                className="secondary-button"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() =>
                  handleBanUser(userToBan.email, !userToBan.banned)
                }
                className="primary-button"
              >
                {userToBan.banned === true ? t("unban_user") : t("ban_user")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
