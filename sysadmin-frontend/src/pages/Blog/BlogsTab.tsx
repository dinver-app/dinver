import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Blog, BlogUser } from "../../interfaces/Interfaces";
import { toast } from "react-hot-toast";
import ConfirmModal from "../../components/ConfirmModal";
import BlogForm from "./components/BlogForm";
import BlogPreview from "./components/BlogPreview";
import {
  getBlogs,
  deleteBlog,
  createBlog,
  updateBlog,
  getBlogUsers,
} from "../../services/blogService";

const BlogsTab = () => {
  const { t } = useTranslation();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [blogUsers, setBlogUsers] = useState<BlogUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [blogToDelete, setBlogToDelete] = useState<Blog | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewBlog, setPreviewBlog] = useState<Blog | null>(null);

  useEffect(() => {
    fetchBlogs();
    fetchBlogUsers();
  }, []);

  const fetchBlogs = async () => {
    setIsLoading(true);
    try {
      const data = await getBlogs();
      setBlogs(data);
    } catch (error) {
      console.error("Failed to fetch blogs:", error);
      toast.error(t("failed_to_fetch_blogs"));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBlogUsers = async () => {
    const data = await getBlogUsers();
    setBlogUsers(data);
    console.log(data);
  };

  const handleCreate = () => {
    setSelectedBlog(null);
    setShowForm(true);
  };

  const handleEdit = (blog: Blog) => {
    setSelectedBlog(blog);
    setShowForm(true);
  };

  const handleDelete = (blog: Blog) => {
    setBlogToDelete(blog);
    setShowDeleteModal(true);
  };

  const handlePreview = (blog: Blog) => {
    setPreviewBlog(blog);
    setShowPreview(true);
  };

  const confirmDelete = async () => {
    if (!blogToDelete) return;

    try {
      await deleteBlog(blogToDelete.id);
      toast.success(t("blog_deleted"));
      fetchBlogs();
    } catch (error) {
      console.error("Failed to delete blog:", error);
      toast.error(t("failed_to_delete_blog"));
    } finally {
      setShowDeleteModal(false);
      setBlogToDelete(null);
    }
  };

  const handleFormSubmit = async (formData: Partial<Blog>) => {
    try {
      if (selectedBlog) {
        await updateBlog(selectedBlog.id, formData as FormData);
        toast.success(t("blog_updated"));
      } else {
        await createBlog(formData as FormData);
        toast.success(t("blog_created"));
      }
      setShowForm(false);
      fetchBlogs();
    } catch (error) {
      console.error("Failed to save blog:", error);
      toast.error(t("failed_to_save_blog"));
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">{t("loading")}...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col gap-1">
          <h2 className="section-title">{t("blogs")}</h2>
          <h3 className="section-subtitle">{t("manage_blog_posts")}</h3>
        </div>
        <button onClick={handleCreate} className="primary-button">
          {t("create_blog")}
        </button>
      </div>

      <div className="rounded-lg border border-gray-200">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr className="text-sm text-black">
              <th className="py-2 px-4 text-left font-normal">{t("title")}</th>
              <th className="py-2 px-4 text-left font-normal">{t("author")}</th>
              <th className="py-2 px-4 text-left font-normal">{t("status")}</th>
              <th className="py-2 px-4 text-left font-normal">
                {t("language")}
              </th>
              <th className="py-2 px-4 text-right font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {blogs.map((blog) => (
              <tr
                key={blog.id}
                className="hover:bg-gray-100 border-b border-gray-200"
              >
                <td className="py-2 px-4">
                  <div className="text-sm font-medium text-gray-900">
                    {blog.title}
                  </div>
                  <div className="text-sm text-gray-500">{blog.excerpt}</div>
                </td>
                <td className="py-2 px-4 text-sm text-gray-600">
                  {blogUsers.find((user) => user.id === blog.authorId)?.name}
                </td>
                <td className="py-2 px-4">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      blog.status === "published"
                        ? "bg-green-100 text-green-800"
                        : blog.status === "draft"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {blog.status}
                  </span>
                </td>
                <td className="py-2 px-4 text-sm text-gray-600">
                  {blog.language}
                </td>
                <td className="py-2 px-4 text-right">
                  <button
                    onClick={() => handleEdit(blog)}
                    className="text-black border border-gray-400 rounded px-2 py-1 text-xs mr-2 transition-colors duration-200 hover:bg-gray-200"
                  >
                    {t("edit")}
                  </button>
                  <button
                    onClick={() => handleDelete(blog)}
                    className="text-black border border-gray-400 rounded px-2 py-1 text-xs mr-2 transition-colors duration-200 hover:bg-gray-200"
                  >
                    {t("delete")}
                  </button>
                  <button
                    onClick={() => handlePreview(blog)}
                    className="text-black border border-gray-400 rounded px-2 py-1 text-xs transition-colors duration-200 hover:bg-gray-200"
                  >
                    {t("preview")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <BlogForm
          blog={selectedBlog}
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}

      {showPreview && previewBlog && (
        <BlogPreview
          blog={previewBlog}
          author={blogUsers.find((user) => user.id === previewBlog.authorId)}
          onClose={() => setShowPreview(false)}
        />
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title={t("confirm_delete")}
        message={t("confirm_delete_blog_message")}
      />
    </div>
  );
};

export default BlogsTab;
