import { useState, useEffect, useRef } from "react";
import { listUsers, createUser, deleteUser } from "../services/userService";
import { format } from "date-fns";
import { User } from "../interfaces/Interfaces";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { setUserBanStatus } from "../services/sysadminService";

const Users = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [newUser, setNewUser] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    banned: false,
  });
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [userToBan, setUserToBan] = useState<User | null>(null);
  const [isBanModalOpen, setBanModalOpen] = useState(false);

  useEffect(() => {
    fetchUsers(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  const fetchUsers = async (page: number, search: string) => {
    try {
      const data = await listUsers(page, search);
      setTotalUsers(data.totalUsers);
      setUsers(data.users);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("Failed to fetch users", error);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDeleteUser = async (email: string) => {
    try {
      await deleteUser(email);
      fetchUsers(currentPage, searchTerm);
      setDeleteModalOpen(false);
      toast.success("User deleted successfully");
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
        firstName: "",
        lastName: "",
        password: "",
        banned: false,
      });
      fetchUsers(currentPage, searchTerm);
      toast.success("User created successfully");
    } catch (error) {
      console.error("Failed to create user", error);
    }
  };

  const handleBanUser = async (email: string, banned: boolean) => {
    try {
      await setUserBanStatus(email, banned);
      fetchUsers(currentPage, searchTerm);
      setBanModalOpen(false);
      toast.success(`User ${banned ? "banned" : "unbanned"} successfully`);
    } catch (error) {
      console.error(`Failed to ${banned ? "ban" : "unban"} user`, error);
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
        <h3 className="page-subtitle">{t("list_of_all_users")}</h3>
      </div>
      <div className="h-line mb-4"></div>
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder={t("search_users")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-2 text-xs border border-gray-300 rounded outline-gray-300"
        />
        <button onClick={() => setModalOpen(true)} className="primary-button">
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
                  {user.firstName}
                </td>
                <td className="py-2 px-4 text-sm text-gray-600 w-48">
                  {user.lastName}
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
                          selectedUserId === user.id ? null : user.id || null
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
                          Delete
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
                          className="block w-full text-left px-4 py-2 text-sm text-yellow-600 hover:bg-gray-100"
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
          {Math.min(currentPage * 10, totalUsers)} of {totalUsers}
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
                value={newUser.firstName}
                onChange={(e) =>
                  setNewUser({ ...newUser, firstName: e.target.value })
                }
                className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("last_name")}
              </label>
              <input
                type="text"
                value={newUser.lastName}
                onChange={(e) =>
                  setNewUser({ ...newUser, lastName: e.target.value })
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
              <img
                src="/images/trash.svg"
                alt="Trash Icon"
                className="w-12 h-12 mr-2 border border-gray-200 rounded-lg p-3"
              />
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
                <span className="font-bold">{userToBan.email}</span>?
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
