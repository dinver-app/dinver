import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../../components/Modal";
import {
  leaderboardCycleService,
  CreateCycleData,
} from "../../services/leaderboardCycleService";
import toast from "react-hot-toast";
import { PhotoIcon } from "@heroicons/react/24/outline";
import RichTextEditor from "../../components/RichTextEditor";

interface CreateCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCycleCreated: () => void;
}

const CreateCycleModal: React.FC<CreateCycleModalProps> = ({
  isOpen,
  onClose,
  onCycleCreated,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<CreateCycleData>({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    numberOfWinners: 1,
    guaranteeFirstPlace: false,
  });
  const [headerImage, setHeaderImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Cycle name is required";
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    } else if (new Date(formData.startDate) <= new Date()) {
      newErrors.startDate = "Start date must be in the future";
    }

    if (!formData.endDate) {
      newErrors.endDate = "End date is required";
    } else if (
      formData.startDate &&
      new Date(formData.endDate) <= new Date(formData.startDate)
    ) {
      newErrors.endDate = "End date must be after start date";
    }

    if (formData.numberOfWinners < 1) {
      newErrors.numberOfWinners = "Number of winners must be at least 1";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof CreateCycleData, value: any) => {
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

  const handleCreate = async () => {
    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    const loadingToast = toast.loading(t("creating"));

    try {
      await leaderboardCycleService.createCycle({
        ...formData,
        headerImage: headerImage || undefined,
      });

      // Reset form
      setFormData({
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        numberOfWinners: 1,
        guaranteeFirstPlace: false,
      });
      setHeaderImage(null);
      setImagePreview(null);
      setErrors({});

      toast.dismiss(loadingToast);
      toast.success(t("cycle_created_successfully"));
      onCycleCreated();
      onClose();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(t("failed_to_create_cycle"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setFormData({
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        numberOfWinners: 1,
        guaranteeFirstPlace: false,
      });
      setHeaderImage(null);
      setImagePreview(null);
      setErrors({});
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("create_cycle")}
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
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Enter cycle name"
            disabled={isCreating}
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
            disabled={isCreating}
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
                    disabled={isCreating}
                  >
                    Remove image
                  </button>
                </div>
              ) : (
                <div>
                  <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="header-image"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>{t("upload_header_image")}</span>
                      <input
                        id="header-image"
                        name="header-image"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleImageChange}
                        disabled={isCreating}
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
              value={formData.startDate}
              onChange={(e) => handleInputChange("startDate", e.target.value)}
              className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.startDate ? "border-red-500" : "border-gray-300"
              }`}
              disabled={isCreating}
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
              value={formData.endDate}
              onChange={(e) => handleInputChange("endDate", e.target.value)}
              className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.endDate ? "border-red-500" : "border-gray-300"
              }`}
              disabled={isCreating}
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
              value={formData.numberOfWinners}
              onChange={(e) =>
                handleInputChange("numberOfWinners", parseInt(e.target.value))
              }
              className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.numberOfWinners ? "border-red-500" : "border-gray-300"
              }`}
              disabled={isCreating}
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
                checked={formData.guaranteeFirstPlace}
                onChange={(e) =>
                  handleInputChange("guaranteeFirstPlace", e.target.checked)
                }
                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                disabled={isCreating}
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

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            disabled={isCreating}
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? t("creating") : t("create_cycle")}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateCycleModal;
