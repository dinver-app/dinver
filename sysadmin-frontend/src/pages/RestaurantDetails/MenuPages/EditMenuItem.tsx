import React, { useState } from "react";
import {
  MenuItem,
  Allergen,
  Language,
  Category,
} from "../../../interfaces/Interfaces";
import { useTranslation } from "react-i18next";
import { FaTrash } from "react-icons/fa";
import toast from "react-hot-toast";
import { translateText } from "../../../services/translateService";
import { MdTranslate } from "react-icons/md";

interface EditMenuItemProps {
  menuItem: MenuItem;
  onCancel: () => void;
  onSave: (
    id: string,
    data: {
      translations: {
        name: string;
        description: string;
        language: string;
      }[];
      price: string;
      allergens: string[];
      imageFile: File | null;
      removeImage: boolean;
      categoryId?: string | null;
      isActive: boolean;
    }
  ) => Promise<void>;
  allergens: Allergen[];
  categories: Category[];
}

const EditMenuItem: React.FC<EditMenuItemProps> = ({
  menuItem,
  onCancel,
  onSave,
  allergens,
  categories,
}) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<Language>(Language.HR);
  const [translations, setTranslations] = useState<
    Record<Language, { name: string; description: string }>
  >({
    [Language.HR]: {
      name:
        menuItem.translations.find((t) => t.language === Language.HR)?.name ||
        "",
      description:
        menuItem.translations.find((t) => t.language === Language.HR)
          ?.description || "",
    },
    [Language.EN]: {
      name:
        menuItem.translations.find((t) => t.language === Language.EN)?.name ||
        "",
      description:
        menuItem.translations.find((t) => t.language === Language.EN)
          ?.description || "",
    },
  });
  const [itemPrice, setItemPrice] = useState(menuItem.price.toString());
  const [itemImageFile, setItemImageFile] = useState<File | null>(null);
  const [selectedAllergenIds, setSelectedAllergenIds] = useState<number[]>(
    menuItem.allergens?.map(Number) || []
  );
  const [allergenSearch, setAllergenSearch] = useState("");
  const [isAllergenDropdownOpen, setAllergenDropdownOpen] = useState(false);
  const [removeImage, setRemoveImage] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    menuItem.categoryId || ""
  );
  const [isActive, setIsActive] = useState(menuItem.isActive ?? true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    // Zamijeni zarez s točkom za cijenu
    const normalizedPrice = itemPrice.replace(",", ".");

    const translatesArray = Object.entries(translations)
      .filter(([_, value]) => value.name.trim() !== "")
      .map(([language, value]) => ({
        name: value.name.trim(),
        description: value.description.trim(),
        language: language as string,
      }));

    if (translatesArray.length === 0) {
      toast.error(t("item_name_required"));
      return;
    }

    if (!normalizedPrice.trim()) {
      toast.error(t("price_required"));
      return;
    }

    if (isNaN(parseFloat(normalizedPrice))) {
      toast.error(t("invalid_price"));
      return;
    }

    setIsSaving(true);
    const loadingToast = toast.loading(t("saving"));

    try {
      await onSave(menuItem.id, {
        translations: translatesArray,
        price: normalizedPrice,
        allergens: selectedAllergenIds.map(String),
        imageFile: itemImageFile,
        removeImage: removeImage,
        categoryId: selectedCategoryId || null,
        isActive,
      });
    } finally {
      setIsSaving(false);
      toast.dismiss(loadingToast);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setItemImageFile(event.target.files[0]);
      setRemoveImage(false);
      event.target.value = "";
    }
  };

  const handleRemoveImage = () => {
    setItemImageFile(null);
    setRemoveImage(true);
    setItemImageFile(null);
    menuItem.imageUrl = "";
  };

  const handleAllergenSelect = (id: number) => {
    setSelectedAllergenIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const isLanguageValid = (lang: Language) => {
    const translation = translations[lang];
    // Ako nema imena, jezik nije validan
    if (!translation.name.trim()) return false;

    // Ako ima samo ime bez opisa, jezik je validan
    if (!translation.description.trim()) return true;

    // Ako ima i ime i opis, jezik je validan
    return true;
  };

  const handleTranslate = async (field: "name" | "description") => {
    try {
      const sourceText = translations[activeTab][field];
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
          [field]: translatedText,
        },
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
            {t("edit_menu_item")}
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            {t("edit_menu_item_description")}
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
      <div className="mb-3 max-w-xl">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            {t("name")} (
            {activeTab === Language.HR ? t("croatian") : t("english")})
          </label>
          <button
            onClick={() => handleTranslate("name")}
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
        />
      </div>
      <div className="mb-3 max-w-xl">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            {t("description")} (
            {activeTab === Language.HR ? t("croatian") : t("english")})
          </label>
          <button
            onClick={() => handleTranslate("description")}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
            title={t("translate")}
          >
            <MdTranslate className="w-4 h-4" />
            {t("translate")}
          </button>
        </div>
        <textarea
          value={translations[activeTab].description}
          onChange={(e) =>
            setTranslations((prev) => ({
              ...prev,
              [activeTab]: { ...prev[activeTab], description: e.target.value },
            }))
          }
          className="w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-700"
        />
      </div>
      <div className="mb-3 max-w-xl">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("price")}
        </label>
        <input
          type="text"
          value={itemPrice}
          onChange={(e) => setItemPrice(e.target.value)}
          className="w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-700"
        />
      </div>
      <div className="mb-3 max-w-xl">
        <label className="block text-sm font-medium text-gray-700">
          {t("image")}
        </label>
        <div className="mt-1 flex items-center gap-2 border border-gray-300 rounded p-2">
          <input
            type="file"
            id="fileInput"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <button
            onClick={() => document.getElementById("fileInput")?.click()}
            className="secondary-button text-xs"
          >
            {menuItem.imageUrl || itemImageFile
              ? t("choose_another_image")
              : t("choose_image")}
          </button>
          {itemImageFile ? (
            <div className="flex items-center ml-4 flex-1 min-w-0">
              <img
                src={URL.createObjectURL(itemImageFile)}
                alt={itemImageFile.name}
                className="w-10 h-10 object-cover rounded mr-2 flex-shrink-0"
              />
              <span className="text-xs truncate">{itemImageFile.name}</span>
            </div>
          ) : menuItem.imageUrl ? (
            <div className="flex items-center ml-4 flex-1 min-w-0">
              <img
                src={menuItem.imageUrl}
                alt={menuItem.name}
                className="w-10 h-10 object-cover rounded mr-2 flex-shrink-0"
              />
              <span className="text-xs truncate">
                {menuItem.imageUrl.split("/").pop()}
              </span>
            </div>
          ) : (
            <span className="text-xs ml-2">{t("no_file_chosen")}</span>
          )}
          {(itemImageFile || menuItem.imageUrl) && (
            <button
              onClick={handleRemoveImage}
              className="text-gray-500 hover:text-gray-700 text-xs ml-auto flex-shrink-0"
            >
              <FaTrash />
            </button>
          )}
        </div>
      </div>
      <div className="mb-3 max-w-xl">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("category")}
        </label>
        <select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          className="w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-700"
        >
          <option value="">{t("no_category")}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-3 max-w-xl">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("allergens")}
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder={t("Pretraži alergene")}
            value={allergenSearch}
            onChange={(e) => setAllergenSearch(e.target.value)}
            onFocus={() => setAllergenDropdownOpen(true)}
            onBlur={() => setAllergenDropdownOpen(false)}
            className="w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-700"
          />
          {isAllergenDropdownOpen && (
            <div className="absolute z-10 w-full bg-white border border-gray-300 rounded mt-1 max-h-60 overflow-y-auto">
              {allergens
                .filter(
                  (allergen) =>
                    !selectedAllergenIds.includes(allergen.id) &&
                    (i18n.language === "en" ? allergen.nameEn : allergen.nameHr)
                      .toLowerCase()
                      .includes(allergenSearch.toLowerCase())
                )
                .map((allergen) => (
                  <div
                    key={allergen.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer"
                    onMouseDown={() => handleAllergenSelect(allergen.id)}
                  >
                    <span className="flex items-center">
                      {allergen.icon}{" "}
                      {i18n.language === "en"
                        ? allergen.nameEn
                        : allergen.nameHr}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedAllergenIds.map((id) => {
            const allergen = allergens.find((all) => all.id === id);
            return (
              <div
                key={id}
                className="flex items-center px-2 py-1 rounded-full bg-gray-100"
              >
                <span className="mr-2">{allergen?.icon}</span>
                <span>
                  {i18n.language === "en" ? allergen?.nameEn : allergen?.nameHr}
                </span>
                <button
                  onClick={() => handleAllergenSelect(id)}
                  className="ml-2 text-xs text-red-500 hover:text-red-700"
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mb-3 max-w-xl">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("active")}
        </label>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
              isActive ? "bg-green-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isActive ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <label className="ml-3 text-sm text-gray-700">
            {t("item_active_description")}
          </label>
        </div>
      </div>

      <div className="flex justify-start space-x-3 mt-6">
        <button
          onClick={handleSave}
          className={`primary-button ${
            isSaving ? "bg-green-600/70 hover:bg-green-600/70" : ""
          }`}
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

export default EditMenuItem;
