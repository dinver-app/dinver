import { useState, useEffect } from "react";
import { getPaginatedReviewsForClaimedRestaurants } from "../services/reviewService";
import { useTranslation } from "react-i18next";
import { Review } from "../interfaces/Interfaces";

// Define the type for restaurant and rev
const Reviews = () => {
  const { t } = useTranslation();
  const [reviewsData, setReviewsData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedReview, setSelectedReview] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchReviews();
  }, [currentPage, searchTerm]);

  const fetchReviews = async () => {
    try {
      const { reviewsData, totalPages } =
        await getPaginatedReviewsForClaimedRestaurants(currentPage, searchTerm);
      setReviewsData(reviewsData);
      setTotalPages(totalPages);
    } catch (error) {
      console.error("Failed to fetch reviews", error);
    }
  };

  const handleOpenModal = (review: any, restaurantName: string) => {
    setSelectedReview({ review, restaurant: restaurantName });
  };

  const handleCloseModal = () => {
    setSelectedReview(null);
  };

  const truncateComment = (comment: string | null, maxLength: number) => {
    if (!comment) return "-";
    return comment.length > maxLength
      ? comment.slice(0, maxLength) + "..."
      : comment;
  };

  return (
    <div className="mx-auto p-4">
      <div className="flex flex-col justify-between items-start mb-4">
        <h1 className="page-title">{t("reviews")}</h1>
        <h3 className="page-subtitle">{t("list_of_all_reviews")}</h3>
      </div>
      <div className="h-line mb-4"></div>
      <div className="flex justify-start mb-4">
        <input
          type="text"
          placeholder={t("search")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-2 text-xs border border-gray-300 rounded outline-gray-300"
        />
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
                  <th className="py-2 px-4 text-left font-normal w-40">
                    {t("rating")}
                  </th>
                  <th className="py-2 px-4 text-left font-normal w-64">
                    {t("comment")}
                  </th>
                  <th className="py-2 px-4 text-left font-normal w-48">
                    {t("user")}
                  </th>
                  <th className="py-2 px-4 text-left font-normal w-10"></th>
                </tr>
              </thead>
              <tbody>
                {reviewsData.map((restaurant) =>
                  restaurant.reviews.map((review: Review) => (
                    <tr
                      key={review.id}
                      className="hover:bg-gray-100 border-b border-gray-200"
                    >
                      <td className="py-2 px-4 text-sm w-64">
                        {restaurant.restaurant}
                      </td>
                      <td className="py-2 px-4 text-sm text-gray-600 w-40">
                        {review.rating.toFixed(1)}
                      </td>
                      <td className="py-2 px-4 text-sm text-gray-600 w-64">
                        {truncateComment(review.comment, 30)}
                      </td>
                      <td className="py-2 px-4 text-sm text-gray-600 w-48">
                        {review.userFirstName} {review.userLastName}
                      </td>
                      <td className="py-2 px-4 text-sm text-gray-600 w-10">
                        <button
                          onClick={() =>
                            handleOpenModal(review, restaurant.restaurant)
                          }
                          className="text-blue-500 hover:text-blue-700"
                        >
                          ...
                        </button>
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

      {selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative overflow-y-auto max-h-full">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <div className="flex items-center mb-4 gap-1">
              <img
                src="/images/review.svg"
                alt="Review Details Icon"
                className="w-12 h-12 mr-2 border border-gray-200 rounded-lg p-3"
              />
              <div>
                <h2 className="text-lg font-semibold">{t("review_details")}</h2>
                <p className="text-sm text-gray-500">
                  {t("view_review_details")}
                </p>
              </div>
            </div>
            <div className="h-line mb-4"></div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold">{t("restaurant")}</h3>
              <p className="text-xs text-gray-600">
                {selectedReview.restaurant}
              </p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold">{t("rating")}</h3>
              <p className="text-xs text-gray-600">
                {selectedReview.review.rating.toFixed(1)}
              </p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold">{t("comment")}</h3>
              <p className="text-xs text-gray-600">
                {selectedReview.review.comment || "-"}
              </p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold">{t("user")}</h3>
              <p className="text-xs text-gray-600">
                {selectedReview.review.userFirstName}{" "}
                {selectedReview.review.userLastName}
              </p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold">{t("images")}</h3>
              <div className="flex gap-2">
                {selectedReview.review.images &&
                  selectedReview.review.images.map(
                    (image: string, index: number) => (
                      <img
                        key={index}
                        src={image}
                        alt={`Review Image ${index + 1}`}
                        className="w-16 h-16 object-cover"
                      />
                    )
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reviews;
