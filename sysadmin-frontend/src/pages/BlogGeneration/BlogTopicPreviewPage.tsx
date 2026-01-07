import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  ArrowLeftIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  BlogTopic,
  getTopic,
  approveTopic,
  rejectTopic,
} from "../../services/blogTopicService";
import { apiClient } from "../../services/authService";

const BlogTopicPreviewPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<BlogTopic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeLanguage, setActiveLanguage] = useState<"hr" | "en">("hr");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTopic();
    }
  }, [id]);

  const fetchTopic = async () => {
    setIsLoading(true);
    try {
      const data = await getTopic(id!);
      setTopic(data);
      // If no HR blog but EN exists, switch to EN
      if (!data.blogHr && data.blogEn) {
        setActiveLanguage("en");
      }
    } catch (error) {
      console.error("Failed to fetch topic:", error);
      toast.error("Greska pri dohvacanju teme");
      navigate("/blog-generation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!topic) return;
    try {
      await approveTopic(topic.id);
      toast.success("Tema odobrena i blogovi objavljeni");
      fetchTopic();
    } catch (error) {
      console.error("Failed to approve topic:", error);
      toast.error("Greska pri odobravanju");
    }
  };

  const handleReject = async () => {
    if (!topic) return;
    const feedback = prompt("Unesite razlog odbijanja (opcionalno):");
    try {
      await rejectTopic(topic.id, feedback || undefined);
      toast.success("Tema odbijena i vracena u red");
      fetchTopic();
    } catch (error) {
      console.error("Failed to reject topic:", error);
      toast.error("Greska pri odbijanju");
    }
  };

  const handleDeleteBlog = async (blogId: string, language: string) => {
    if (!window.confirm(`Sigurno zelis obrisati ${language} blog?`)) return;

    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/sysadmin/blogs/${blogId}`);
      toast.success(`${language} blog obrisan`);
      fetchTopic();
    } catch (error) {
      console.error("Failed to delete blog:", error);
      toast.error("Greska pri brisanju bloga");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Tema nije pronadena</p>
      </div>
    );
  }

  const activeBlog = activeLanguage === "hr" ? topic.blogHr : topic.blogEn;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/blog-generation")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{topic.title}</h1>
            <p className="text-sm text-gray-500">
              Status: <span className="font-medium">{topic.status}</span>
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {topic.status === "review_ready" && (
            <>
              <button
                onClick={handleApprove}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckIcon className="w-4 h-4" />
                Odobri
              </button>
              <button
                onClick={handleReject}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
                Odbij
              </button>
            </>
          )}
        </div>
      </div>

      {/* Language Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {topic.blogHr && (
          <button
            onClick={() => setActiveLanguage("hr")}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeLanguage === "hr"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Hrvatski
          </button>
        )}
        {topic.blogEn && (
          <button
            onClick={() => setActiveLanguage("en")}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeLanguage === "en"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            English
          </button>
        )}
      </div>

      {/* Blog Content */}
      {activeBlog ? (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {/* Featured Image */}
          {activeBlog.featuredImageUrl && (
            <div className="aspect-video w-full overflow-hidden">
              <img
                src={activeBlog.featuredImageUrl}
                alt={activeBlog.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-8">
            {/* Blog Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {activeBlog.title}
                </h2>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>Status: {activeBlog.status}</span>
                  <span>Kategorija: {activeBlog.category || "N/A"}</span>
                </div>
              </div>
              <button
                onClick={() => handleDeleteBlog(activeBlog.id, activeLanguage === "hr" ? "HR" : "EN")}
                disabled={isDeleting}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Obrisi blog"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Excerpt */}
            {activeBlog.excerpt && (
              <div className="mb-6 text-lg text-gray-700 italic border-l-4 border-blue-500 pl-4 bg-blue-50 py-3">
                {activeBlog.excerpt}
              </div>
            )}

            {/* SEO Info */}
            <details className="mb-6 bg-gray-50 rounded-lg p-4">
              <summary className="font-medium text-gray-900 cursor-pointer">
                SEO Metadata
              </summary>
              <div className="mt-3 space-y-2 text-sm">
                <div>
                  <span className="font-medium">Meta Title:</span>{" "}
                  <span className="text-gray-700">{activeBlog.metaTitle || "N/A"}</span>
                  {activeBlog.metaTitle && (
                    <span className="ml-2 text-xs text-gray-400">
                      ({activeBlog.metaTitle.length}/60)
                    </span>
                  )}
                </div>
                <div>
                  <span className="font-medium">Meta Description:</span>{" "}
                  <span className="text-gray-700">{activeBlog.metaDescription || "N/A"}</span>
                  {activeBlog.metaDescription && (
                    <span className="ml-2 text-xs text-gray-400">
                      ({activeBlog.metaDescription.length}/160)
                    </span>
                  )}
                </div>
                <div>
                  <span className="font-medium">Keywords:</span>{" "}
                  <span className="text-gray-700">{activeBlog.keywords?.join(", ") || "N/A"}</span>
                </div>
                <div>
                  <span className="font-medium">Tags:</span>{" "}
                  <span className="text-gray-700">{activeBlog.tags?.join(", ") || "N/A"}</span>
                </div>
                <div>
                  <span className="font-medium">Slug:</span>{" "}
                  <code className="text-gray-700 bg-gray-200 px-1 rounded">{activeBlog.slug}</code>
                </div>
              </div>
            </details>

            {/* Content */}
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: activeBlog.content || "" }}
            />

            {/* LinkedIn Post */}
            {((activeLanguage === "hr" && topic.linkedInPostHr) ||
              (activeLanguage === "en" && topic.linkedInPostEn)) && (
              <details className="mt-8 bg-blue-50 rounded-lg p-4">
                <summary className="font-medium text-gray-900 cursor-pointer">
                  LinkedIn Post
                </summary>
                <div className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
                  {activeLanguage === "hr" ? topic.linkedInPostHr : topic.linkedInPostEn}
                </div>
              </details>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <p className="text-gray-500">
            Nema generiranog bloga za {activeLanguage === "hr" ? "hrvatski" : "engleski"} jezik
          </p>
        </div>
      )}

      {/* Topic Metadata */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border p-6">
        <h3 className="font-medium text-gray-900 mb-4">Detalji teme</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Tip:</span>{" "}
            <span className="text-gray-900">{topic.topicType}</span>
          </div>
          <div>
            <span className="text-gray-500">Prioritet:</span>{" "}
            <span className="text-gray-900">{topic.priority}/10</span>
          </div>
          <div>
            <span className="text-gray-500">Ciljna publika:</span>{" "}
            <span className="text-gray-900">{topic.targetAudience || "N/A"}</span>
          </div>
          <div>
            <span className="text-gray-500">Kljucne rijeci:</span>{" "}
            <span className="text-gray-900">{topic.targetKeywords?.join(", ") || "N/A"}</span>
          </div>
          {topic.completedStages && topic.completedStages.length > 0 && (
            <div className="col-span-2">
              <span className="text-gray-500">Checkpoint:</span>{" "}
              <span className="text-gray-900">{topic.completedStages.join(", ")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlogTopicPreviewPage;
