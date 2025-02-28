import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Allergen } from "../../../interfaces/Interfaces";

interface AddMenuItemProps {
  onCancel: () => void;
  onSave: (
    name: string,
    price: string,
    description: string,
    imageFile: File | null,
    allergens: string[]
  ) => void;
  allergens: Allergen[];
}

const AddMenuItem: React.FC<AddMenuItemProps> = ({
  onCancel,
  onSave,
  allergens,
}) => {
  const { t } = useTranslation();
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemImageFile, setItemImageFile] = useState<File | null>(null);
  const [selectedAllergenIds, setSelectedAllergenIds] = useState<string[]>([]);
  const [allergenSearch, setAllergenSearch] = useState("");
  const [isAllergenDropdownOpen, setAllergenDropdownOpen] = useState(false);

  const handleSave = () => {
    if (itemName && itemPrice) {
      onSave(
        itemName,
        itemPrice,
        itemDescription,
        itemImageFile,
        selectedAllergenIds
      );
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setItemImageFile(event.target.files[0]);
    }
  };

  const handleAllergenSelect = (id: string) => {
    setSelectedAllergenIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="py-2">
      <h2 className="text-xl font-bold text-gray-800">{t("add_menu_item")}</h2>
      <p className="text-gray-600 mb-4 text-sm">
        {t("add_menu_item_description")}
      </p>
      <div className="h-line"></div>
      <div className="mb-3 max-w-xl">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("name")}
        </label>
        <input
          type="text"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
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
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("description")}
        </label>
        <textarea
          value={itemDescription}
          onChange={(e) => setItemDescription(e.target.value)}
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
            className="secondary-button"
          >
            {t("choose_image")}
          </button>
          <span className="ml-2 truncate">
            {itemImageFile?.name ? itemImageFile?.name : t("no_file_chosen")}
          </span>
        </div>
      </div>
      <div className="mb-3 max-w-xl">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("Alergeni")}
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
                    !selectedAllergenIds.includes(allergen.id.toString()) &&
                    allergen.name_en
                      .toLowerCase()
                      .includes(allergenSearch.toLowerCase())
                )
                .map((allergen) => (
                  <div
                    key={allergen.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer"
                    onMouseDown={() =>
                      handleAllergenSelect(allergen.id.toString())
                    }
                  >
                    <span className="flex items-center">
                      {allergen.icon} {allergen.name_en}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-start space-x-3 mt-6">
        <button onClick={handleSave} className="primary-button">
          {t("save")}
        </button>
        <button onClick={onCancel} className="secondary-button">
          {t("cancel")}
        </button>
      </div>
    </div>
  );
};

export default AddMenuItem;
