import { Blog, BlogUser } from "../../../interfaces/Interfaces";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

interface BlogPreviewProps {
  blog: Blog;
  author: BlogUser | undefined;
  onClose: () => void;
}

const BlogPreview = ({ blog, author, onClose }: BlogPreviewProps) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-[800px] max-h-[90vh] overflow-y-auto">
        {/* Simple header with close button */}
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-xl font-semibold">{t("blog_preview")}</h2>
            <p className="text-sm text-gray-500">
              {t("preview_the_blog_post")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Blog content */}
        <div className="px-6 py-8">
          {/* Featured Image */}
          {blog.featuredImage && (
            <div className="mb-8 rounded-lg overflow-hidden max-h-[400px]">
              <img
                src={blog.featuredImage}
                alt={blog.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Author and Date */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                {author?.profileImage ? (
                  <img
                    src={author.profileImage}
                    alt={author.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-500 font-medium">
                    {author?.name?.charAt(0)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <span className="font-medium">{author?.name}</span>
              <span>•</span>
              <span>{format(new Date(blog.createdAt), "MMMM d, yyyy")}</span>
            </div>
          </div>

          {/* Tags */}
          {blog.tags && blog.tags.length > 0 && (
            <div className="flex gap-2 mb-6">
              {blog.tags.map((tag, index) => (
                <span
                  key={index}
                  className="bg-gray-100 text-gray-600 px-4 py-1 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl font-bold mb-8">{blog.title}</h1>

          {/* Content */}
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />
        </div>
      </div>
    </div>
  );
};

export default BlogPreview;
