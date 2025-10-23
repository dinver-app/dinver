import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import {
  markReviewAsElite,
  removeEliteFromReview,
} from "../services/leaderboardCycleService";
import { getReviewById } from "../services/reviewService";
import ImageGallery from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";

const formatRating = (rating: number, language: string) => {
  return language === "hr"
    ? rating.toFixed(1).replace(".", ",")
    : rating.toFixed(1);
};

const ReviewDetails = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [review, setReview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEliteConfirm, setShowEliteConfirm] = useState(false);
  const [showRemoveEliteConfirm, setShowRemoveEliteConfirm] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (id) {
      fetchReviewDetails();
    }
  }, [id]);

  const fetchReviewDetails = async () => {
    try {
      setLoading(true);
      const reviewData = await getReviewById(id!);
      setReview(reviewData);
    } catch (error) {
      console.error("Failed to fetch review details:", error);
      toast.error(t("error_loading_review"));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsElite = async () => {
    if (!review) return;

    try {
      await markReviewAsElite(review.id);
      toast.success(t("review_marked_as_elite"));
      setReview({ ...review, isElite: true });
      setShowEliteConfirm(false);
    } catch (error) {
      console.error("Error marking review as elite:", error);
      toast.error(t("error_marking_review_elite"));
    }
  };

  const handleRemoveElite = async () => {
    if (!review) return;

    try {
      await removeEliteFromReview(review.id);
      toast.success(t("review_elite_removed"));
      setReview({ ...review, isElite: false });
      setShowRemoveEliteConfirm(false);
    } catch (error) {
      console.error("Error removing elite status:", error);
      toast.error(t("error_removing_elite_status"));
    }
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

  if (loading) {
    return (
      <div className="mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">{t("loading")}</div>
        </div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">{t("review_not_found")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto p-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/reviews")}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← {t("back_to_reviews")}
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("review_details")}
          </h1>
        </div>

        {/* Elite Status Button */}
        <div className="flex items-center gap-3">
          {review.isElite ? (
            <>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                ⭐ {t("elite_review")}
              </span>
              <button
                onClick={() => setShowRemoveEliteConfirm(true)}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 transition-colors"
              >
                {t("remove_elite")}
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowEliteConfirm(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-md hover:bg-yellow-700 transition-colors"
            >
              ⭐ {t("mark_as_elite")}
            </button>
          )}
        </div>
      </div>

      <div className="h-line mb-6"></div>

      {/* Review Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Restaurant Info */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {review.restaurantName}
          </h2>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>
              {review.userFirstName} {review.userLastName}
            </span>
            <span>•</span>
            <span>
              {format(new Date(review.createdAt), "dd.MM.yyyy. HH:mm")}
            </span>
          </div>
        </div>

        {/* Overall Rating */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-gray-900">
              {formatRating(review.rating, i18n.language)}
            </span>
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className={`text-2xl ${
                    i < Math.floor(review.rating)
                      ? "text-yellow-400"
                      : "text-gray-300"
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Ratings */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("detailed_ratings")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">
                {t("food_quality")}
              </span>
              <span className="text-lg font-bold text-gray-900">
                {formatRating(review.foodQuality, i18n.language)}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">
                {t("service")}
              </span>
              <span className="text-lg font-bold text-gray-900">
                {formatRating(review.service, i18n.language)}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">
                {t("atmosphere")}
              </span>
              <span className="text-lg font-bold text-gray-900">
                {formatRating(review.atmosphere, i18n.language)}
              </span>
            </div>
          </div>
        </div>

        {/* Comment */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            {t("comment")}
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700 leading-relaxed">
              {review.text || t("no_comment")}
            </p>
          </div>
        </div>

        {/* Images */}
        {review.photos && review.photos.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              {t("images")} ({review.photos.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {review.photos.map((image: string, index: number) => (
                <img
                  key={index}
                  src={image}
                  alt={`Review Image ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => openGallery(index)}
                />
              ))}
            </div>
          </div>
        )}

        {/* User Info */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            {t("user_information")}
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-600">
                  {t("name")}:
                </span>
                <p className="text-gray-900">
                  {review.userFirstName} {review.userLastName}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">
                  {t("email")}:
                </span>
                <p className="text-gray-900">{review.userEmail}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Elite Confirmation Modal */}
      {showEliteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <div className="flex items-center mb-4 gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⭐</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {t("mark_review_as_elite")}
                </h2>
                <p className="text-sm text-gray-500">
                  {t("elite_confirmation_subtitle")}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm">
                  <p>
                    <span className="font-medium">{t("user")}:</span>{" "}
                    {review.userFirstName} {review.userLastName}
                  </p>
                  <p>
                    <span className="font-medium">{t("restaurant")}:</span>{" "}
                    {review.restaurantName}
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <span className="font-medium">⚠️ {t("warning")}:</span>{" "}
                  {t("elite_review_warning")}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowEliteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleMarkAsElite}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-md hover:bg-yellow-700 transition-colors"
              >
                {t("mark_as_elite")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Elite Confirmation Modal */}
      {showRemoveEliteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <div className="flex items-center mb-4 gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {t("remove_elite_status")}
                </h2>
                <p className="text-sm text-gray-500">
                  {t("remove_elite_confirmation_subtitle")}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm">
                  <p>
                    <span className="font-medium">{t("user")}:</span>{" "}
                    {review.userFirstName} {review.userLastName}
                  </p>
                  <p>
                    <span className="font-medium">{t("restaurant")}:</span>{" "}
                    {review.restaurantName}
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <span className="font-medium">⚠️ {t("warning")}:</span>{" "}
                  {t("remove_elite_warning")}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRemoveEliteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleRemoveElite}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 transition-colors"
              >
                {t("remove_elite")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Gallery */}
      {isGalleryOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50"
          onClick={closeGallery}
        >
          <div className="relative">
            <button
              onClick={() => setIsGalleryOpen(false)}
              className="absolute top-0 right-0 mt-2 mr-2 text-white text-2xl z-10"
            >
              &times;
            </button>
            <ImageGallery
              items={review.photos.map((image: string) => ({
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

export default ReviewDetails;
