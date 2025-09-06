import React, { useEffect, useState } from "react";
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
import { getAllSizes, Size } from "../../../services/sizeService";
import CreateSizeModal from "../../../components/CreateSizeModal";

interface EditMenuItemProps {
  menuItem: MenuItem;
  restaurantId: string;
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
      // sizes support
      defaultSizeIndex?: number;
      sizes?: { sizeId: string; price: number }[] | null;
    }
  ) => Promise<void>;
  allergens: Allergen[];
  categories: Category[];
}

const EditMenuItem: React.FC<EditMenuItemProps> = ({
  menuItem,
  restaurantId,
  onCancel,
  onSave,
  allergens,
  categories,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Language>(Language.HR);
  const [translations, setTranslations] = useState<
    Record<Language, { name: string; description: string }>
  >({
    [Language.HR]: {
      name: menuItem.translations.find((t) => t.language === "hr")?.name || "",
      description:
        menuItem.translations.find((t) => t.language === "hr")?.description ||
        "",
    },
    [Language.EN]: {
      name: menuItem.translations.find((t) => t.language === "en")?.name || "",
      description:
        menuItem.translations.find((t) => t.language === "en")?.description ||
        "",
    },
  });
  const [itemPrice, setItemPrice] = useState(menuItem.price);
  const [itemImageFile, setItemImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [selectedAllergenIds, setSelectedAllergenIds] = useState<number[]>(
    menuItem.allergens.map(Number)
  );
  const [allergenSearch, setAllergenSearch] = useState("");
  const [isAllergenDropdownOpen, setAllergenDropdownOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    menuItem.categoryId || ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isActive, setIsActive] = useState(Boolean(menuItem.isActive ?? true));
  const [hasSizes, setHasSizes] = useState(
    Boolean(menuItem.sizes && menuItem.sizes.length > 0)
  );
  const [defaultSizeIndex, setDefaultSizeIndex] = useState<number | null>(
    menuItem.sizes && menuItem.sizes.length > 0
      ? (menuItem.sizes || []).findIndex((s) => (s as any).isDefault)
      : null
  );
  const [availableSizes, setAvailableSizes] = useState<Size[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<
    { sizeId: string; price: string }[]
  >(
    (menuItem.sizes || []).map((s) => ({
      sizeId: (s as any).sizeId,
      price: String(s.price ?? ""),
    }))
  );
  const [isCreateSizeModalOpen, setIsCreateSizeModalOpen] = useState(false);

  // Load available sizes on component mount
  useEffect(() => {
    const loadSizes = async () => {
      try {
        const sizes = await getAllSizes(restaurantId);
        setAvailableSizes(sizes);
      } catch (error) {
        console.error("Failed to load sizes:", error);
      }
    };
    loadSizes();
  }, [restaurantId]);

  // Ensure at least one size when hasSizes is enabled
  useEffect(() => {
    if (hasSizes) {
      if (selectedSizes.length === 0) {
        setSelectedSizes([{ sizeId: "", price: "" }]);
        setDefaultSizeIndex(0);
      } else if (defaultSizeIndex === null || defaultSizeIndex === undefined) {
        setDefaultSizeIndex(0);
      }
    } else {
      setSelectedSizes([]);
      setDefaultSizeIndex(null);
    }
  }, [hasSizes, selectedSizes.length, defaultSizeIndex]);

  const handleAllergenSelect = (id: number) => {
    setSelectedAllergenIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSizeCreated = (newSize: { id: string; name: string }) => {
    setAvailableSizes((prev) => [...prev, { ...newSize, isActive: true }]);
    // Automatically select the newly created size
    setSelectedSizes((prev) => {
      const updated = [...prev];
      const lastIndex = updated.length - 1;
      if (lastIndex >= 0) {
        updated[lastIndex] = { ...updated[lastIndex], sizeId: newSize.id };
      }
      return updated;
    });
  };

  const isLanguageValid = (lang: Language) => {
    const translation = translations[lang];
    // Ako nema imena, jezik nije validan
    if (!translation.name.trim()) return false;
    // Ako nema opisa, jezik nije validan
    if (!translation.description.trim()) return false;
    return true;
  };

  const handleSave = async () => {
    if (!isLanguageValid(Language.HR)) {
      toast.error(t("fill_required_fields_croatian"));
      return;
    }

    if (!isLanguageValid(Language.EN)) {
      toast.error(t("fill_required_fields_english"));
      return;
    }

    if (!selectedCategoryId) {
      toast.error(t("select_category"));
      return;
    }

    if (!hasSizes && !itemPrice.trim()) {
      toast.error(t("enter_price"));
      return;
    }

    if (hasSizes) {
      const hasInvalidSizes = selectedSizes.some(
        (s) => !s.sizeId || !s.price.trim() || isNaN(Number(s.price))
      );
      if (hasInvalidSizes) {
        toast.error(t("fill_all_sizes"));
        return;
      }
    }

    setIsSaving(true);

    try {
      const translatesArray = Object.entries(translations)
        .filter(([_, value]) => value.name.trim() !== "")
        .map(([language, value]) => ({
          name: value.name.trim(),
          description: value.description.trim(),
          language: language as string,
        }));

      const sizesData = hasSizes
        ? selectedSizes.map((s) => ({
            sizeId: s.sizeId,
            price: Number(s.price),
          }))
        : null;

      await onSave(menuItem.id, {
        translations: translatesArray,
        price: itemPrice,
        allergens: selectedAllergenIds.map(String),
        imageFile: itemImageFile,
        removeImage: removeImage,
        categoryId: selectedCategoryId,
        isActive,
        defaultSizeIndex: hasSizes ? defaultSizeIndex ?? undefined : undefined,
        sizes: sizesData,
      });
    } catch (error) {
      console.error("Error saving menu item:", error);
    } finally {
      setIsSaving(false);
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

  const handleDescriptionTranslate = async () => {
    try {
      const sourceText = translations[activeTab].description;
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
          description: translatedText,
        },
      }));

      toast.success(t("translation_success"));
    } catch (error) {
      toast.error(t("translation_failed"));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setItemImageFile(file);
    }
  };

  const handleRemoveImage = () => {
    setRemoveImage(true);
    setItemImageFile(null);
    menuItem.imageUrl = "";
  };

  const addSize = () => {
    setSelectedSizes([...selectedSizes, { sizeId: "", price: "" }]);
  };

  const removeSize = (index: number) => {
    const newSizes = selectedSizes.filter((_, i) => i !== index);
    setSelectedSizes(newSizes);

    // Adjust default size index if needed
    if (defaultSizeIndex !== null) {
      if (defaultSizeIndex === index) {
        // If we removed the default size, set the first one as default
        setDefaultSizeIndex(newSizes.length > 0 ? 0 : null);
      } else if (defaultSizeIndex > index) {
        // If we removed a size before the default, adjust the index
        setDefaultSizeIndex(defaultSizeIndex - 1);
      }
    }
  };

  const updateSize = (
    index: number,
    field: "sizeId" | "price",
    value: string
  ) => {
    setSelectedSizes((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const filteredAllergens = allergens.filter(
    (allergen) =>
      allergen.nameHr.toLowerCase().includes(allergenSearch.toLowerCase()) ||
      allergen.nameEn.toLowerCase().includes(allergenSearch.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        {t("edit_menu_item")}
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
          placeholder={t("enter_name")}
        />
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            {t("description")} (
            {activeTab === Language.HR ? t("croatian") : t("english")})
          </label>
          <button
            onClick={handleDescriptionTranslate}
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
          rows={3}
          className="w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-700"
          placeholder={t("enter_description")}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("category")}
        </label>
        <select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          className="w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-700"
        >
          <option value="">{t("select_category")}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("price")} (€)
        </label>
        <input
          type="number"
          step="0.01"
          value={itemPrice}
          onChange={(e) => setItemPrice(e.target.value)}
          className="w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-700"
          placeholder={t("enter_price")}
          disabled={hasSizes && selectedSizes.length > 0}
        />
        {hasSizes && selectedSizes.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            {t("price_disabled_with_sizes")}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={hasSizes}
            onChange={(e) => setHasSizes(e.target.checked)}
            className="mr-2"
          />
          <span className="text-sm font-medium text-gray-700">
            {t("has_sizes")}
          </span>
        </label>
      </div>

      {hasSizes && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("sizes")}
          </label>
          {selectedSizes.map((s, idx) => (
            <div key={idx} className="flex items-center gap-2 mb-2">
              <input
                type="radio"
                name="defaultSize"
                checked={defaultSizeIndex === idx}
                onChange={() => setDefaultSizeIndex(idx)}
              />
              <select
                value={s.sizeId}
                onChange={(e) => {
                  if (e.target.value === "create_new") {
                    setIsCreateSizeModalOpen(true);
                  } else {
                    updateSize(idx, "sizeId", e.target.value);
                  }
                }}
                className="flex-1 text-sm p-2 border border-gray-300 rounded-md"
              >
                <option value="">{t("select_size")}</option>
                {availableSizes.map((size) => (
                  <option key={size.id} value={size.id}>
                    {size.name}
                  </option>
                ))}
                <option
                  value="create_new"
                  className="text-green-600 font-semibold"
                >
                  + {t("create_new_size")}
                </option>
              </select>
              <input
                type="text"
                placeholder={t("price")}
                value={s.price}
                onChange={(e) => updateSize(idx, "price", e.target.value)}
                className="w-24 text-sm p-2 border border-gray-300 rounded-md"
              />
              <button
                onClick={() => removeSize(idx)}
                className="text-red-500 hover:text-red-700"
                disabled={selectedSizes.length === 1}
              >
                <FaTrash className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={addSize}
            className="text-sm text-green-600 hover:text-green-800"
          >
            + {t("add_size")}
          </button>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("allergens")}
        </label>
        <div className="relative">
          <input
            type="text"
            value={allergenSearch}
            onChange={(e) => setAllergenSearch(e.target.value)}
            onFocus={() => setAllergenDropdownOpen(true)}
            className="w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-700"
            placeholder={t("search_allergens")}
          />
          {isAllergenDropdownOpen && (
            <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
              {filteredAllergens.map((allergen) => (
                <div
                  key={allergen.id}
                  className="p-2 hover:bg-gray-100 cursor-pointer flex items-center"
                  onClick={() => {
                    handleAllergenSelect(allergen.id);
                    setAllergenSearch("");
                    setAllergenDropdownOpen(false);
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedAllergenIds.includes(allergen.id)}
                    onChange={() => handleAllergenSelect(allergen.id)}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    {activeTab === Language.HR
                      ? allergen.nameHr
                      : allergen.nameEn}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        {selectedAllergenIds.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedAllergenIds.map((id) => {
              const allergen = allergens.find((a) => a.id === id);
              return (
                <span
                  key={id}
                  className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1"
                >
                  {activeTab === Language.HR
                    ? allergen?.nameHr
                    : allergen?.nameEn}
                  <button
                    onClick={() => handleAllergenSelect(id)}
                    className="text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("image")}
        </label>
        {menuItem.imageUrl && !removeImage && (
          <div className="mb-2">
            <img
              src={menuItem.imageUrl}
              alt="Current image"
              className="w-32 h-32 object-cover rounded-md"
            />
            <button
              onClick={handleRemoveImage}
              className="text-red-500 hover:text-red-700 text-sm mt-1"
            >
              {t("remove_image")}
            </button>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-700"
        />
        {itemImageFile && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-gray-600">{itemImageFile.name}</span>
            <button
              onClick={() => setItemImageFile(null)}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              {t("remove")}
            </button>
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="mr-2"
          />
          <span className="text-sm font-medium text-gray-700">
            {t("active")}
          </span>
        </label>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="secondary-button"
          disabled={isSaving}
        >
          {t("cancel")}
        </button>
        <button
          onClick={handleSave}
          className={`primary-button ${
            isSaving ? "bg-green-600/70 hover:bg-green-600/70" : ""
          }`}
          disabled={isSaving}
        >
          {isSaving ? t("saving") : t("save")}
        </button>
      </div>

      <CreateSizeModal
        isOpen={isCreateSizeModalOpen}
        onClose={() => setIsCreateSizeModalOpen(false)}
        onSizeCreated={handleSizeCreated}
        restaurantId={restaurantId}
      />
    </div>
  );
};

export default EditMenuItem;
