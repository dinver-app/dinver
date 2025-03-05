import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Language } from "../../../interfaces/Interfaces";
import toast from "react-hot-toast";
import { translateText } from "../../../services/translateService";
import TranslateButton from "../../../components/TranslateButton";

interface AddCategoryProps {
  onCancel: () => void;
  onSave: (data: {
    translates: { name: string; language: string }[];
  }) => Promise<void>;
}

const AddCategory: React.FC<AddCategoryProps> = ({ onCancel, onSave }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Language>(Language.HR);
  const [translations, setTranslations] = useState<Record<Language, string>>({
    [Language.HR]: "",
    [Language.EN]: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const hasAnyName = Object.values(translations).some(
      (value) => value.trim() !== ""
    );

    if (!hasAnyName) {
      toast.error(t("category_name_required"));
      return;
    }

    const translatesArray = Object.entries(translations)
      .filter(([_, value]) => value.trim() !== "")
      .map(([language, name]) => ({
        name: name.trim(),
        language: language as string,
      }));

    setIsSaving(true);
    const loadingToast = toast.loading(t("saving"));

    try {
      await onSave({ translates: translatesArray });
      toast.dismiss(loadingToast);
    } catch (error) {
      toast.dismiss(loadingToast);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTranslate = async () => {
    try {
      const sourceText = translations[activeTab];
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
        [targetLang]: translatedText,
      }));

      toast.success(t("translation_success"));
    } catch (error) {
      toast.error(t("translation_failed"));
    }
  };

  return (
    <div className="py-2">
      <button
        onClick={onCancel}
        className="mr-2 text-gray-500 hover:text-gray-700 text-xs"
      >
        ← {t("back")}
      </button>
      <div className="flex items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            {t("add_drink_category")}
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            {t("add_new_drink_category")}
          </p>
        </div>
      </div>
      <div className="h-line mb-6"></div>

      <div className="flex space-x-4 mb-6">
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

      <div className="flex space-x-4 mb-6">
        <div className="flex items-center">
          <div
            className={`w-3 h-3 rounded-full mr-2 ${
              translations.hr ? "bg-green-500" : "bg-gray-300"
            }`}
          />
          <span className="text-sm text-gray-600">{t("croatian")}</span>
        </div>
        <div className="flex items-center">
          <div
            className={`w-3 h-3 rounded-full mr-2 ${
              translations.en ? "bg-green-500" : "bg-gray-300"
            }`}
          />
          <span className="text-sm text-gray-600">{t("english")}</span>
        </div>
      </div>

      <div className="mb-6 max-w-xl">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            {t("category_name")} (
            {activeTab === Language.HR ? t("croatian") : t("english")})
          </label>
          <TranslateButton onClick={handleTranslate} className="ml-2" />
        </div>
        <input
          type="text"
          value={translations[activeTab]}
          onChange={(e) =>
            setTranslations((prev) => ({
              ...prev,
              [activeTab]: e.target.value,
            }))
          }
          className="w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-700"
          placeholder={t("enter_drink_category_name")}
        />
      </div>

      <div className="flex justify-start space-x-3">
        <button
          onClick={handleSave}
          className="primary-button"
          disabled={isSaving}
        >
          {isSaving ? t("saving") : t("save")}
        </button>
        <button
          onClick={onCancel}
          className="secondary-button"
          disabled={isSaving}
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );
};

export default AddCategory;
