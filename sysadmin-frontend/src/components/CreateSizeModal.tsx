import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Language } from "../interfaces/Interfaces";
import { createSize } from "../services/sizeService";
import { translateText } from "../services/translateService";
import { MdTranslate } from "react-icons/md";
import toast from "react-hot-toast";

interface CreateSizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSizeCreated: (size: { id: string; name: string }) => void;
  restaurantId: string;
}

const CreateSizeModal: React.FC<CreateSizeModalProps> = ({
  isOpen,
  onClose,
  onSizeCreated,
  restaurantId,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Language>(Language.HR);
  const [translations, setTranslations] = useState<
    Record<Language, { name: string }>
  >({
    [Language.HR]: { name: "" },
    [Language.EN]: { name: "" },
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    const translatesArray = Object.entries(translations)
      .filter(([_, value]) => value.name.trim() !== "")
      .map(([language, value]) => ({
        name: value.name.trim(),
        language: language as string,
      }));

    if (translatesArray.length === 0) {
      toast.error(t("size_name_required"));
      return;
    }

    setIsCreating(true);
    const loadingToast = toast.loading(t("creating"));

    try {
      const newSize = await createSize({
        restaurantId,
        translations: translatesArray,
        isActive: true,
      });

      onSizeCreated({
        id: newSize.id,
        name: newSize.name,
      });

      // Reset form
      setTranslations({
        [Language.HR]: { name: "" },
        [Language.EN]: { name: "" },
      });

      toast.dismiss(loadingToast);
      toast.success(t("size_created_successfully"));
      onClose();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(t("failed_to_create_size"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleTranslate = async () => {
    try {
      const sourceText = translations[activeTab].name;
      if (!sourceText.trim()) {
        toast.error(t("nothing_to_translate"));
        return;
      }

      const targetLang = activeTab === Language.HR ? Language.EN : Language.HR;
      const translatedText = await translateText(
        sourceText,
        targetLang.toLowerCase()
      );

      setTranslations((prev) => ({
        ...prev,
        [targetLang]: {
          ...prev[targetLang],
          name: translatedText,
        },
      }));

      toast.success(t("translation_success"));
    } catch (error) {
      toast.error(t("translation_failed"));
    }
  };

  const isLanguageValid = (lang: Language) => {
    const translation = translations[lang];
    return translation.name.trim() !== "";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          {t("create_new_size")}
        </h2>

        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => setActiveTab(Language.HR)}
            className={`px-4 py-2 rounded-md text-sm ${
              activeTab === Language.HR
                ? "bg-green-700 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {t("croatian")}
          </button>
          <button
            onClick={() => setActiveTab(Language.EN)}
            className={`px-4 py-2 rounded-md text-sm ${
              activeTab === Language.EN
                ? "bg-green-700 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {t("english")}
          </button>
        </div>

        <div className="flex space-x-4 mb-4">
          <div className="flex items-center">
            <div
              className={`w-3 h-3 rounded-full mr-2 ${
                isLanguageValid(Language.HR) ? "bg-green-500" : "bg-gray-300"
              }`}
            />
            <span className="text-sm text-gray-600">{t("croatian")}</span>
          </div>
          <div className="flex items-center">
            <div
              className={`w-3 h-3 rounded-full mr-2 ${
                isLanguageValid(Language.EN) ? "bg-green-500" : "bg-gray-300"
              }`}
            />
            <span className="text-sm text-gray-600">{t("english")}</span>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              {t("name")} (
              {activeTab === Language.HR ? t("croatian") : t("english")})
            </label>
            <button
              onClick={handleTranslate}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
              title={t("translate")}
            >
              <MdTranslate className="w-4 h-4" />
              {t("translate")}
            </button>
          </div>
          <input
            type="text"
            value={translations[activeTab].name}
            onChange={(e) =>
              setTranslations((prev) => ({
                ...prev,
                [activeTab]: { ...prev[activeTab], name: e.target.value },
              }))
            }
            className="w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-700"
            placeholder={t("enter_size_name")}
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="secondary-button"
            disabled={isCreating}
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleCreate}
            className={`primary-button ${
              isCreating ? "bg-green-600/70 hover:bg-green-600/70" : ""
            }`}
            disabled={isCreating || !isLanguageValid(Language.HR)}
          >
            {isCreating ? t("creating") : t("create")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateSizeModal;
