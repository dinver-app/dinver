import { useState, useEffect } from "react";
import { getPaginatedReviewsForClaimedRestaurants } from "../services/reviewService";
import { useTranslation } from "react-i18next";
import { Review } from "../interfaces/Interfaces";
import { format } from "date-fns";
import ImageGallery from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";
import { toast } from "react-hot-toast";

const formatRating = (rating: number, language: string) => {
  return language === "hr"
    ? rating.toFixed(1).replace(".", ",")
    : rating.toFixed(1);
};

const Reviews = () => {
  const { t, i18n } = useTranslation();
  const [reviewsData, setReviewsData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedReview, setSelectedReview] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("date_desc");
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

  const openGallery = (index: number) => {
    setCurrentImageIndex(index);
    setIsGalleryOpen(true);
  };

  const closeGallery = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setIsGalleryOpen(false);
    }
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
                {formatRating(selectedReview.review.rating, i18n.language)}
              </p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2">
                {t("detailed_ratings")}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-xs text-gray-600">
                    {t("food_quality")}
                  </span>
                  <span className="text-xs font-medium">
                    {formatRating(
                      selectedReview.review.foodQuality,
                      i18n.language
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-xs text-gray-600">{t("service")}</span>
                  <span className="text-xs font-medium">
                    {formatRating(selectedReview.review.service, i18n.language)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-xs text-gray-600">
                    {t("atmosphere")}
                  </span>
                  <span className="text-xs font-medium">
                    {formatRating(
                      selectedReview.review.atmosphere,
                      i18n.language
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold">{t("comment")}</h3>
              <p className="text-xs text-gray-600">
                {selectedReview.review.text || "-"}
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
                {selectedReview.review.photos &&
                selectedReview.review.photos.length > 0 ? (
                  selectedReview.review.photos.map(
                    (image: string, index: number) => (
                      <img
                        key={index}
                        src={image}
                        alt={`Review Image ${index + 1}`}
                        className="w-16 h-16 object-cover cursor-pointer"
                        onClick={() => openGallery(index)}
                      />
                    )
                  )
                ) : (
                  <p className="text-xs text-gray-600">
                    {t("no_images_in_review")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isGalleryOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50"
          onClick={closeGallery}
        >
          <div className="relative">
            <button
              onClick={() => setIsGalleryOpen(false)}
              className="absolute top-0 right-0 mt-2 mr-2 text-white text-2xl"
            >
              &times;
            </button>
            <ImageGallery
              items={selectedReview.review.images.map((image: string) => ({
                original: image,
              }))}
              startIndex={currentImageIndex}
              showThumbnails={false}
              showFullscreenButton={false}
              showPlayButton={false}
              showBullets={true}
              onImageLoad={() => window.dispatchEvent(new Event("resize"))}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Reviews;
