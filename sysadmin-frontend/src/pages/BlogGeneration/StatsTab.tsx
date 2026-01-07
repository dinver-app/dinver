import { useState, useEffect } from "react";
import {
  getBlogStats,
  getBlogStatsDetailed,
  BlogStats,
  BlogStatsDetail,
} from "../../services/blogService";
import {
  Eye,
  ThumbsUp,
  ThumbsDown,
  FileText,
  BarChart3,
  TrendingUp,
  ExternalLink,
} from "lucide-react";

const StatsTab = () => {
  const [stats, setStats] = useState<BlogStats | null>(null);
  const [detailedStats, setDetailedStats] = useState<BlogStatsDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState("viewCount");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const [statsData, detailedData] = await Promise.all([
          getBlogStats(),
          getBlogStatsDetailed(sortBy, "DESC", 20),
        ]);
        setStats(statsData);
        setDetailedStats(detailedData.blogs);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [sortBy]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("hr-HR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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
            icon={<FileText className="w-5 h-5" />}
          />
          <StatCard
            title="Ukupno pregleda"
            value={stats.totalViews.toLocaleString()}
            subtext={`Prosjek: ${stats.avgViewsPerBlog}/blog`}
            icon={<Eye className="w-5 h-5" />}
          />
          <StatCard
            title="Ukupno reakcija"
            value={(stats.totalLikes + stats.totalDislikes).toLocaleString()}
            subtext={`${stats.totalLikes} 👍 / ${stats.totalDislikes} 👎`}
            icon={<ThumbsUp className="w-5 h-5" />}
          />
          <StatCard
            title="Engagement Rate"
            value={`${stats.engagementRate}%`}
            subtext="Reakcije / Pregledi"
            icon={<TrendingUp className="w-5 h-5" />}
          />
        </div>
      )}

      {/* Detailed Blog Stats Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Statistike po blogu
          </h3>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          >
            <option value="viewCount">Najviše pregleda</option>
            <option value="likesCount">Najviše lajkova</option>
            <option value="dislikesCount">Najviše dislajkova</option>
            <option value="publishedAt">Najnoviji</option>
          </select>
        </div>

        {detailedStats.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nema objavljenih blogova za prikaz statistike.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Blog
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pregledi
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    👍
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    👎
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Like Ratio
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Engagement
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Objavljeno
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Link
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {detailedStats.map((blog) => (
                  <tr key={blog.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="max-w-xs">
                        <p className="font-medium text-gray-900 truncate">
                          {blog.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {blog.author} •{" "}
                          {blog.language === "hr-HR" ? "HR" : "EN"}
                          {blog.category && ` • ${blog.category}`}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 text-gray-700">
                        <Eye className="w-4 h-4 text-gray-400" />
                        {blog.viewCount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-green-600 font-medium">
                      {blog.likesCount}
                    </td>
                    <td className="px-4 py-4 text-center text-red-500 font-medium">
                      {blog.dislikesCount}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <LikeRatioBar ratio={blog.likeRatio} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          blog.engagementRate >= 5
                            ? "bg-green-100 text-green-700"
                            : blog.engagementRate >= 2
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {blog.engagementRate}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-gray-500">
                      {formatDate(blog.publishedAt)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <a
                        href={`https://dinver.app/blog/${blog.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-black transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

interface LikeRatioBarProps {
  ratio: number;
}

const LikeRatioBar = ({ ratio }: LikeRatioBarProps) => {
  const hasReactions = ratio > 0;

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${
            ratio >= 70
              ? "bg-green-500"
              : ratio >= 50
              ? "bg-yellow-500"
              : "bg-red-500"
          }`}
          style={{ width: hasReactions ? `${ratio}%` : "0%" }}
        />
      </div>
      <span className="text-xs text-gray-500 w-10">
        {hasReactions ? `${ratio}%` : "-"}
      </span>
    </div>
  );
};

export default StatsTab;
