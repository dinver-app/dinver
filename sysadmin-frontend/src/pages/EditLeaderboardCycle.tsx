import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  leaderboardCycleService,
  LeaderboardCycle,
  UpdateCycleData,
} from "../services/leaderboardCycleService";
import toast from "react-hot-toast";
import { ArrowLeftIcon, PhotoIcon } from "@heroicons/react/24/outline";
import RichTextEditor from "../components/RichTextEditor";

const EditLeaderboardCycle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [cycle, setCycle] = useState<LeaderboardCycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<UpdateCycleData>({
    nameEn: "",
    nameHr: "",
    descriptionEn: "",
    descriptionHr: "",
    startDate: "",
    endDate: "",
    numberOfWinners: 1,
    guaranteeFirstPlace: false,
  });
  const [headerImage, setHeaderImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadCycle();
  }, [id]);

  const loadCycle = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const cycleData = await leaderboardCycleService.getCycleById(id);
      setCycle(cycleData);

      // Convert ISO dates to datetime-local format
      const formatDateForInput = (isoDate: string) => {
        return isoDate.replace("Z", "").slice(0, 16); // YYYY-MM-DDTHH:MM
      };

      setFormData({
        nameEn: cycleData.nameEn,
        nameHr: cycleData.nameHr,
        descriptionEn: cycleData.descriptionEn || "",
        descriptionHr: cycleData.descriptionHr || "",
        startDate: formatDateForInput(cycleData.startDate),
        endDate: formatDateForInput(cycleData.endDate),
        numberOfWinners: cycleData.numberOfWinners,
        guaranteeFirstPlace: cycleData.guaranteeFirstPlace,
      });
    } catch (error) {
      console.error("Error loading cycle:", error);
      toast.error("Failed to load cycle");
      navigate("/leaderboard-cycles");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nameEn) {
      newErrors.nameEn = "English name is required";
    }
    if (!formData.nameHr) {
      newErrors.nameHr = "Croatian name is required";
    }
    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }
    if (!formData.endDate) {
      newErrors.endDate = "End date is required";
    } else if (
      formData.startDate &&
      new Date(formData.endDate) <= new Date(formData.startDate)
    ) {
      newErrors.endDate = "End date must be after start date";
    }
    if (formData.numberOfWinners && formData.numberOfWinners < 1) {
      newErrors.numberOfWinners = "Number of winners must be at least 1";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof UpdateCycleData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setHeaderImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = async () => {
    if (!cycle || !validateForm()) {
      return;
    }

    setIsUpdating(true);
    const loadingToast = toast.loading(t("updating"));

    try {
      if (headerImage) {
        await leaderboardCycleService.updateCycleWithImage(cycle.id, {
          nameEn: formData.nameEn || cycle.nameEn,
          nameHr: formData.nameHr || cycle.nameHr,
          descriptionEn: formData.descriptionEn,
          descriptionHr: formData.descriptionHr,
          startDate: formData.startDate || "",
          endDate: formData.endDate || "",
          numberOfWinners: formData.numberOfWinners || 1,
          guaranteeFirstPlace: formData.guaranteeFirstPlace || false,
          headerImage: headerImage,
        });
      } else {
        await leaderboardCycleService.updateCycle(cycle.id, {
          ...formData,
          nameEn: formData.nameEn || cycle.nameEn,
          nameHr: formData.nameHr || cycle.nameHr,
        });
      }

      toast.dismiss(loadingToast);
      toast.success(t("cycle_updated_successfully"));
      navigate(`/leaderboard-cycles/${cycle.id}`);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(t("failed_to_update_cycle"));
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse h-6 w-40 bg-gray-200 rounded mb-4" />
        <div className="space-y-4">
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-32 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (!cycle) {
    return null;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t("edit_cycle")}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {cycle.isAutoGenerated && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 mr-2">
                    Auto-generated
                  </span>
                )}
                Status: {t(cycle.status)}
              </p>
            </div>
          </div>
        </div>

        {/* Status Info */}
        {cycle.status === "active" && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This cycle is currently active. Changes to
              dates and winner settings may affect ongoing participation.
            </p>
          </div>
        )}
        {cycle.status === "completed" && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-6">
            <p className="text-sm text-gray-800">
              <strong>Note:</strong> This cycle has ended. Only name and
              description can be modified.
            </p>
          </div>
        )}
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg p-6 space-y-6">
        {/* Cycle Names */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("cycle_name")} (English) *
            </label>
            <input
              type="text"
              value={formData.nameEn || ""}
              onChange={(e) => handleInputChange("nameEn", e.target.value)}
              className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.nameEn ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Enter cycle name in English"
              disabled={isUpdating}
            />
            {errors.nameEn && (
              <p className="mt-1 text-sm text-red-600">{errors.nameEn}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("cycle_name")} (Croatian) *
            </label>
            <input
              type="text"
              value={formData.nameHr || ""}
              onChange={(e) => handleInputChange("nameHr", e.target.value)}
              className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.nameHr ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Enter cycle name in Croatian"
              disabled={isUpdating}
            />
            {errors.nameHr && (
              <p className="mt-1 text-sm text-red-600">{errors.nameHr}</p>
            )}
          </div>
        </div>

        {/* Descriptions */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("cycle_description")} (English)
            </label>
            <RichTextEditor
              content={formData.descriptionEn || ""}
              onChange={(content) =>
                handleInputChange("descriptionEn", content)
              }
              placeholder="Enter cycle description in English..."
              disabled={isUpdating}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("cycle_description")} (Croatian)
            </label>
            <RichTextEditor
              content={formData.descriptionHr || ""}
              onChange={(content) =>
                handleInputChange("descriptionHr", content)
              }
              placeholder="Enter cycle description in Croatian..."
              disabled={isUpdating}
            />
          </div>
        </div>

        {/* Header Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("cycle_header_image")}
          </label>

          {/* Current Image */}
          {cycle.headerImageUrl && !imagePreview && (
            <div className="mb-4">
              <div className="flex items-center space-x-4">
                <img
                  src={cycle.headerImageUrl}
                  alt="Current header"
                  className="h-20 w-auto object-cover rounded"
                />
                <div className="text-sm text-gray-500">Current header image</div>
              </div>
            </div>
          )}

          {/* Image Upload */}
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              {imagePreview ? (
                <div className="space-y-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="mx-auto h-32 w-auto object-cover rounded"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setHeaderImage(null);
                      setImagePreview(null);
                    }}
                    className="text-sm text-red-600 hover:text-red-500"
                    disabled={isUpdating}
                  >
                    Remove new image
                  </button>
                </div>
              ) : (
                <div>
                  <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="header-image-edit"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="header-image-edit"
                        name="header-image-edit"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleImageChange}
                        disabled={isUpdating}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("start_date")} *
            </label>
            <input
              type="datetime-local"
              value={formData.startDate || ""}
              onChange={(e) => handleInputChange("startDate", e.target.value)}
              className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.startDate ? "border-red-500" : "border-gray-300"
              }`}
              disabled={isUpdating || cycle.status === "completed"}
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("end_date")} *
            </label>
            <input
              type="datetime-local"
              value={formData.endDate || ""}
              onChange={(e) => handleInputChange("endDate", e.target.value)}
              className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.endDate ? "border-red-500" : "border-gray-300"
              }`}
              disabled={isUpdating || cycle.status === "completed"}
            />
            {errors.endDate && (
              <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
            )}
          </div>
        </div>

        {/* Winner Settings */}
        <div className="border-t pt-6 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            {t("winner_settings")}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("number_of_winners")} *
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.numberOfWinners || 1}
                onChange={(e) =>
                  handleInputChange("numberOfWinners", parseInt(e.target.value))
                }
                className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.numberOfWinners ? "border-red-500" : "border-gray-300"
                }`}
                disabled={isUpdating || cycle.status === "completed"}
              />
              {errors.numberOfWinners && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.numberOfWinners}
                </p>
              )}
            </div>

            <div className="flex items-center">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="guarantee-first-place"
                    type="checkbox"
                    checked={formData.guaranteeFirstPlace || false}
                    onChange={(e) =>
                      handleInputChange("guaranteeFirstPlace", e.target.checked)
                    }
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    disabled={isUpdating || cycle.status === "completed"}
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label
                    htmlFor="guarantee-first-place"
                    className="font-medium text-gray-700"
                  >
                    {t("guarantee_first_place")}
                  </label>
                  <p className="text-gray-500">
                    Top player guaranteed to win 1st place
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isUpdating}
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={handleUpdate}
            disabled={isUpdating}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? t("updating") : t("save_changes")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditLeaderboardCycle;
