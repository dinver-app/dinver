import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Blog, BlogUser } from "../../../interfaces/Interfaces";
import { toast } from "react-hot-toast";
import { Editor } from "@tinymce/tinymce-react";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { getBlogUsers } from "../../../services/blogService";

interface BlogFormProps {
  blog?: Blog | null;
  onSubmit: (data: Partial<Blog>) => void;
  onCancel: () => void;
}

const BlogForm = ({ blog, onSubmit, onCancel }: BlogFormProps) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState(blog?.title || "");
  const [content, setContent] = useState(blog?.content || "");
  const [excerpt, setExcerpt] = useState(blog?.excerpt || "");
  const [status, setStatus] = useState(blog?.status || "draft");
  const [category, setCategory] = useState(blog?.category || "");
  const [tags, setTags] = useState<string[]>(blog?.tags || []);
  const [language, setLanguage] = useState(blog?.language || "hr-HR");
  const [metaTitle, setMetaTitle] = useState(blog?.metaTitle || "");
  const [metaDescription, setMetaDescription] = useState(
    blog?.metaDescription || ""
  );
  const [keywords, setKeywords] = useState<string[]>(blog?.keywords || []);
  const [authors, setAuthors] = useState<BlogUser[]>([]);
  const [selectedAuthorId, setSelectedAuthorId] = useState(
    blog?.authorId || ""
  );
  const [featuredImage, setFeaturedImage] = useState<File | null>(null);

  useEffect(() => {
    const fetchAuthors = async () => {
      try {
        const data = await getBlogUsers();
        setAuthors(data);
      } catch (error) {
        console.error("Failed to fetch authors:", error);
        toast.error(t("failed_to_fetch_authors"));
      }
    };

    fetchAuthors();
  }, [t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    formData.append("excerpt", excerpt);
    formData.append("status", status);
    formData.append("category", category);
    formData.append("tags", JSON.stringify(tags));
    formData.append("language", language);
    formData.append("metaTitle", metaTitle);
    formData.append("metaDescription", metaDescription);
    formData.append("keywords", JSON.stringify(keywords));
    formData.append("authorId", selectedAuthorId);
    if (featuredImage) {
      formData.append("featuredImage", featuredImage);
    }

    onSubmit(Object.fromEntries(formData));
  };

  const handleTagsChange = (value: string) => {
    setTags(value.split(",").map((tag) => tag.trim()));
  };

  const handleKeywordsChange = (value: string) => {
    setKeywords(value.split(",").map((keyword) => keyword.trim()));
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center mb-6">
          <button
            onClick={onCancel}
            className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeftIcon className="h-6 w-6 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {blog ? t("edit_blog") : t("create_blog")}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {blog ? t("edit_blog_description") : t("create_blog_description")}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("title")}
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("content")}
                    </label>
                    <Editor
                      apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                      scriptLoading={{ async: true }}
                      value={content}
                      onEditorChange={(content: string) => setContent(content)}
                      init={{
                        height: 500,
                        menubar: true,
                        plugins: [
                          "advlist",
                          "autolink",
                          "lists",
                          "link",
                          "image",
                          "charmap",
                          "preview",
                          "anchor",
                          "searchreplace",
                          "visualblocks",
                          "code",
                          "fullscreen",
                          "insertdatetime",
                          "media",
                          "table",
                          "code",
                          "help",
                          "wordcount",
                          "emoticons",
                          "paste",
                        ],
                        toolbar:
                          "undo redo | formatselect | " +
                          "bold italic backcolor | alignleft aligncenter " +
                          "alignright alignjustify | bullist numlist outdent indent | " +
                          "removeformat | image media table | help",
                        content_style:
                          'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 14px }',
                        branding: false,
                        promotion: false,
                        language: "hr",
                        images_upload_handler: async function (blobInfo: {
                          blob: () => Blob;
                          filename: () => string;
                        }) {
                          const formData = new FormData();
                          formData.append(
                            "image",
                            blobInfo.blob(),
                            blobInfo.filename()
                          );

                          try {
                            // Ovdje trebaš implementirati endpoint za upload slika
                            const response = await fetch("/api/upload-image", {
                              method: "POST",
                              body: formData,
                            });

                            if (!response.ok) throw new Error("Upload failed");

                            const data = await response.json();
                            return data.location; // URL uploaded slike
                          } catch (e) {
                            console.error("Failed to upload image:", e);
                            throw e;
                          }
                        },
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("excerpt")}
                    </label>
                    <textarea
                      value={excerpt}
                      onChange={(e) => setExcerpt(e.target.value)}
                      rows={3}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-1 space-y-6">
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("status")}
                    </label>
                    <select
                      value={status}
                      onChange={(e) =>
                        setStatus(e.target.value as Blog["status"])
                      }
                      className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
                    >
                      <option value="draft">{t("draft")}</option>
                      <option value="published">{t("published")}</option>
                      <option value="archived">{t("archived")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("author")}
                    </label>
                    <select
                      value={selectedAuthorId}
                      onChange={(e) => setSelectedAuthorId(e.target.value)}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
                      required
                    >
                      <option value="">{t("select_author")}</option>
                      {authors.map((author) => (
                        <option key={author.id} value={author.id}>
                          {author.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("category")}
                    </label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("language")}
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
                    >
                      <option value="hr-HR">{t("croatian")}</option>
                      <option value="en-US">{t("english")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("tags")}
                    </label>
                    <input
                      type="text"
                      value={tags.join(", ")}
                      onChange={(e) => handleTagsChange(e.target.value)}
                      placeholder={t("tags_placeholder")}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("featured_image")}
                    </label>
                    {blog?.featuredImage && (
                      <div className="mt-2 mb-4">
                        <img
                          src={blog.featuredImage}
                          alt="Featured"
                          className="w-full max-w-md rounded-lg shadow-sm"
                        />
                      </div>
                    )}
                    <input
                      type="file"
                      onChange={(e) =>
                        setFeaturedImage(e.target.files?.[0] || null)
                      }
                      accept="image/*"
                      className="mt-1 block w-full p-2"
                    />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <h3 className="font-medium text-gray-900">
                    {t("seo_settings")}
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("meta_title")}
                    </label>
                    <input
                      type="text"
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("meta_description")}
                    </label>
                    <textarea
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      rows={2}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("keywords")}
                    </label>
                    <input
                      type="text"
                      value={keywords.join(", ")}
                      onChange={(e) => handleKeywordsChange(e.target.value)}
                      placeholder={t("keywords_placeholder")}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="h-line"></div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="secondary-button"
              >
                {t("cancel")}
              </button>
              <button type="submit" className="primary-button">
                {blog ? t("update") : t("create")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BlogForm;
