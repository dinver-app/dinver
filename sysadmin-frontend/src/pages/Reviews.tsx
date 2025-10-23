import { useState, useEffect } from "react";
import { getPaginatedReviewsForClaimedRestaurants } from "../services/reviewService";
import { useTranslation } from "react-i18next";
import { Review } from "../interfaces/Interfaces";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { markReviewAsElite } from "../services/leaderboardCycleService";
import { useNavigate } from "react-router-dom";

const formatRating = (rating: number, language: string) => {
  return language === "hr"
    ? rating.toFixed(1).replace(".", ",")
    : rating.toFixed(1);
};

const Reviews = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [reviewsData, setReviewsData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("date_desc");

  useEffect(() => {
    fetchReviews();
  }, [currentPage, searchTerm, sortOption]);

  const fetchReviews = async () => {
    const loadingToastId = toast.loading(t("loading"));
    try {
      const { reviewsData, totalPages } =
        await getPaginatedReviewsForClaimedRestaurants(
          currentPage,
          searchTerm,
          10,
          sortOption
        );
      setReviewsData(reviewsData);
      setTotalPages(totalPages);
    } catch (error) {
      console.error("Failed to fetch reviews", error);
    } finally {
      toast.dismiss(loadingToastId);
    }
  };

  const truncateComment = (comment: string | null, maxLength: number) => {
    if (!comment) return "-";
    return comment.length > maxLength
      ? comment.slice(0, maxLength) + "..."
      : comment;
  };

  const handleReviewClick = (reviewId: string) => {
    navigate(`/reviews/${reviewId}`);
  };

  return (
    <div className="mx-auto p-4">
      <div className="flex flex-col justify-between items-start mb-4">
        <h1 className="page-title">{t("reviews")}</h1>
        <h3 className="page-subtitle">{t("list_of_all_reviews")}</h3>
      </div>
      <div className="h-line mb-4"></div>
      <div className="flex justify-between mb-4">
        <input
          type="text"
          placeholder={t("search")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-2 text-xs border border-gray-300 rounded outline-gray-300"
        />
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="px-3 py-2 text-xs border border-gray-300 rounded outline-gray-300"
        >
          <option value="date_desc">{t("date_desc")}</option>
          <option value="date_asc">{t("date_asc")}</option>
          <option value="rating_desc">{t("rating_desc")}</option>
          <option value="rating_asc">{t("rating_asc")}</option>
        </select>
      </div>
      {reviewsData.length === 0 ? (
        <div className="text-center text-gray-500">
          {t("no_reviews_available")}
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr className="text-sm text-black">
                  <th className="py-2 px-4 text-left font-normal w-64">
                    {t("restaurant")}
                  </th>
                  <th className="py-2 px-4 text-left font-normal w-48">
                    {t("user")}
                  </th>
                  <th className="py-2 px-4 text-left font-normal w-64">
                    {t("comment")}
                  </th>
                  <th className="py-2 px-4 text-left font-normal w-48">
                    {t("date")}
                  </th>
                  <th className="py-2 px-4 text-center font-normal w-32">
                    {t("rating")}
                  </th>
                  <th className="py-2 px-4 text-center font-normal w-20">
                    {t("elite")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {reviewsData.map((restaurant) =>
                  restaurant.reviews.map((review: Review) => (
                    <tr
                      key={review.id}
                      className="hover:bg-gray-100 border-b border-gray-200 cursor-pointer"
                      onClick={() => handleReviewClick(review.id)}
                    >
                      <td className="py-2 px-4 text-sm w-64">
                        {restaurant.restaurant}
                      </td>
                      <td className="py-2 px-4 text-sm text-gray-600 w-48">
                        {review.userFirstName} {review.userLastName}
                      </td>
                      <td className="py-2 px-4 text-sm text-gray-600 w-64">
                        {truncateComment(review.text, 30)}
                      </td>
                      <td className="py-2 px-4 text-sm text-gray-600 w-48">
                        {format(
                          new Date(review.createdAt ?? ""),
                          "dd.MM.yyyy. HH:mm"
                        )}
                      </td>
                      <td className="py-2 px-4 text-sm text-center text-gray-600 w-32">
                        {formatRating(review.rating, i18n.language)}
                      </td>
                      <td className="py-2 px-4 text-sm text-center w-20">
                        {review.isElite ? (
                          <span className="text-green-600 font-bold text-lg">
                            ✓
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
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
    </div>
  );
};

export default Reviews;
