import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { BlogUser } from "../../interfaces/Interfaces";
import { toast } from "react-hot-toast";
import ConfirmModal from "../../components/ConfirmModal";
import {
  getBlogUsers,
  deleteBlogUser,
  createBlogUser,
  updateBlogUser,
} from "../../services/blogService";

const BlogUsersTab = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<BlogUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<BlogUser | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<BlogUser | null>(null);
  const [newUser, setNewUser] = useState({
    name: "",
    profileImage: null as File | null,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await getBlogUsers();
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch blog users:", error);
      toast.error(t("failed_to_fetch_blog_users"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedUser(null);
    setNewUser({ name: "", profileImage: null });
    setModalOpen(true);
  };

  const handleEdit = (user: BlogUser) => {
    setSelectedUser(user);
    setNewUser({ name: user.name, profileImage: null });
    setModalOpen(true);
  };

  const handleDelete = (user: BlogUser) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      await deleteBlogUser(userToDelete.id);
      toast.success(t("blog_user_deleted"));
      fetchUsers();
    } catch (error) {
      console.error("Failed to delete blog user:", error);
      toast.error(t("failed_to_delete_blog_user"));
    } finally {
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  const handleFormSubmit = async () => {
    try {
      const formData = new FormData();
      formData.append("name", newUser.name);
      if (newUser.profileImage) {
        formData.append("profileImage", newUser.profileImage);
      }

      if (selectedUser) {
        await updateBlogUser(selectedUser.id, formData);
        toast.success(t("blog_user_updated"));
      } else {
        await createBlogUser(formData);
        toast.success(t("blog_user_created"));
      }
      setModalOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Failed to save blog user:", error);
      toast.error(t("failed_to_save_blog_user"));
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">{t("loading")}...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col gap-1">
          <h2 className="section-title">{t("blog_users")}</h2>
          <h3 className="section-subtitle">{t("manage_blog_users")}</h3>
        </div>
        <button onClick={handleCreate} className="primary-button">
          {t("create_blog_user")}
        </button>
      </div>

      <div className="rounded-lg border border-gray-200">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr className="text-sm text-black">
              <th className="py-2 px-4 text-left font-normal">
                {t("profile_image")}
              </th>
              <th className="py-2 px-4 text-left font-normal">{t("name")}</th>
              <th className="py-2 px-4 text-right font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-gray-100 border-b border-gray-200"
              >
                <td className="py-2 px-4">
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    {user.profileImage && (
                      <img
                        src={user.profileImage}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                </td>
                <td className="py-2 px-4">
                  <div className="text-sm font-medium text-gray-900">
                    {user.name}
                  </div>
                </td>
                <td className="py-2 px-4 text-right">
                  <button
                    onClick={() => handleEdit(user)}
                    className="text-black border border-gray-400 rounded px-2 py-1 text-xs mr-2 transition-colors duration-200 hover:bg-gray-200"
                  >
                    {t("edit")}
                  </button>
                  <button
                    onClick={() => handleDelete(user)}
                    className="text-black border border-gray-400 rounded px-2 py-1 text-xs transition-colors duration-200 hover:bg-gray-200"
                  >
                    {t("delete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
                <h2 className="text-lg font-semibold">
                  {selectedUser ? t("edit_blog_user") : t("add_blog_user")}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedUser
                    ? t("edit_blog_user_description")
                    : t("add_blog_user_description")}
                </p>
              </div>
            </div>
            <div className="h-line"></div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("name")}
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
                {t("profile_image")}
              </label>
              <input
                type="file"
                onChange={(e) =>
                  setNewUser({
                    ...newUser,
                    profileImage: e.target.files?.[0] || null,
                  })
                }
                accept="image/*"
                className="mt-1 block w-full"
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
              <button onClick={handleFormSubmit} className="primary-button">
                {selectedUser ? t("update") : t("create")}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title={t("confirm_delete")}
        message={t("confirm_delete_blog_user_message")}
      />
    </div>
  );
};

export default BlogUsersTab;
