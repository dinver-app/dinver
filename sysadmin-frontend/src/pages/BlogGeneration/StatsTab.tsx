import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  getBlogStats,
  BlogStats,
  deleteBlog,
} from "../../services/blogService";
import { getTopics, BlogTopic } from "../../services/blogTopicService";
import {
  EyeIcon,
  HandThumbUpIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

const StatsTab = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<BlogStats | null>(null);
  const [topics, setTopics] = useState<BlogTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [statsData, topicsData] = await Promise.all([
        getBlogStats(),
        getTopics({ limit: 100 }),
      ]);
      setStats(statsData);
      // Filter topics that have at least one blog
      const topicsWithBlogs = topicsData.topics.filter(
        (t) => t.blogHr || t.blogEn
      );
      setTopics(topicsWithBlogs);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteBlog = async (
    e: React.MouseEvent,
    blogId: string
  ) => {
    e.stopPropagation();
    if (!window.confirm("Sigurno želiš obrisati ovaj blog?")) return;

    setIsDeleting(blogId);
    try {
      await deleteBlog(blogId);
      toast.success("Blog obrisan");
      fetchData();
    } catch (error) {
      console.error("Failed to delete blog:", error);
      toast.error("Greška pri brisanju bloga");
    } finally {
      setIsDeleting(null);
    }
  };

  // Helper to truncate text
  const truncateText = (text: string | undefined, maxLength: number) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Ukupno blogova"
            value={stats.total}
            subtext={`${stats.published} objavljeno, ${stats.draft} skica`}
            icon={<DocumentTextIcon className="w-5 h-5" />}
          />
          <StatCard
            title="Ukupno pregleda"
            value={stats.totalViews.toLocaleString()}
            subtext={`Prosjek: ${stats.avgViewsPerBlog}/blog`}
            icon={<EyeIcon className="w-5 h-5" />}
          />
          <StatCard
            title="Ukupno reakcija"
            value={(stats.totalLikes + stats.totalDislikes).toLocaleString()}
            subtext={`${stats.totalLikes} 👍 / ${stats.totalDislikes} 👎`}
            icon={<HandThumbUpIcon className="w-5 h-5" />}
          />
          <StatCard
            title="Engagement Rate"
            value={`${stats.engagementRate}%`}
            subtext="Reakcije / Pregledi"
            icon={<ArrowTrendingUpIcon className="w-5 h-5" />}
          />
        </div>
      )}

      {/* Blogs List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5" />
            Svi blogovi
          </h3>
        </div>

        {topics.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nema generiranih blogova.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {topics.map((topic) => {
              const blogId = topic.blogHr?.id || topic.blogEn?.id;
              const hrTitle = topic.blogHr?.title || topic.title;
              const excerpt = topic.blogHr?.excerpt || topic.blogEn?.excerpt || topic.description;

              return (
                <div
                  key={topic.id}
                  onClick={() => navigate(`/blog-generation/topic/${topic.id}`)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900">
                        {hrTitle}
                      </h4>
                      {excerpt && (
                        <p className="text-sm text-gray-500 mt-1">
                          {truncateText(excerpt, 100)}
                        </p>
                      )}
                    </div>

                    {/* Delete button */}
                    <div className="ml-4 flex items-center gap-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          topic.status === "published"
                            ? "bg-green-100 text-green-700"
                            : topic.status === "review_ready"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {topic.status}
                      </span>
                      {blogId && (
                        <button
                          onClick={(e) => handleDeleteBlog(e, blogId)}
                          disabled={isDeleting === blogId}
                          className="text-red-400 hover:text-red-600 disabled:opacity-50 p-1"
                          title="Obriši blog"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtext: string;
  icon: React.ReactNode;
}

const StatCard = ({ title, value, subtext, icon }: StatCardProps) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4">
    <div className="flex items-center gap-2 text-gray-500 mb-2">
      {icon}
      <span className="text-sm font-medium">{title}</span>
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    <p className="text-xs text-gray-500 mt-1">{subtext}</p>
  </div>
);

export default StatsTab;
