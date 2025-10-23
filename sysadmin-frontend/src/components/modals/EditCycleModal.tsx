import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../../components/Modal";
import {
  leaderboardCycleService,
  LeaderboardCycle,
  UpdateCycleData,
} from "../../services/leaderboardCycleService";
import toast from "react-hot-toast";
import { PhotoIcon } from "@heroicons/react/24/outline";
import RichTextEditor from "../../components/RichTextEditor";

interface EditCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCycleUpdated: () => void;
  cycle: LeaderboardCycle | null;
}

const EditCycleModal: React.FC<EditCycleModalProps> = ({
  isOpen,
  onClose,
  onCycleUpdated,
  cycle,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<UpdateCycleData>({
    name: "",
    description: "",
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
    if (cycle) {
      // Convert ISO dates to datetime-local format (treat as local time)
      const formatDateForInput = (isoDate: string) => {
        // Remove 'Z' to treat as local time, not UTC
        return isoDate.replace("Z", "").slice(0, 16); // YYYY-MM-DDTHH:MM
      };

      setFormData({
        name: cycle.name,
        description: cycle.description || "",
        startDate: formatDateForInput(cycle.startDate),
        endDate: formatDateForInput(cycle.endDate),
        numberOfWinners: cycle.numberOfWinners,
        guaranteeFirstPlace: cycle.guaranteeFirstPlace,
      });
    }
  }, [cycle]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = "Cycle name is required";
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
    // Clear error when user starts typing
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
      // If there's a new image, use the image update endpoint
      if (headerImage) {
        await leaderboardCycleService.updateCycleWithImage(cycle.id, {
          name: formData.name || "",
          description: formData.description,
          startDate: formData.startDate || "",
          endDate: formData.endDate || "",
          numberOfWinners: formData.numberOfWinners || 1,
          guaranteeFirstPlace: formData.guaranteeFirstPlace || false,
          headerImage: headerImage,
        });
      } else {
        await leaderboardCycleService.updateCycle(cycle.id, formData);
      }

      toast.dismiss(loadingToast);
      toast.success(t("cycle_updated_successfully"));
      onCycleUpdated();
      onClose();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(t("failed_to_update_cycle"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    if (!isUpdating) {
      setHeaderImage(null);
      setImagePreview(null);
      setErrors({});
      onClose();
    }
  };

  if (!cycle) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("edit_cycle")}
      size="2xl"
    >
      <div className="space-y-6">
        {/* Cycle Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("cycle_name")} *
          </label>
          <input
            type="text"
            value={formData.name || ""}
            onChange={(e) => handleInputChange("name", e.target.value)}
            className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Enter cycle name"
            disabled={isUpdating}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("cycle_description")}
          </label>
          <RichTextEditor
            content={formData.description || ""}
            onChange={(content) => handleInputChange("description", content)}
            placeholder="Enter cycle description..."
            disabled={isUpdating}
          />
          <p className="mt-1 text-sm text-gray-500">
            Use the toolbar above to format your text with bold, italic,
            headings, lists, and more.
          </p>
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
                <div className="text-sm text-gray-500">
                  Current header image
                </div>
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
                      <span>{t("upload_header_image")}</span>
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
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              disabled={isUpdating}
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
              disabled={isUpdating}
            />
            {errors.endDate && (
              <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
            )}
          </div>
        </div>

        {/* Winner Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            {t("winner_settings")}
          </h3>

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
              disabled={isUpdating}
            />
            {errors.numberOfWinners && (
              <p className="mt-1 text-sm text-red-600">
                {errors.numberOfWinners}
              </p>
            )}
          </div>

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
                disabled={isUpdating}
              />
            </div>
            <div className="ml-3 text-sm">
              <label
                htmlFor="guarantee-first-place"
                className="font-medium text-gray-700"
              >
                {t("guarantee_first_place")}
              </label>
              <p className="text-gray-500">{t("guarantee_first_place_info")}</p>
            </div>
          </div>
        </div>

        {/* Cycle Status Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Cycle Status: {t(cycle.status)}
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                {cycle.status === "active" && (
                  <p>
                    This cycle is currently active. Changes to dates and winner
                    settings may affect ongoing participation.
                  </p>
                )}
                {cycle.status === "scheduled" && (
                  <p>
                    This cycle is scheduled to start. You can modify all
                    settings before it becomes active.
                  </p>
                )}
                {cycle.status === "completed" && (
                  <p>
                    This cycle has ended. Only name and description can be
                    modified.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            disabled={isUpdating}
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={handleUpdate}
            disabled={isUpdating}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? t("updating") : t("edit_cycle")}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default EditCycleModal;
